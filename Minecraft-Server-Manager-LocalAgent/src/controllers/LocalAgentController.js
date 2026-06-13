import NativeServerService from '../services/NativeServerService.js';
import TunnelService from '../services/TunnelService.js';
import ConnectionService from '../services/ConnectionService.js';
import FileService from '../services/FileService.js';

export default class LocalAgentController {
  constructor(config) {
    this.validateConfig(config);
    this.nativeServerService = new NativeServerService();
    this.tunnelService = new TunnelService();
    this.connectionService = new ConnectionService(config.apiUrl, config.agentToken);
    this.fileService = new FileService();
    
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
  }

  setupServerListeners() {
    this.nativeServerService.on('log', (logLine) => {
      if (this.currentServerId) {
        this.connectionService.sendLog({ serverId: this.currentServerId, logLine });
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
  }

  async handleStartCommand(serverConfig) {
    try {
      this.connectionService.sendLog({ serverId: this.currentServerId, logLine: '[System] Booting Native server...' });
      await this.nativeServerService.startMinecraftServer(serverConfig);
      this.tunnelService.startTunnel(serverConfig.tunnelSecret);
      this.connectionService.sendStateUpdate({ serverId: this.currentServerId, status: 'ONLINE' });
    } catch (error) {
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
