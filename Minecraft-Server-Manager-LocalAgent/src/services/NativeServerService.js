import { EventEmitter } from 'events';
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { pipeline } from 'stream/promises';
import pidusage from 'pidusage';

export default class NativeServerService extends EventEmitter {
  constructor() {
    super();
    this.process = null;
    const managerDir = path.join(os.homedir(), '.minecraft-manager');
    this.vaultDir = process.env.VAULT_DIR || path.join(managerDir, 'vault');
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

    let softwareConfig = await this.ensureServerSoftwareIsInstalled(config);
    
    // Modo de Compatibilidad (Desactivar Zero-Copy)
    if (config.compatibilityMode && softwareConfig.type === 'jar') {
      this.emit('log', '[Compatibility Mode] Copiando servidor localmente para evitar conflictos...');
      const localJarPath = path.join(config.dataDir, 'server.jar');
      fs.copyFileSync(softwareConfig.path, localJarPath);
      softwareConfig.path = localJarPath;
    }

    this.acceptEula(config.dataDir);
    this.createProperties(config);

    const memString = config.memory ? (config.memory.endsWith('G') || config.memory.endsWith('M') ? config.memory : `${config.memory}M`) : '2G';
    const memoryArgXmx = '-Xmx' + memString;
    const memoryArgXms = '-Xms' + memString;
    let spawnArgs = [memoryArgXms, memoryArgXmx, '-XX:+AlwaysPreTouch'];

    if (softwareConfig.type === 'jar') {
      spawnArgs.push('-jar', softwareConfig.path, 'nogui');
    } else if (softwareConfig.type === 'args') {
      // Necesitamos crear el archivo @user_jvm_args.txt si no existe
      const userJvmArgsFile = path.join(config.dataDir, 'user_jvm_args.txt');
      if (!fs.existsSync(userJvmArgsFile)) {
        fs.writeFileSync(userJvmArgsFile, `${memoryArgXms}\n${memoryArgXmx}\n-XX:+AlwaysPreTouch\n`);
      }
      spawnArgs.push(...softwareConfig.args, 'nogui');
    }

    this.process = spawn(javaExe, spawnArgs, {
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
    
    if (this.metricsInterval) clearInterval(this.metricsInterval);
    this.metricsInterval = setInterval(async () => {
      if (!this.process || !this.process.pid) return;
      try {
        const stats = await pidusage(this.process.pid);
        this.emit('telemetry', {
          cpu: stats.cpu / os.cpus().length,
          memory: stats.memory
        });
      } catch (err) {
        // pid might no longer exist
      }
    }, 3000);

    this.process.on('exit', () => {
      if (this.metricsInterval) clearInterval(this.metricsInterval);
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
    const parts = minecraftVersion.split('.');
    
    // Si la versión usa el nuevo formato de 2026 (ej: 26.2 en lugar de 1.26.2)
    if (parts[0] !== '1') {
      const major = parseInt(parts[0]);
      if (major >= 26) return 25; // Minecraft 26+ requiere Java 25
      return 21;
    }

    // Formato clásico (ej: 1.20.4)
    const minor = parseInt(parts[1]);
    if (minor >= 26) return 25; 
    if (minor >= 20.5) return 21;
    if (minor >= 17) return 17;
    if (minor >= 16) return 16;
    if (minor >= 13) return 11;
    return 8;
  }

  async ensureJavaIsInstalled(version) {
    const javaDir = path.join(this.javaDir, version.toString());
    const expectedExe = path.join(javaDir, 'bin', 'java');

    if (fs.existsSync(expectedExe)) {
      return expectedExe;
    }

    this.emit('log', `Downloading Java ${version}...`);

    const downloadUrl = `https://api.adoptium.net/v3/binary/latest/${version}/ga/linux/x64/jdk/hotspot/normal/eclipse`;
    const archivePath = path.join(this.javaDir, `java${version}.tar.gz`);
    const extractPath = path.join(this.javaDir, `extract_${version}`);

    await this.downloadFile(downloadUrl, archivePath);

    this.emit('log', `Extracting Java ${version}...`);
    if (!fs.existsSync(extractPath)) fs.mkdirSync(extractPath, { recursive: true });
    execSync(`tar -xzf "${archivePath}" -C "${extractPath}"`);

    const extractedFolders = fs.readdirSync(extractPath);
    const jdkFolder = path.join(extractPath, extractedFolders[0]);

    fs.renameSync(jdkFolder, javaDir);

    fs.rmSync(extractPath, { recursive: true, force: true });
    fs.rmSync(archivePath, { force: true });
    execSync(`chmod +x "${expectedExe}"`);

    this.emit('log', `Java ${version} installed successfully.`);
    return expectedExe;
  }

  async ensureServerSoftwareIsInstalled(config) {
    if (config.type === 'FABRIC') return await this.ensureFabricIsInstalled(config.version, config.dataDir);
    if (config.type === 'FORGE') return await this.ensureForgeIsInstalled(config.version, config);
    if (config.type === 'NEOFORGE') return await this.ensureNeoForgeIsInstalled(config.version, config);
    if (config.type === 'PURPUR') return await this.ensurePurpurIsInstalled(config.version);
    if (config.type === 'FOLIA') return await this.ensureFoliaIsInstalled(config.version);
    if (config.type === 'VANILLA') return await this.ensureVanillaIsInstalled(config.version);
    return await this.ensurePaperIsInstalled(config.version);
  }

  async ensureVanillaIsInstalled(version) {
    this.emit('log', `Fetching Vanilla metadata for ${version}...`);
    const manifestRes = await fetch('https://piston-meta.mojang.com/mc/game/version_manifest_v2.json');
    const manifest = await manifestRes.json();
    const vInfo = manifest.versions.find(v => v.id === version);
    if (!vInfo) throw new Error(`Vanilla version ${version} not found`);
    
    const detailsRes = await fetch(vInfo.url);
    const details = await detailsRes.json();
    const downloadUrl = details.downloads?.server?.url;
    if (!downloadUrl) throw new Error(`No server download for Vanilla ${version}`);

    const jarName = `vanilla-${version}.jar`;
    const jarPath = path.join(this.jarsDir, jarName);

    if (!fs.existsSync(jarPath)) {
      this.emit('log', `Downloading Vanilla ${version}...`);
      await this.downloadFile(downloadUrl, jarPath);
    }
    return { type: 'jar', path: jarPath };
  }

  async ensurePurpurIsInstalled(version) {
    this.emit('log', `Fetching Purpur builds for ${version}...`);
    const res = await fetch(`https://api.purpurmc.org/v2/purpur/${version}`);
    if (!res.ok) throw new Error(`Failed to fetch Purpur metadata: ${res.status}`);
    const data = await res.json();
    const latestBuild = data.builds.latest;
    const jarName = `purpur-${version}-b${latestBuild}.jar`;
    const jarPath = path.join(this.jarsDir, jarName);

    if (!fs.existsSync(jarPath)) {
      this.emit('log', `Downloading Purpur ${version}...`);
      const downloadUrl = `https://api.purpurmc.org/v2/purpur/${version}/${latestBuild}/download`;
      await this.downloadFile(downloadUrl, jarPath);
    }
    return { type: 'jar', path: jarPath };
  }

  async ensureFoliaIsInstalled(version) {
    this.emit('log', `Fetching Folia builds for ${version}...`);
    const res = await fetch(`https://api.papermc.io/v2/projects/folia/versions/${version}`);
    if (!res.ok) throw new Error(`Failed to fetch Folia metadata`);
    const data = await res.json();
    const latestBuild = data.builds[data.builds.length - 1];
    const jarName = `folia-${version}-b${latestBuild}.jar`;
    const jarPath = path.join(this.jarsDir, jarName);

    if (!fs.existsSync(jarPath)) {
      this.emit('log', `Downloading Folia ${version}...`);
      const downloadUrl = `https://api.papermc.io/v2/projects/folia/versions/${version}/builds/${latestBuild}/downloads/folia-${version}-${latestBuild}.jar`;
      await this.downloadFile(downloadUrl, jarPath);
    }
    return { type: 'jar', path: jarPath };
  }

  async ensureForgeIsInstalled(fullVersion, config) {
    let mcVer = fullVersion;
    let forgeVer = null;
    
    if (fullVersion.includes('-')) {
      const parts = fullVersion.split('-');
      mcVer = parts[0];
      forgeVer = parts[1];
    } else {
      this.emit('log', `Fetching latest Forge build for ${mcVer}...`);
      try {
        const res = await fetch('https://maven.minecraftforge.net/net/minecraftforge/forge/maven-metadata.xml');
        const text = await res.text();
        const matches = [...text.matchAll(new RegExp(`<version>(${mcVer}-[\\d\\.]+)</version>`, 'g'))];
        if (matches.length > 0) {
          fullVersion = matches[matches.length - 1][1]; // Último build de la lista XML
          forgeVer = fullVersion.split('-')[1];
          this.emit('log', `Resolved latest Forge build: ${fullVersion}`);
        } else {
          throw new Error(`No Forge builds found for Minecraft ${mcVer}`);
        }
      } catch (err) {
        throw new Error(`Failed to resolve Forge version: ${err.message}`);
      }
    }

    const forgeDir = path.join(this.jarsDir, `Forge-${fullVersion}`);
    const librariesDir = path.join(forgeDir, 'libraries');
    const unixArgsFile = path.join(forgeDir, 'libraries', 'net', 'minecraftforge', 'forge', fullVersion, 'unix_args.txt');
    const legacyJar = path.join(forgeDir, `forge-${fullVersion}.jar`);

    if (!fs.existsSync(librariesDir) && !fs.existsSync(legacyJar)) {
      this.emit('log', `Downloading Forge installer for ${fullVersion}...`);
      const installerUrl = `https://maven.minecraftforge.net/net/minecraftforge/forge/${fullVersion}/forge-${fullVersion}-installer.jar`;
      const installerPath = path.join(this.jarsDir, `forge-installer-${fullVersion}.jar`);
      await this.downloadFile(installerUrl, installerPath);
      
      this.emit('log', `Installing Forge ${fullVersion} to Vault...`);
      if (!fs.existsSync(forgeDir)) fs.mkdirSync(forgeDir, { recursive: true });
      
      const javaExe = await this.ensureJavaIsInstalled(this.getRequiredJavaVersion(mcVer));
      execSync(`"${javaExe}" -jar "${installerPath}" --installServer`, { cwd: forgeDir, stdio: 'ignore' });
      
      fs.unlinkSync(installerPath);
      this.emit('log', `Forge ${fullVersion} installed in Vault.`);
    }

    this.emit('log', `Linking Forge libraries to server...`);
    const serverLibsDir = path.join(config.dataDir, 'libraries');
    this.smartLink(librariesDir, serverLibsDir, config.compatibilityMode);

    // Link shim jar if it exists (for modern Forge)
    const shimJarName = `forge-${fullVersion}-shim.jar`;
    const shimJarPath = path.join(forgeDir, shimJarName);
    const serverShimJarPath = path.join(config.dataDir, shimJarName);
    if (fs.existsSync(shimJarPath)) {
      if (!fs.existsSync(serverShimJarPath)) {
        fs.symlinkSync(shimJarPath, serverShimJarPath);
      }
    }

    if (fs.existsSync(unixArgsFile)) {
      return { type: 'args', args: ['@user_jvm_args.txt', `@libraries/net/minecraftforge/forge/${fullVersion}/unix_args.txt`] };
    } else {
      // Legacy Forge
      return { type: 'jar', path: legacyJar };
    }
  }

  async ensureNeoForgeIsInstalled(fullVersion, config) {
    let mcVer = fullVersion;
    let neoVer = null;

    if (fullVersion.includes('-')) {
      const parts = fullVersion.split('-');
      mcVer = parts[0];
      neoVer = parts[1];
    } else {
      this.emit('log', `Fetching latest NeoForge build for ${mcVer}...`);
      try {
        const res = await fetch('https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml');
        const text = await res.text();
        // NeoForge usually Maps 1.20.4 to 20.4.X
        const parts = mcVer.split('.');
        const neoPrefix = `${parts[1]}.${parts[2] || '0'}`;
        const matches = [...text.matchAll(new RegExp(`<version>(${neoPrefix}\\.[\\d\\.]+)</version>`, 'g'))];
        
        if (matches.length > 0) {
          neoVer = matches[matches.length - 1][1]; // Último build
          fullVersion = `${mcVer}-${neoVer}`;
          this.emit('log', `Resolved latest NeoForge build: ${fullVersion}`);
        } else {
          throw new Error(`No NeoForge builds found for Minecraft ${mcVer}`);
        }
      } catch (err) {
        throw new Error(`Failed to resolve NeoForge version: ${err.message}`);
      }
    }

    const neoDir = path.join(this.jarsDir, `NeoForge-${fullVersion}`);
    const librariesDir = path.join(neoDir, 'libraries');
    const unixArgsFile = path.join(neoDir, 'libraries', 'net', 'neoforged', 'neoforge', fullVersion, 'unix_args.txt');

    if (!fs.existsSync(librariesDir)) {
      this.emit('log', `Downloading NeoForge installer for ${fullVersion}...`);
      // Nota: NeoForge URLs changed slightly over time, but typically use neoVer for the installer
      const installerUrl = `https://maven.neoforged.net/releases/net/neoforged/neoforge/${neoVer}/neoforge-${neoVer}-installer.jar`;
      const installerPath = path.join(this.jarsDir, `neoforge-installer-${fullVersion}.jar`);
      await this.downloadFile(installerUrl, installerPath);
      
      this.emit('log', `Installing NeoForge ${fullVersion} to Vault...`);
      if (!fs.existsSync(neoDir)) fs.mkdirSync(neoDir, { recursive: true });
      
      const javaExe = await this.ensureJavaIsInstalled(this.getRequiredJavaVersion(mcVer));
      execSync(`"${javaExe}" -jar "${installerPath}" --installServer`, { cwd: neoDir, stdio: 'ignore' });
      
      fs.unlinkSync(installerPath);
      this.emit('log', `NeoForge ${fullVersion} installed in Vault.`);
    }

    this.emit('log', `Linking NeoForge libraries to server...`);
    const serverLibsDir = path.join(config.dataDir, 'libraries');
    this.smartLink(librariesDir, serverLibsDir, config.compatibilityMode);

    // Link any shim/root jars
    const neoFiles = fs.readdirSync(neoDir);
    for (const file of neoFiles) {
      if (file.endsWith('.jar')) {
        const sourceJar = path.join(neoDir, file);
        const targetJar = path.join(config.dataDir, file);
        if (!fs.existsSync(targetJar)) {
          fs.symlinkSync(sourceJar, targetJar);
        }
      }
    }

    return { type: 'args', args: ['@user_jvm_args.txt', `@libraries/net/neoforged/neoforge/${fullVersion}/unix_args.txt`] };
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

    return { type: 'jar', path: jarPath };
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
    this.smartLink(librariesDir, serverLibsDir);

    return { type: 'jar', path: launchJar };
  }

  smartLink(sourcePath, destPath, forceCopy = false) {
    if (!fs.existsSync(sourcePath)) return;
    if (fs.existsSync(destPath)) return;

    if (forceCopy) {
      const stat = fs.statSync(sourcePath);
      if (stat.isDirectory()) {
        fs.mkdirSync(destPath, { recursive: true });
        const items = fs.readdirSync(sourcePath);
        for (const item of items) {
          this.smartLink(path.join(sourcePath, item), path.join(destPath, item), true);
        }
      } else {
        fs.copyFileSync(sourcePath, destPath);
      }
    } else {
      try {
        fs.symlinkSync(sourcePath, destPath);
      } catch (err) {
        this.emit('log', `[Warning] symlink failed for ${sourcePath}, falling back to copy.`);
        this.smartLink(sourcePath, destPath, true);
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
