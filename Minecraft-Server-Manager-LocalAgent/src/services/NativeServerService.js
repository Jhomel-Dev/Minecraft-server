import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { freePort } from '../utils/osUtils.js';
import ServerProcess from '../core/ServerProcess.js';
import AdoptiumInstaller from '../installers/java/AdoptiumInstaller.js';
import SoftwareInstallerFactory from '../installers/software/SoftwareInstallerFactory.js';
import ServerPropertiesEditor from '../configurators/ServerPropertiesEditor.js';

export default class NativeServerService extends EventEmitter {
    constructor() {
        super();
        this.process = null;
        this.onlinePlayers = new Set();
        
        const managerDir = path.join(os.homedir(), '.minecraft-manager');
        this.vaultDir = process.env.VAULT_DIR || path.join(managerDir, 'vault');
        
        this.ensureVaultExists();
        
        this.javaInstaller = new AdoptiumInstaller(this.vaultDir);
        const jarsDir = path.join(this.vaultDir, 'JARs');
        this.ensureJarsDirExists(jarsDir);
        this.softwareFactory = new SoftwareInstallerFactory(jarsDir, this.javaInstaller);
    }

    ensureVaultExists() {
        if (fs.existsSync(this.vaultDir)) return;
        fs.mkdirSync(this.vaultDir, { recursive: true });
    }

    ensureJarsDirExists(jarsDir) {
        if (fs.existsSync(jarsDir)) return;
        fs.mkdirSync(jarsDir, { recursive: true });
    }

    async startMinecraftServer(config) {
        this.validateConfig(config);
        this.validateHardwareLimits(config);
        await this.preparePort(config.port || 25565);
        this.ensureDataDir(config.dataDir);

        const javaExe = await this.javaInstaller.ensureJavaIsInstalled(config.version);
        const softwareInstaller = this.softwareFactory.getInstaller(config.type);
        const softwareConfig = await softwareInstaller.install(config.version, config.dataDir, config);
        
        this.handleCompatibilityMode(config, softwareConfig);
        
        const configurator = new ServerPropertiesEditor(config.dataDir);
        configurator.acceptEula();
        configurator.createOrUpdateProperties(config);
        
        const spawnArgs = configurator.formatJvmArgs(config, softwareConfig);
        
        this.process = new ServerProcess(config.dataDir, javaExe, spawnArgs);
        this.attachProcessListeners();
        
        return this.process.start();
    }

    validateConfig(config) {
        if (!config) throw new Error('Missing server configuration');
        if (!config.dataDir) throw new Error('Missing data directory');
        if (!config.version) throw new Error('Missing Minecraft version');
    }

    validateHardwareLimits(config) {
        if (!config.memory) return;
        const memMatch = config.memory.match(/^(\d+)([MG])$/i);
        if (memMatch) {
            let requestedBytes = parseInt(memMatch[1]);
            requestedBytes *= memMatch[2].toUpperCase() === 'G' ? 1024 * 1024 * 1024 : 1024 * 1024;
            
            if (requestedBytes > os.freemem()) {
                const requestedStr = (requestedBytes / (1024*1024*1024)).toFixed(1) + 'GB';
                const freeStr = (os.freemem() / (1024*1024*1024)).toFixed(1) + 'GB';
                const msg = `[System] Arranque cancelado: Intentas asignar ${requestedStr} pero la máquina solo tiene ${freeStr} libres.`;
                this.emit('log', msg);
                throw new Error(msg);
            }
        }
    }

    async preparePort(port) {
        try {
            freePort(port);
            this.emit('log', `[System] Liberado el puerto ${port} de procesos anteriores.`);
            await new Promise(r => setTimeout(r, 1000));
        } catch (e) {}
    }

    ensureDataDir(dataDir) {
        if (fs.existsSync(dataDir)) return;
        fs.mkdirSync(dataDir, { recursive: true });
    }

    handleCompatibilityMode(config, softwareConfig) {
        if (!config.compatibilityMode) return;
        if (softwareConfig.type !== 'jar') return;
        
        this.emit('log', '[Compatibility Mode] Copiando servidor localmente para evitar conflictos...');
        const fileName = path.basename(softwareConfig.path);
        const localJarPath = path.join(config.dataDir, fileName);
        
        fs.copyFileSync(softwareConfig.path, localJarPath);
        softwareConfig.path = localJarPath;
    }

    attachProcessListeners() {
        this.onlinePlayers.clear();

        this.process.on('log', (line) => this.emit('log', line));
        this.process.on('telemetry', (stats) => this.emit('telemetry', stats));
        this.process.on('started', () => this.emit('started'));
        
        this.process.on('player_join', (player) => this.onlinePlayers.add(player));
        this.process.on('player_leave', (player) => this.onlinePlayers.delete(player));
        
        this.process.on('stopped', () => {
            this.process = null;
            this.onlinePlayers.clear();
            this.emit('stopped');
        });
    }

    async stopMinecraftServer() {
        if (!this.process) return;
        await this.process.stop();
    }

    async sendCommand(command) {
        if (!this.process) throw new Error('Server is not running');
        this.process.sendCommand(command);
    }
}
