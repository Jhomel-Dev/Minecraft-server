import NativeServerService from '../services/NativeServerService.js';
import TunnelService from '../services/TunnelService.js';
import ConnectionService from '../services/ConnectionService.js';
import FileService from '../services/FileService.js';
import PlayerStatsService from '../services/PlayerStatsService.js';
import BackupService from '../services/BackupService.js';
import os from 'os';
import path from 'path';

export default class LocalAgentController {
  constructor(config) {
    this.validateConfig(config);
    this.activeServers = new Map();
    this.nextPort = 25565;
    
    this.connectionService = new ConnectionService(config.apiUrl, config.agentToken);
    this.fileService = new FileService();
    this.playerStatsService = new PlayerStatsService();
    this.backupService = new BackupService((serverId) => this.activeServers.get(serverId)?.nativeServerService);
    
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
      console.log('✅ Local Agent conectado exitosamente al Cloud API.');
    });

    this.connectionService.on('disconnected', () => {
      console.log('❌ Conexión perdida con el Cloud API. Reintentando...');
    });

    this.connectionService.on('error', (err) => {
      console.error('⚠️ Error de conexión con el API:', err.message || err);
    });

    this.connectionService.on('command_start', async (serverConfig) => {
      console.log(`Recibida orden de inicio para el servidor: ${serverConfig.id}`);
      await this.handleStartCommand(serverConfig);
    });

    this.connectionService.on('command_stop', (payload) => {
      console.log(`Recibida orden de apagado para servidor: ${payload?.id}`);
      this.handleStopCommand(payload?.id);
    });

    this.connectionService.on('AGENT_UNLINK', async () => {
      console.log('❌ Recibida orden de desvinculación desde la web.');
      const fs = await import('fs/promises');
      try {
        let envContent = await fs.readFile('.env', 'utf8');
        envContent = envContent.replace(/AGENT_SECRET_TOKEN=.*/g, '');
        await fs.writeFile('.env', envContent);
        console.log('Credenciales locales borradas.');
      } catch(e) {}
      console.log('Agente desconectado. Apagando proceso en 3s...');
      setTimeout(() => process.exit(0), 3000);
    });

    this.connectionService.on('delete_server', async (payload) => {
      console.log(`Recibida orden de eliminar servidor: ${payload?.id}`);
      try {
        const managerDir = path.join(os.homedir(), '.minecraft-manager');
        const targetDir = path.join(managerDir, 'servers', payload.id);
        const fs = await import('fs/promises');
        await fs.rm(targetDir, { recursive: true, force: true });
        console.log(`Directorio ${targetDir} eliminado.`);
      } catch (err) {
        console.error('Error eliminando directorio de servidor:', err);
      }
    });

    this.connectionService.on('server_command', async (payload) => {
      try {
        const active = this.activeServers.get(payload.serverId || payload.id);
        if (active) {
            await active.nativeServerService.sendCommand(payload.command || payload);
        }
      } catch (err) {
        console.error('Error enviando comando:', err);
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
        const active = this.activeServers.get(payload.serverId);
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

  setupServerListeners(serverId, nativeServerService) {
    nativeServerService.on('log', (logLine) => {
      this.connectionService.sendLog({ serverId, logLine });
    });

    nativeServerService.on('telemetry', (stats) => {
      this.connectionService.sendTelemetry({ serverId, stats });
    });

    nativeServerService.on('started', () => {
      this.connectionService.sendStateUpdate({ serverId, status: 'ONLINE' });
    });

    nativeServerService.on('stopped', () => {
      this.connectionService.sendStateUpdate({ serverId, status: 'OFFLINE' });
      this.activeServers.delete(serverId);
    });
  }

  setupTunnelListeners(serverId, tunnelService) {
    tunnelService.on('address_assigned', (address) => {
      this.connectionService.sendTunnelInfo({ serverId, address });
    });

    tunnelService.on('claim_link', (link) => {
      this.connectionService.sendTunnelInfo({ serverId, claimLink: link });
    });

    tunnelService.on('log', (logLine) => {
      this.connectionService.sendLog({ serverId, logLine });
    });

    tunnelService.on('error', (err) => {
      console.error(`[Tunnel Error Server ${serverId}]:`, err);
      this.connectionService.sendLog({ serverId, logLine: `[Tunnel Error]: ${err}` });
    });
  }

  getAvailablePort() {
    let port = this.nextPort;
    const usedPorts = Array.from(this.activeServers.values()).map(s => s.port);
    while (usedPorts.includes(port)) {
        port++;
    }
    return port;
  }

  async handleStartCommand(serverConfig) {
    const serverId = serverConfig.id;
    if (this.activeServers.has(serverId)) {
      this.connectionService.sendLog({ serverId, logLine: '[System] Servidor ya esta en ejecucion.' });
      return;
    }

    try {
      const managerDir = path.join(os.homedir(), '.minecraft-manager');
      serverConfig.dataDir = path.join(managerDir, 'servers', serverId);

      const port = this.getAvailablePort();
      serverConfig.port = port;

      const nativeServerService = new NativeServerService();
      const tunnelService = new TunnelService();

      this.setupServerListeners(serverId, nativeServerService);
      this.setupTunnelListeners(serverId, tunnelService);

      this.activeServers.set(serverId, { nativeServerService, tunnelService, port });

      this.connectionService.sendLog({ serverId, logLine: '[System] Booting Native server...' });
      await nativeServerService.startMinecraftServer(serverConfig);
      await tunnelService.startTunnel(port, serverConfig.tunnelSecret);
    } catch (error) {
      console.error("Error in handleStartCommand:", error);
      this.connectionService.sendLog({ serverId, logLine: `Error starting server: ${error.message}` });
      this.connectionService.sendStateUpdate({ serverId, status: 'OFFLINE' });
      this.activeServers.delete(serverId);
    }
  }

  async handleStopCommand(requestedServerId) {
    if (!requestedServerId) return;

    const active = this.activeServers.get(requestedServerId);
    if (!active) return;

    try {
      active.tunnelService.stopTunnel();
      await active.nativeServerService.stopMinecraftServer();
      this.connectionService.sendLog({ serverId: requestedServerId, logLine: '[System] Servidor y Túnel detenidos localmente.' });
    } catch (error) {
      this.connectionService.sendLog({ serverId: requestedServerId, logLine: `[System] Error al detener servidor: ${error.message}` });
    } finally {
      this.connectionService.sendStateUpdate({ serverId: requestedServerId, status: 'OFFLINE' });
      this.activeServers.delete(requestedServerId);
    }
  }
}
