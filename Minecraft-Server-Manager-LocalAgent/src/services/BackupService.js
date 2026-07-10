import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import AdmZip from 'adm-zip';

export default class BackupService {
    constructor(nativeServerService) {
        this.nativeServerService = nativeServerService;
        this.schedules = new Map();
        this.startScheduler();
    }

    startScheduler() {
        setInterval(() => this.processAllSchedules(), 60000);
    }

    async processAllSchedules() {
        try {
            const serversDir = path.join(os.homedir(), '.minecraft-manager', 'servers');
            const servers = await this.safeReadDir(serversDir);
            for (const serverId of servers) {
                await this.processServerBackup(serverId, serversDir);
            }
        } catch (err) {}
    }

    async safeReadDir(dir) {
        try {
            return await fs.readdir(dir);
        } catch (e) {
            return [];
        }
    }

    async processServerBackup(serverId, serversDir) {
        const configPath = path.join(serversDir, serverId, 'backup-config.json');
        
        try {
            const rawConfig = await fs.readFile(configPath, 'utf-8');
            const config = JSON.parse(rawConfig);
            
            if (!config.enabled || !config.time) return;
            if (!this.isTimeToRun(config.time)) return;
            
            const lastRunKey = `${serverId}-${new Date().toISOString().split('T')[0]}`;
            if (this.schedules.has(lastRunKey)) return; 
            
            this.schedules.set(lastRunKey, true);
            await this.createBackup(serverId, config.profile);
            await this.enforceRetentionPolicy(serverId, config.maxRetained);
        } catch (e) {}
    }

    isTimeToRun(timeString) {
        const now = new Date();
        const [hours, minutes] = timeString.split(':').map(Number);
        return now.getHours() === hours && now.getMinutes() === minutes;
    }

    async enforceRetentionPolicy(serverId, maxRetained) {
        if (!maxRetained) return;
        
        const backups = await this.listBackups(serverId);
        if (backups.length <= maxRetained) return;

        const toDelete = backups.slice(maxRetained);
        for (const backup of toDelete) {
            await this.deleteBackup(serverId, backup.name);
        }
    }

    getServerDir(serverId) {
        return path.join(os.homedir(), '.minecraft-manager', 'servers', serverId);
    }

    async getBackupsDir(serverId) {
        const dir = path.join(this.getServerDir(serverId), 'backups');
        await fs.mkdir(dir, { recursive: true });
        return dir;
    }

    async createBackup(serverId, profile = 'full') {
        const serverDir = this.getServerDir(serverId);
        const backupsDir = await this.getBackupsDir(serverId);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const zipName = `backup-${profile}-${timestamp}.zip`;
        const zipPath = path.join(backupsDir, zipName);
        
        const validPaths = await this.getValidBackupPaths(serverDir, profile);
        if (validPaths.length === 0) throw new Error("No hay archivos validos para respaldar");

        const isOnline = this.isServerOnline();
        
        try {
            await this.prepareServerForBackup(isOnline);
            await this.compressFiles(serverDir, validPaths, zipPath);
            return { success: true, file: zipName };
        } catch (err) {
            throw new Error("Fallo al crear el backup en zip.");
        } finally {
            await this.resumeServerAfterBackup(isOnline);
        }
    }

    async getValidBackupPaths(serverDir, profile) {
        const targetPaths = await this.getTargetPathsByProfile(serverDir, profile);
        const validPaths = [];
        
        for (const p of targetPaths) {
            try {
                await fs.access(path.join(serverDir, p));
                validPaths.push(p);
            } catch (e) {}
        }
        
        return validPaths;
    }

    async getTargetPathsByProfile(serverDir, profile) {
        if (profile === 'world') return ['world', 'world_nether', 'world_the_end'];
        
        const files = await this.safeReadDir(serverDir);
        if (profile === 'configs') {
            const configs = files.filter(f => f.endsWith('.json') || f.endsWith('.properties') || f.endsWith('.yml'));
            configs.push('plugins');
            return configs;
        }
        
        return files.filter(f => f !== 'backups');
    }

    isServerOnline() {
        return this.nativeServerService && this.nativeServerService.process;
    }

    async prepareServerForBackup(isOnline) {
        if (!isOnline) return;
        try {
            await this.nativeServerService.sendCommand('save-all flush');
            await new Promise(res => setTimeout(res, 2000));
            await this.nativeServerService.sendCommand('save-off');
            await new Promise(res => setTimeout(res, 1000));
        } catch(e) {}
    }

    async resumeServerAfterBackup(isOnline) {
        if (!isOnline) return;
        try {
            await this.nativeServerService.sendCommand('save-on');
        } catch(e) {}
    }

    async compressFiles(serverDir, paths, zipPath) {
        const zip = new AdmZip();
        for (const p of paths) {
            const fullPath = path.join(serverDir, p);
            const stat = await fs.stat(fullPath);
            if (stat.isDirectory()) {
                zip.addLocalFolder(fullPath, p);
            } else {
                zip.addLocalFile(fullPath);
            }
        }
        zip.writeZip(zipPath);
    }

    async listBackups(serverId) {
        const dir = await this.getBackupsDir(serverId);
        const files = await this.safeReadDir(dir);
        const zips = files.filter(f => f.endsWith('.zip'));
        
        const results = [];
        for (const file of zips) {
            const stat = await fs.stat(path.join(dir, file));
            results.push({
                name: file,
                size: stat.size,
                date: stat.mtime
            });
        }
        return results.sort((a, b) => b.date - a.date);
    }

    async deleteBackup(serverId, fileName) {
        if (!fileName.endsWith('.zip') || fileName.includes('/')) throw new Error("Archivo invalido");
        
        const dir = await this.getBackupsDir(serverId);
        const filePath = path.join(dir, fileName);
        
        await fs.unlink(filePath);
        return { success: true };
    }
}
