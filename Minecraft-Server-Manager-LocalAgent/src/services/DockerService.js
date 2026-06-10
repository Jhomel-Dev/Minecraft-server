import Docker from 'dockerode';
import { EventEmitter } from 'events';

export default class DockerService extends EventEmitter {
  constructor() {
    super();
    this.docker = new Docker();
    this.container = null;
  }

  async startMinecraftServer(config) {
    this.validateConfig(config);
    await this.pullServerImage();
    this.container = await this.createContainer(config);
    await this.container.start();
    
    this.attachToLogs();
    
    return this.container.id;
  }

  async attachToLogs() {
    if (!this.container) return;
    
    const stream = await this.container.logs({
      follow: true,
      stdout: true,
      stderr: true
    });
    
    stream.on('data', (chunk) => {
      // Limpiar cabeceras binarias de Docker y emitir
      const logLine = chunk.toString('utf8').replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '');
      if (logLine.trim()) {
        this.emit('log', logLine);
      }
    });
  }

  validateConfig(config) {
    if (!config) throw new Error('Missing server configuration');
    if (!config.name) throw new Error('Missing server name');
    if (!config.port) throw new Error('Missing server port');
    if (!config.dataDir) throw new Error('Missing data directory');
  }

  async pullServerImage() {
    return new Promise((resolve, reject) => {
      this.docker.pull('itzg/minecraft-server', (error, stream) => {
        if (error) return reject(error);
        
        this.docker.modem.followProgress(stream, onFinished);

        function onFinished(err, output) {
          if (err) return reject(err);
          resolve(output);
        }
      });
    });
  }

  async createContainer(config) {
    const options = this.buildContainerOptions(config);
    return this.docker.createContainer(options);
  }

  buildContainerOptions(config) {
    return {
      Image: 'itzg/minecraft-server',
      name: `minecraft-${config.name}`,
      Env: [
        'EULA=TRUE',
        `TYPE=${config.type || 'VANILLA'}`,
        `VERSION=${config.version || 'LATEST'}`,
        `MEMORY=${config.memory || '2G'}`
      ],
      HostConfig: {
        PortBindings: {
          '25565/tcp': [{ HostPort: config.port.toString() }]
        },
        Binds: [
          `${config.dataDir}:/data`
        ]
      }
    };
  }
}
