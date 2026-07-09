import { EventEmitter } from 'events';
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { pipeline } from 'stream/promises';
import pidusage from 'pidusage';
import { isWindows, getOsInfo, extractArchive, freePort, killProcessHard } from '../utils/osUtils.js';

export default class NativeServerService extends EventEmitter {
  constructor() {
    super();
    this.process = null;
    this.onlinePlayers = new Set();
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

    
    try {
      const port = config.port || 25565;
      freePort(port);
      this.emit('log', `[System] Liberado el puerto ${port} de procesos anteriores.`);
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
      
    }


    if (!fs.existsSync(config.dataDir)) {
      fs.mkdirSync(config.dataDir, { recursive: true });
    }

    const javaVersion = this.getRequiredJavaVersion(config.version);
    const javaExe = await this.ensureJavaIsInstalled(javaVersion);

    let softwareConfig = await this.ensureServerSoftwareIsInstalled(config);
    
    
    if (config.compatibilityMode && softwareConfig.type === 'jar') {
      this.emit('log', '[Compatibility Mode] Copiando servidor localmente para evitar conflictos...');
      const fileName = path.basename(softwareConfig.path);
      const localJarPath = path.join(config.dataDir, fileName);
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

    this.onlinePlayers.clear();

    this.process.stdout.on('data', (data) => {
      const lines = data.toString('utf8').split('\n');
      for (let line of lines) {
        line = line.trim();
        if (!line) continue;
        this.emit('log', line);

        const joinMatch = line.match(/\]: (?:\[.*?\] )?([a-zA-Z0-9_]{3,16}) joined the game/);
        if (joinMatch) this.onlinePlayers.add(joinMatch[1]);
        
        const leaveMatch = line.match(/\]: (?:\[.*?\] )?([a-zA-Z0-9_]{3,16}) left the game/);
        if (leaveMatch) this.onlinePlayers.delete(leaveMatch[1]);
      }
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
        
      }
    }, 3000);

    this.process.on('exit', () => {
      if (this.metricsInterval) clearInterval(this.metricsInterval);
      this.process = null;
      this.onlinePlayers.clear();
      this.emit('stopped');
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
          killProcessHard(this.process.pid);
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
    
    
    if (parts[0] !== '1') {
      const major = parseInt(parts[0]);
      if (major >= 26) return 25; 
      return 21;
    }

    
    const minor = parseInt(parts[1]);
    if (minor >= 26) return 25; 
    if (minor >= 20.5) return 21;
    if (minor >= 17) return 17;
    if (minor >= 16) return 16;
    if (minor >= 13) return 11;
    return 8;
  }

  async ensureJavaIsInstalled(version) {
    const osInfo = getOsInfo();
    const javaDir = path.join(this.javaDir, version.toString());
    const expectedExe = path.join(javaDir, 'bin', `java${osInfo.executableExt}`);

    if (fs.existsSync(expectedExe)) {
      return expectedExe;
    }

    this.emit('log', `Downloading Java ${version}...`);

    const downloadUrl = `https://api.adoptium.net/v3/binary/latest/${version}/ga/${osInfo.platform}/x64/jdk/hotspot/normal/eclipse`;
    const archivePath = path.join(this.javaDir, `java${version}${osInfo.archiveExt}`);
    const extractPath = path.join(this.javaDir, `extract_${version}`);

    await this.downloadFile(downloadUrl, archivePath);

    this.emit('log', `Extracting Java ${version}...`);
    if (!fs.existsSync(extractPath)) fs.mkdirSync(extractPath, { recursive: true });
    await extractArchive(archivePath, extractPath);

    const extractedFolders = fs.readdirSync(extractPath);
    const jdkFolder = path.join(extractPath, extractedFolders[0]);

    fs.renameSync(jdkFolder, javaDir);

    fs.rmSync(extractPath, { recursive: true, force: true });
    fs.rmSync(archivePath, { force: true });
    
    if (!isWindows) {
      execSync(`chmod +x "${expectedExe}"`);
    }

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

  async resolvePurpurVersion(fullVersion) {
    const res = await fetch('https://api.purpurmc.org/v2/purpur');
    if (!res.ok) throw new Error('Failed to fetch Purpur metadata');
    const data = await res.json();
    
    let mcVer = fullVersion;
    let buildVer = null;
    
    const versionsArr = data.versions;
    if (!versionsArr.includes(fullVersion)) {
      versionsArr.sort((a, b) => b.length - a.length);
      for (const v of versionsArr) {
        if (fullVersion.startsWith(v + '-')) {
          mcVer = v;
          buildVer = fullVersion.substring(v.length + 1);
          break;
        }
      }
    }
    return { mcVer, buildVer };
  }

  async ensurePurpurIsInstalled(fullVersion) {
    const { mcVer: version, buildVer } = await this.resolvePurpurVersion(fullVersion);
    this.emit('log', `Fetching Purpur builds for ${version}...`);
    const res = await fetch(`https://api.purpurmc.org/v2/purpur/${version}`);
    if (!res.ok) throw new Error(`Failed to fetch Purpur metadata: ${res.status}`);
    const data = await res.json();
    
    let latestBuild;
    if (buildVer) {
      if (!data.builds.all.includes(buildVer)) {
        throw new Error(`Build ${buildVer} not found for Purpur ${version}`);
      }
      latestBuild = buildVer;
    } else {
      latestBuild = data.builds.latest;
    }

    const jarName = `purpur-${version}-b${latestBuild}.jar`;
    const jarPath = path.join(this.jarsDir, jarName);

    if (!fs.existsSync(jarPath)) {
      this.emit('log', `Downloading Purpur ${version}...`);
      const downloadUrl = `https://api.purpurmc.org/v2/purpur/${version}/${latestBuild}/download`;
      await this.downloadFile(downloadUrl, jarPath);
    }
    return { type: 'jar', path: jarPath };
  }

  async resolvePaperFoliaVersion(software, fullVersion) {
    const projectRes = await fetch(`https://fill.papermc.io/v3/projects/${software}`, { headers: { 'User-Agent': 'Minecraft-Server-Manager/1.0 (contact@example.com)' } });
    if (!projectRes.ok) throw new Error(`Failed to fetch ${software} metadata`);
    const projectData = await projectRes.json();
    
    let versionsArr = [];
    if (Array.isArray(projectData.versions)) {
      versionsArr = projectData.versions;
    } else if (typeof projectData.versions === 'object') {
      versionsArr = Object.values(projectData.versions).flat();
    }
    
    let mcVer = fullVersion;
    let buildVer = null;
    
    if (!versionsArr.includes(fullVersion)) {
      versionsArr.sort((a, b) => b.length - a.length);
      for (const v of versionsArr) {
        if (fullVersion.startsWith(v + '-')) {
          mcVer = v;
          buildVer = fullVersion.substring(v.length + 1);
          break;
        }
      }
    }
    
    return { mcVer, buildVer };
  }

  async ensureFoliaIsInstalled(fullVersion) {
    const { mcVer: version, buildVer } = await this.resolvePaperFoliaVersion('folia', fullVersion);
    this.emit('log', `Fetching Folia builds for ${version}...`);
    const res = await fetch(`https://fill.papermc.io/v3/projects/folia/versions/${version}`, { headers: { 'User-Agent': 'Minecraft-Server-Manager/1.0 (contact@example.com)' } });
    if (!res.ok) throw new Error(`Failed to fetch Folia metadata`);
    const data = await res.json();
    
    let latestBuild;
    if (buildVer) {
      if (!data.builds.includes(parseInt(buildVer))) throw new Error(`Build ${buildVer} not found for Folia ${version}`);
      latestBuild = parseInt(buildVer);
    } else {
      latestBuild = data.builds[data.builds.length - 1];
    }
    
    const jarName = `folia-${version}-b${latestBuild}.jar`;
    const jarPath = path.join(this.jarsDir, jarName);

    if (!fs.existsSync(jarPath)) {
      this.emit('log', `Downloading Folia ${version}...`);
      const buildRes = await fetch(`https://fill.papermc.io/v3/projects/folia/versions/${version}/builds/${latestBuild}`, { headers: { 'User-Agent': 'Minecraft-Server-Manager/1.0 (contact@example.com)' } });
      const buildData = await buildRes.json();
      const downloadUrl = buildData.downloads['server:default']?.url || buildData.downloads.application?.url || Object.values(buildData.downloads)[0].url;
      await this.downloadFile(downloadUrl, jarPath);
    }
    return { type: 'jar', path: jarPath };
  }

  async ensureForgeIsInstalled(fullVersion, config) {
    let mcVer = fullVersion;
    let forgeVer = null;
    
    if (fullVersion.includes('-')) {
      const splitIdx = fullVersion.indexOf('-');
      mcVer = fullVersion.substring(0, splitIdx);
      forgeVer = fullVersion.substring(splitIdx + 1);
    } else {
      this.emit('log', `Fetching latest Forge build for ${mcVer}...`);
      try {
        const res = await fetch('https://maven.minecraftforge.net/net/minecraftforge/forge/maven-metadata.xml');
        const text = await res.text();
        const matches = [...text.matchAll(new RegExp(`<version>(${mcVer}-[\\d\\.]+)</version>`, 'g'))];
        if (matches.length > 0) {
          fullVersion = matches[matches.length - 1][1]; 
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
    const isWin = os.platform() === 'win32';
    const argsFileName = isWin ? 'win_args.txt' : 'unix_args.txt';
    const argsFile = path.join(forgeDir, 'libraries', 'net', 'minecraftforge', 'forge', fullVersion, argsFileName);
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

    
    const shimJarName = `forge-${fullVersion}-shim.jar`;
    const shimJarPath = path.join(forgeDir, shimJarName);
    const serverShimJarPath = path.join(config.dataDir, shimJarName);
    if (fs.existsSync(shimJarPath)) {
      if (!fs.existsSync(serverShimJarPath)) {
        fs.symlinkSync(shimJarPath, serverShimJarPath);
      }
    }

    if (fs.existsSync(argsFile)) {
      return { type: 'args', args: ['@user_jvm_args.txt', `@libraries/net/minecraftforge/forge/${fullVersion}/${argsFileName}`] };
    } else {
      
      return { type: 'jar', path: legacyJar };
    }
  }

  async ensureNeoForgeIsInstalled(fullVersion, config) {
    let mcVer = fullVersion;
    let neoVer = null;

    if (fullVersion.includes('-')) {
      const splitIdx = fullVersion.indexOf('-');
      mcVer = fullVersion.substring(0, splitIdx);
      neoVer = fullVersion.substring(splitIdx + 1);
    } else {
      this.emit('log', `Fetching latest NeoForge build for ${mcVer}...`);
      try {
        const res = await fetch('https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml');
        const text = await res.text();
        
        const parts = mcVer.split('.');
        const neoPrefix = `${parts[1]}.${parts[2] || '0'}`;
        const matches = [...text.matchAll(new RegExp(`<version>(${neoPrefix}\\.[\\d\\.]+)</version>`, 'g'))];
        
        if (matches.length > 0) {
          neoVer = matches[matches.length - 1][1]; 
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
    const isWin = os.platform() === 'win32';
    const argsFileName = isWin ? 'win_args.txt' : 'unix_args.txt';
    const argsFile = path.join(neoDir, 'libraries', 'net', 'neoforged', 'neoforge', neoVer, argsFileName);

    if (!fs.existsSync(librariesDir)) {
      this.emit('log', `Downloading NeoForge installer for ${fullVersion}...`);
      
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

    return { type: 'args', args: ['@user_jvm_args.txt', `@libraries/net/neoforged/neoforge/${neoVer}/${argsFileName}`] };
  }

  async ensurePaperIsInstalled(fullVersion) {
    const { mcVer: version, buildVer } = await this.resolvePaperFoliaVersion('paper', fullVersion);
    this.emit('log', `Fetching PaperMC builds for ${version}...`);
    const res = await fetch(`https://fill.papermc.io/v3/projects/paper/versions/${version}`, { headers: { 'User-Agent': 'Minecraft-Server-Manager/1.0 (contact@example.com)' } });
    if (!res.ok) throw new Error(`Failed to fetch Paper version metadata: ${res.status}`);

    const data = await res.json();
    let latestBuild;
    if (buildVer) {
      if (!data.builds.includes(parseInt(buildVer))) throw new Error(`Build ${buildVer} not found for Paper ${version}`);
      latestBuild = parseInt(buildVer);
    } else {
      latestBuild = data.builds[data.builds.length - 1];
    }

    const jarName = `paper-${version}-b${latestBuild}.jar`;
    const jarPath = path.join(this.jarsDir, jarName);

    if (!fs.existsSync(jarPath)) {
      this.emit('log', `Downloading Paper ${version} build ${latestBuild} to Vault...`);
      const buildRes = await fetch(`https://fill.papermc.io/v3/projects/paper/versions/${version}/builds/${latestBuild}`, { headers: { 'User-Agent': 'Minecraft-Server-Manager/1.0 (contact@example.com)' } });
      const buildData = await buildRes.json();
      const downloadUrl = buildData.downloads['server:default']?.url || buildData.downloads.application?.url || Object.values(buildData.downloads)[0].url;
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

  async resolveFabricVersion(fullVersion) {
    const res = await fetch("https://meta.fabricmc.net/v2/versions/game");
    if (!res.ok) throw new Error('Failed to fetch Fabric metadata');
    const data = await res.json();
    const versionsArr = data.map(v => v.version);
    
    let mcVer = fullVersion;
    let loaderVer = null;
    
    if (!versionsArr.includes(fullVersion)) {
      versionsArr.sort((a, b) => b.length - a.length);
      for (const v of versionsArr) {
        if (fullVersion.startsWith(v + '-')) {
          mcVer = v;
          loaderVer = fullVersion.substring(v.length + 1);
          break;
        }
      }
    }
    return { mcVer, loaderVer };
  }

  async ensureFabricIsInstalled(fullVersion, dataDir) {
    const { mcVer, loaderVer } = await this.resolveFabricVersion(fullVersion);
    const fabricDir = path.join(this.jarsDir, `Fabric-${fullVersion}`);
    const launchJar = path.join(fabricDir, 'fabric-server-launch.jar');
    const librariesDir = path.join(fabricDir, 'libraries');

    if (!fs.existsSync(launchJar)) {
      this.emit('log', `Fetching Fabric installer...`);
      const res = await fetch('https://meta.fabricmc.net/v2/versions/installer');
      if (!res.ok) throw new Error('Failed to fetch Fabric installer');
      const data = await res.json();
      const installerVersion = data.find(i => i.stable).version;
      const installerUrl = `https://maven.fabricmc.net/net/fabricmc/fabric-installer/${installerVersion}/fabric-installer-${installerVersion}.jar`;
      
      const installerPath = path.join(this.jarsDir, `fabric-installer-${fullVersion}.jar`);
      await this.downloadFile(installerUrl, installerPath);
      
      this.emit('log', `Installing Fabric (MC: ${mcVer}${loaderVer ? ', Loader: ' + loaderVer : ''}) to Vault...`);
      if (!fs.existsSync(fabricDir)) fs.mkdirSync(fabricDir, { recursive: true });
      
      const javaExe = await this.ensureJavaIsInstalled(this.getRequiredJavaVersion(mcVer));
      const loaderArg = loaderVer ? `-loader ${loaderVer}` : '';
      execSync(`"${javaExe}" -jar "${installerPath}" server -mcversion ${mcVer} ${loaderArg} -downloadMinecraft`, { cwd: fabricDir });
      
      fs.unlinkSync(installerPath);
      this.emit('log', `Fabric ${fullVersion} installed in Vault.`);
    }

    this.emit('log', `Linking Fabric libraries to server...`);
    const serverLibsDir = path.join(dataDir, 'libraries');
    this.smartLink(librariesDir, serverLibsDir);

    const vaultServerJar = path.join(fabricDir, 'server.jar');
    const localServerJar = path.join(dataDir, 'server.jar');
    if (fs.existsSync(vaultServerJar)) {
      this.smartLink(vaultServerJar, localServerJar);
    }

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
