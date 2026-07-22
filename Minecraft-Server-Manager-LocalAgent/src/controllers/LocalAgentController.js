import ConnectionService from '../services/ConnectionService.js';
import FileService from '../services/FileService.js';
import PlayerStatsService from '../services/PlayerStatsService.js';
import BackupService from '../services/BackupService.js';
import ServerManagerService from '../services/ServerManagerService.js';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';

export default class LocalAgentController {
  constructor(config) {
    this.validateConfig(config);
    this.isHibernating = config.agentStatus === 'HIBERNATING';
    this.saveStatusToEnv = config.saveStatusToEnv;
    this.daemon = config.daemon;
    
    this.connectionService = new ConnectionService(config.apiUrl, config.agentToken, this.isHibernating);
    this.serverManager = new ServerManagerService(this.connectionService);
    this.fileService = new FileService();
    this.playerStatsService = new PlayerStatsService();
    this.backupService = new BackupService((serverId) => this.serverManager.activeServers.get(serverId)?.nativeServerService);
    
    this.activeServers = this.serverManager.activeServers;
    
    this.initialize();
  }

  validateConfig(config) {
    if (!config) throw new Error('Controller configuration is required');
    if (!config.apiUrl) throw new Error('API URL is required');
    if (!config.agentToken) throw new Error('Agent Token is required');
  }

  initialize() {
    this.setupConnectionListeners();
  }

  start() {
    this.connectionService.connect();
  }

  setupConnectionListeners() {
    this.connectionService.on('connected', () => {
      console.log('[INFO] Local Agent connected successfully to Cloud API.');
      if (this.daemon) this.daemon.setStatus('paired');
    });

    this.connectionService.on('disconnected', () => {
      console.log('[WARN] Connection lost with Cloud API. Retrying...');
    });

    this.connectionService.on('error', (err) => {
      console.error('[ERROR] API connection error:', err.message || err);
      if (err.message && err.message.includes('Missing Token')) {
        console.log('The local token has been invalidated by the server.');
        this.connectionService.emit('AGENT_UNLINK');
      }
    });

    this.connectionService.on('command_start', async (serverConfig) => {
      if (this.isHibernating) {
        console.log(`[Hibernate] Start command blocked for server: ${serverConfig.id}`);
        return;
      }
      console.log(`Received start command for server: ${serverConfig.id}`);
      await this.serverManager.startServer(serverConfig);
    });

    this.connectionService.on('command_stop', (payload) => {
      if (this.isHibernating) {
        console.log(`[Hibernate] Stop command blocked for server: ${payload?.id}`);
        return;
      }
      console.log(`Received stop command for server: ${payload?.id}`);
      this.serverManager.stopServer(payload?.id);
    });

    this.connectionService.on('AGENT_UNLINK', async () => {
      console.log('[WARN] Received unlink command from web.');
      console.log('[System] Stopping active servers for deep cleanup...');
      
      await this.serverManager.stopAllServers();

      try {
        let envContent = await fs.readFile('.env', 'utf8');
        envContent = envContent.replace(/AGENT_SECRET_TOKEN=.*/g, '');
        await fs.writeFile('.env', envContent);
        console.log('Local credentials cleared.');
      } catch(e) {}
      console.log('Agent disconnected. Shutting down process in 3s...');
      setTimeout(() => process.exit(0), 3000);
    });

    this.connectionService.on('AGENT_HIBERNATE', () => {
      console.log('[HIBERNATE] Hibernate command received. Blocking commands...');
      this.isHibernating = true;
      if (this.saveStatusToEnv) this.saveStatusToEnv('HIBERNATING');
      this.connectionService.sendAgentStatus('HIBERNATING');
    });

    this.connectionService.on('AGENT_WAKE', () => {
      console.log('[WAKE] Wake command received. Restoring functions...');
      this.isHibernating = false;
      if (this.saveStatusToEnv) this.saveStatusToEnv('ACTIVE');
      this.connectionService.sendAgentStatus('ACTIVE');
    });

    this.connectionService.on('delete_server', async (payload) => {
      if (this.isHibernating) return;
      console.log(`Received delete command for server: ${payload?.id}`);
      try {
        const managerDir = path.join(os.homedir(), '.minecraft-manager');
        const targetDir = path.join(managerDir, 'servers', payload.id);
        await fs.rm(targetDir, { recursive: true, force: true });
        console.log(`Directory ${targetDir} deleted.`);
      } catch (err) {
        console.error('Error deleting server directory:', err);
      }
    });

    this.connectionService.on('server_command', async (payload) => {
      try {
        const active = this.serverManager.activeServers.get(payload.serverId || payload.id);
        if (active) {
            await active.nativeServerService.sendCommand(payload.command || payload);
        }
      } catch (err) {
        console.error('Error sending command:', err);
      }
    });

    this.connectionService.on('fs_operation', async (payload, callback) => {
      try {
        const result = await this.fileService.execute(payload);
        callback({ success: true, data: result });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });

    this.connectionService.on('get_player_stats', async (payload, callback) => {
      try {
        let onlineNames = [];
        const active = this.serverManager.activeServers.get(payload.serverId);
        if (active && active.nativeServerService.process) {
          onlineNames = Array.from(active.nativeServerService.onlinePlayers || []);
          try {
            await active.nativeServerService.sendCommand('save-all');
            await new Promise(resolve => setTimeout(resolve, 1500));
          } catch(e) {}
        }
        
        const players = await this.playerStatsService.getPlayers(payload.serverId, onlineNames);
        callback({ success: true, data: players });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });

    this.connectionService.on('list_backups', async (payload, callback) => {
      try {
        const backups = await this.backupService.listBackups(payload.serverId);
        callback({ success: true, data: backups });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });

    this.connectionService.on('create_backup', async (payload, callback) => {
      try {
        const result = await this.backupService.createBackup(payload.serverId, payload.profile);
        callback(result);
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });

    this.connectionService.on('delete_backup', async (payload, callback) => {
      try {
        const result = await this.backupService.deleteBackup(payload.serverId, payload.fileName);
        callback(result);
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });
  }
}
