import Docker from 'dockerode';

export default class DockerService {
  constructor() {
    this.docker = new Docker();
  }

  async startMinecraftServer(config) {
    this.validateConfig(config);
    await this.pullServerImage();
    const container = await this.createContainer(config);
    await container.start();
    return container.id;
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
