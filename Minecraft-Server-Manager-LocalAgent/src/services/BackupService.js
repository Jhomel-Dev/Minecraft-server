import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export default class BackupService {
  constructor(nativeServerService) {
    this.nativeServerService = nativeServerService;
    this.schedules = new Map();
    this.startScheduler();
  }

  startScheduler() {
    
    setInterval(async () => {
      try {
        const serversDir = path.join(os.homedir(), '.minecraft-manager', 'servers');
        let servers = [];
        try { servers = await fs.readdir(serversDir); } catch(e) { return; }

        for (const serverId of servers) {
          const configPath = path.join(serversDir, serverId, 'backup-config.json');
          try {
            const rawConfig = await fs.readFile(configPath, 'utf-8');
            const config = JSON.parse(rawConfig);
            
            if (!config.enabled || !config.time) continue;
            
            const now = new Date();
            const [hours, minutes] = config.time.split(':').map(Number);
            
            if (now.getHours() === hours && now.getMinutes() === minutes) {
              const lastRunKey = `${serverId}-${now.toISOString().split('T')[0]}`;
              if (this.schedules.get(lastRunKey)) continue; 
              
              this.schedules.set(lastRunKey, true);
              console.log(`[BackupService] Ejecutando backup programado para ${serverId}...`);
              
              await this.createBackup(serverId, config.profile);
              
              
              const backups = await this.listBackups(serverId);
              if (config.maxRetained && backups.length > config.maxRetained) {
                const toDelete = backups.slice(config.maxRetained);
                for (const b of toDelete) {
                  await this.deleteBackup(serverId, b.name);
                  console.log(`[BackupService] Auto-eliminado backup antiguo: ${b.name}`);
                }
              }
            }
          } catch(e) {
            
          }
        }
      } catch (err) {
        console.error('[BackupService] Error in scheduler loop:', err);
      }
    }, 60000); 
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
    const isOnline = this.nativeServerService && this.nativeServerService.process;

    let targetPaths = [];

    
    if (profile === 'world') {
      targetPaths = ['world', 'world_nether', 'world_the_end'];
    } else if (profile === 'configs') {
      const files = await fs.readdir(serverDir);
      targetPaths = files.filter(f => f.endsWith('.json') || f.endsWith('.properties') || f.endsWith('.yml'));
      targetPaths.push('plugins');
    } else {
      
      const files = await fs.readdir(serverDir);
      targetPaths = files.filter(f => f !== 'backups');
    }

    
    const validPaths = [];
    for (const p of targetPaths) {
      try {
        await fs.access(path.join(serverDir, p));
        validPaths.push(`"${p}"`);
      } catch (e) {
        
      }
    }

    if (validPaths.length === 0) throw new Error("No hay archivos válidos para respaldar.");

    try {
      
      if (isOnline) {
        console.log(`[BackupService] Servidor ${serverId} ONLINE. Iniciando Hot Backup...`);
        try {
          await this.nativeServerService.sendCommand('save-all flush');
          await new Promise(res => setTimeout(res, 2000));
          await this.nativeServerService.sendCommand('save-off');
          await new Promise(res => setTimeout(res, 1000));
        } catch(e) { console.error("Error al preparar hot backup:", e); }
      }

      
      console.log(`[BackupService] Comprimiendo ${validPaths.join(' ')} -> ${zipName}`);
      const command = `cd "${serverDir}" && zip -r -9 "${zipPath}" ${validPaths.join(' ')}`;
      await execPromise(command);
      console.log(`[BackupService] Compresión terminada: ${zipName}`);

      return { success: true, file: zipName };
    } catch (err) {
      console.error(`[BackupService] Error durante backup:`, err);
      throw new Error("Fallo al crear el backup en zip.");
    } finally {
      
      if (isOnline) {
        try {
          await this.nativeServerService.sendCommand('save-on');
        } catch(e) {}
      }
    }
  }

  async listBackups(serverId) {
    const dir = await this.getBackupsDir(serverId);
    const files = await fs.readdir(dir);
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
    const dir = await this.getBackupsDir(serverId);
    const filePath = path.join(dir, fileName);
    
    if (!fileName.endsWith('.zip') || fileName.includes('/')) throw new Error("Archivo inválido");
    await fs.unlink(filePath);
    return { success: true };
  }
}
