import { EventEmitter } from 'events';
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';

export default class NativeServerService extends EventEmitter {
  constructor() {
    super();
    this.process = null;
    this.vaultDir = 'C:\\CraftControl\\Vault';
    this.javaDir = path.join(this.vaultDir, 'JDKs');
    this.jarsDir = path.join(this.vaultDir, 'JARs');

    [this.vaultDir, this.javaDir, this.jarsDir].forEach(dir => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });
  }

  async startMinecraftServer(config) {
    this.validateConfig(config);

    if (!fs.existsSync(config.dataDir)) {
      fs.mkdirSync(config.dataDir, { recursive: true });
    }

    const javaVersion = this.getRequiredJavaVersion(config.version);
    const javaExe = await this.ensureJavaIsInstalled(javaVersion);

    let jarPath = await this.ensureServerJarIsInstalled(config);
    
    // Modo de Compatibilidad (Desactivar Zero-Copy)
    if (config.compatibilityMode) {
      this.emit('log', '[Compatibility Mode] Copiando servidor localmente para evitar conflictos...');
      const localJarPath = path.join(config.dataDir, 'server.jar');
      fs.copyFileSync(jarPath, localJarPath);
      jarPath = localJarPath;
    }

    this.acceptEula(config.dataDir);
    this.createProperties(config);

    this.process = spawn(javaExe, ['-Xmx' + (config.memory || '2G'), '-jar', jarPath, 'nogui'], {
      cwd: config.dataDir,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.process.stdout.on('data', (data) => {
      const logLine = data.toString('utf8').trim();
      if (logLine) this.emit('log', logLine);
    });

    this.process.stderr.on('data', (data) => {
      const logLine = data.toString('utf8').trim();
      if (logLine) this.emit('log', logLine);
    });

    this.process.on('exit', () => {
      this.process = null;
    });

    return this.process.pid.toString();
  }

  async stopMinecraftServer() {
    if (!this.process) return;

    return new Promise((resolve) => {
      this.process.once('exit', resolve);
      try {
        this.sendCommand('stop');
      } catch (err) {
        if (this.process) this.process.kill('SIGTERM');
        resolve();
      }

      setTimeout(() => {
        if (this.process) {
          this.process.kill('SIGKILL');
          this.process = null;
        }
        resolve();
      }, 10000);
    });
  }

  async sendCommand(command) {
    if (!this.process || !this.process.stdin) throw new Error('Server is not running');
    try {
      this.process.stdin.write(command + '\n');
    } catch (e) {
    }
  }

  validateConfig(config) {
    if (!config) throw new Error('Missing server configuration');
    if (!config.dataDir) throw new Error('Missing data directory');
    if (!config.version) throw new Error('Missing Minecraft version');
  }

  getRequiredJavaVersion(minecraftVersion) {
    const minor = parseInt(minecraftVersion.split('.')[1]);
    if (minor >= 20.5) return 21;
    if (minor >= 17) return 17;
    if (minor >= 16) return 16;
    if (minor >= 13) return 11;
    return 8;
  }

  async ensureJavaIsInstalled(version) {
    const javaDir = path.join(this.javaDir, version.toString());
    const expectedExe = path.join(javaDir, 'bin', 'java.exe');

    if (fs.existsSync(expectedExe)) {
      return expectedExe;
    }

    this.emit('log', `Downloading Java ${version}...`);

    const downloadUrl = `https://api.adoptium.net/v3/binary/latest/${version}/ga/windows/x64/jdk/hotspot/normal/eclipse`;
    const zipPath = path.join(this.javaDir, `java${version}.zip`);
    const extractPath = path.join(this.javaDir, `extract_${version}`);

    await this.downloadFile(downloadUrl, zipPath);

    this.emit('log', `Extracting Java ${version}...`);
    if (!fs.existsSync(extractPath)) fs.mkdirSync(extractPath, { recursive: true });
    execSync(`tar -xf "${zipPath}" -C "${extractPath}"`);

    const extractedFolders = fs.readdirSync(extractPath);
    const jdkFolder = path.join(extractPath, extractedFolders[0]);

    fs.renameSync(jdkFolder, javaDir);

    fs.rmSync(extractPath, { recursive: true, force: true });
    fs.rmSync(zipPath, { force: true });

    this.emit('log', `Java ${version} installed successfully.`);
    return expectedExe;
  }

  async ensureServerJarIsInstalled(config) {
    if (config.type === 'FABRIC') {
      return await this.ensureFabricIsInstalled(config.version, config.dataDir);
    }
    return await this.ensurePaperIsInstalled(config.version);
  }

  async ensurePaperIsInstalled(version) {
    this.emit('log', `Fetching PaperMC builds for ${version}...`);
    const res = await fetch(`https://api.papermc.io/v2/projects/paper/versions/${version}`);
    if (!res.ok) throw new Error(`Failed to fetch Paper version metadata: ${res.status}`);

    const data = await res.json();
    const latestBuild = data.builds[data.builds.length - 1];

    const jarName = `paper-${version}-b${latestBuild}.jar`;
    const jarPath = path.join(this.jarsDir, jarName);

    if (!fs.existsSync(jarPath)) {
      this.emit('log', `Downloading Paper ${version} build ${latestBuild} to Vault...`);
      const downloadUrl = `https://api.papermc.io/v2/projects/paper/versions/${version}/builds/${latestBuild}/downloads/paper-${version}-${latestBuild}.jar`;
      await this.downloadFile(downloadUrl, jarPath);
      this.emit('log', `Paper ${version} build ${latestBuild} downloaded successfully.`);
    }

    this.cleanupOldJars(version, jarName);

    return jarPath;
  }

  cleanupOldJars(version, currentJarName) {
    try {
      const files = fs.readdirSync(this.jarsDir);
      for (const file of files) {
        if (file.startsWith(`paper-${version}-b`) && file !== currentJarName) {
          try {
            fs.unlinkSync(path.join(this.jarsDir, file));
            this.emit('log', `[Garbage Collector] Deleted obsolete unlocked version: ${file}`);
          } catch (e) {
          }
        }
      }
    } catch (err) {
    }
  }

  async ensureFabricIsInstalled(version, dataDir) {
    const fabricDir = path.join(this.jarsDir, `Fabric-${version}`);
    const launchJar = path.join(fabricDir, 'fabric-server-launch.jar');
    const librariesDir = path.join(fabricDir, 'libraries');

    if (!fs.existsSync(launchJar)) {
      this.emit('log', `Fetching Fabric installer...`);
      const res = await fetch('https://meta.fabricmc.net/v2/versions/installer');
      if (!res.ok) throw new Error('Failed to fetch Fabric installer');
      const data = await res.json();
      const installerVersion = data.find(i => i.stable).version;
      const installerUrl = `https://maven.fabricmc.net/net/fabricmc/fabric-installer/${installerVersion}/fabric-installer-${installerVersion}.jar`;
      
      const installerPath = path.join(this.jarsDir, 'fabric-installer.jar');
      await this.downloadFile(installerUrl, installerPath);
      
      this.emit('log', `Installing Fabric ${version} to Vault...`);
      if (!fs.existsSync(fabricDir)) fs.mkdirSync(fabricDir, { recursive: true });
      
      const javaExe = await this.ensureJavaIsInstalled(this.getRequiredJavaVersion(version));
      execSync(`"${javaExe}" -jar "${installerPath}" server -mcversion ${version} -downloadMinecraft`, { cwd: fabricDir });
      
      fs.unlinkSync(installerPath);
      this.emit('log', `Fabric ${version} installed in Vault.`);
    }

    this.emit('log', `Linking Fabric libraries to server...`);
    const serverLibsDir = path.join(dataDir, 'libraries');
    this.smartLink(librariesDir, serverLibsDir, config?.compatibilityMode);

    return launchJar;
  }

  smartLink(sourcePath, destPath, forceCopy = false) {
    if (!fs.existsSync(sourcePath)) return;
    if (fs.existsSync(destPath)) return;

    const stat = fs.statSync(sourcePath);
    if (stat.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      const items = fs.readdirSync(sourcePath);
      for (const item of items) {
        this.smartLink(path.join(sourcePath, item), path.join(destPath, item), forceCopy);
      }
    } else {
      if (forceCopy) {
        fs.copyFileSync(sourcePath, destPath);
      } else {
        try {
          fs.linkSync(sourcePath, destPath);
        } catch (err) {
          fs.copyFileSync(sourcePath, destPath);
        }
      }
    }
  }

  async downloadFile(url, dest) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to download from ${url}: ${res.statusText}`);
    const fileStream = fs.createWriteStream(dest);
    await pipeline(res.body, fileStream);
  }

  acceptEula(dataDir) {
    const eulaPath = path.join(dataDir, 'eula.txt');
    fs.writeFileSync(eulaPath, 'eula=true\n');
  }

  createProperties(config) {
    const propsPath = path.join(config.dataDir, 'server.properties');
    let props = '';

    if (fs.existsSync(propsPath)) {
      props = fs.readFileSync(propsPath, 'utf8');
    }

    const settings = {
      'server-port': config.port || 25565,
      'max-players': config.maxPlayers || 20,
      'white-list': config.whitelist ? 'true' : 'false',
      'online-mode': config.onlineMode ? 'true' : 'false'
    };

    for (const [key, value] of Object.entries(settings)) {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(props)) {
        props = props.replace(regex, `${key}=${value}`);
      } else {
        props += `\n${key}=${value}`;
      }
    }

    fs.writeFileSync(propsPath, props.trim());
  }
}
