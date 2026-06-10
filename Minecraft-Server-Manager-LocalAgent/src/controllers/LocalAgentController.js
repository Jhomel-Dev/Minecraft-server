import DockerService from '../services/DockerService.js';
import TunnelService from '../services/TunnelService.js';
import ConnectionService from '../services/ConnectionService.js';

export default class LocalAgentController {
  constructor(config) {
    this.validateConfig(config);
    this.dockerService = new DockerService();
    this.tunnelService = new TunnelService();
    this.connectionService = new ConnectionService(config.apiUrl, config.agentToken);
    
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
    this.setupDockerListeners();
  }

  start() {
    this.connectionService.connect();
  }

  setupConnectionListeners() {
    this.connectionService.on('command_start', async (serverConfig) => {
      this.currentServerId = serverConfig.id;
      await this.handleStartCommand(serverConfig);
    });

    this.connectionService.on('command_stop', () => {
      this.handleStopCommand();
    });
  }

  setupDockerListeners() {
    this.dockerService.on('log', (logLine) => {
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
      await this.dockerService.startMinecraftServer(serverConfig);
      this.tunnelService.startTunnel(serverConfig.tunnelSecret);
    } catch (error) {
      this.connectionService.sendLog(`Error starting server: ${error.message}`);
    }
  }

  handleStopCommand() {
    this.tunnelService.stopTunnel();
  }
}
