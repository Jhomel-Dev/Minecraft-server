import NativeServerService from '../services/NativeServerService.js';
import TunnelService from '../services/TunnelService.js';
import ConnectionService from '../services/ConnectionService.js';
import FileService from '../services/FileService.js';
import PlayerStatsService from '../services/PlayerStatsService.js';
import os from 'os';
import path from 'path';

export default class LocalAgentController {
  constructor(config) {
    this.validateConfig(config);
    this.nativeServerService = new NativeServerService();
    this.tunnelService = new TunnelService();
    this.connectionService = new ConnectionService(config.apiUrl, config.agentToken);
    this.fileService = new FileService();
    this.playerStatsService = new PlayerStatsService();
    
    this.initialize();
  }

  validateConfig(config) {
    if (!config) throw new Error('Controller configuration is required');
    if (!config.apiUrl) throw new Error('API URL is required');
    if (!config.agentToken) throw new Error('Agent Token is required');
  }

  initialize() {
    this.setupConnectionListeners();
    this.setupTunnelListeners();
    this.setupServerListeners();
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
      this.currentServerId = serverConfig.id;
      await this.handleStartCommand(serverConfig);
    });

    this.connectionService.on('command_stop', (payload) => {
      console.log('Recibida orden de apagado.');
      this.handleStopCommand(payload?.id);
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

    this.connectionService.on('server_command', async (cmd) => {
      try {
        await this.nativeServerService.sendCommand(cmd);
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
        const players = await this.playerStatsService.getPlayers(payload.serverId);
        callback({ success: true, data: players });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });
  }

  setupServerListeners() {
    this.nativeServerService.on('log', (logLine) => {
      if (this.currentServerId) {
        this.connectionService.sendLog({ serverId: this.currentServerId, logLine });
      }
    });

    this.nativeServerService.on('telemetry', (stats) => {
      if (this.currentServerId) {
        this.connectionService.sendTelemetry({ serverId: this.currentServerId, stats });
      }
    });
  }

  setupTunnelListeners() {
    this.tunnelService.on('address_assigned', (address) => {
      this.connectionService.sendTunnelInfo({ address });
    });

    this.tunnelService.on('claim_link', (link) => {
      this.connectionService.sendTunnelInfo({ claimLink: link });
    });

    this.tunnelService.on('log', (logLine) => {
      if (this.currentServerId) {
        this.connectionService.sendLog({ serverId: this.currentServerId, logLine });
      }
    });

    this.tunnelService.on('error', (err) => {
      console.error('[Tunnel Error]:', err);
      if (this.currentServerId) {
        this.connectionService.sendLog({ serverId: this.currentServerId, logLine: `[Tunnel Error]: ${err}` });
      }
    });
  }

  async handleStartCommand(serverConfig) {
    try {
      const managerDir = path.join(os.homedir(), '.minecraft-manager');
      serverConfig.dataDir = path.join(managerDir, 'servers', serverConfig.id);

      this.connectionService.sendLog({ serverId: this.currentServerId, logLine: '[System] Booting Native server...' });
      await this.nativeServerService.startMinecraftServer(serverConfig);
      this.tunnelService.startTunnel(serverConfig.tunnelSecret);
      this.connectionService.sendStateUpdate({ serverId: this.currentServerId, status: 'ONLINE' });
    } catch (error) {
      console.error("Error in handleStartCommand:", error);
      this.connectionService.sendLog({ serverId: this.currentServerId, logLine: `Error starting server: ${error.message}` });
      this.connectionService.sendStateUpdate({ serverId: this.currentServerId, status: 'OFFLINE' });
    }
  }

  async handleStopCommand(requestedServerId) {
    const targetId = requestedServerId || this.currentServerId;
    if (!targetId) return;

    try {
      this.tunnelService.stopTunnel();
      await this.nativeServerService.stopMinecraftServer();
      this.connectionService.sendLog({ serverId: targetId, logLine: '[System] Servidor y Túnel detenidos localmente.' });
    } catch (error) {
      this.connectionService.sendLog({ serverId: targetId, logLine: `[System] Error al detener servidor: ${error.message}` });
    } finally {
      this.connectionService.sendStateUpdate({ serverId: targetId, status: 'OFFLINE' });
      if (this.currentServerId === targetId) {
        this.currentServerId = null;
      }
    }
  }
}
