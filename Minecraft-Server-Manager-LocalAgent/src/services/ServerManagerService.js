import path from 'path';
import os from 'os';
import NativeServerService from './NativeServerService.js';
import TunnelService from './TunnelService.js';

export default class ServerManagerService {
  constructor(connectionService) {
    this.activeServers = new Map();
    this.nextPort = 25565;
    this.connectionService = connectionService;
  }

  getAvailablePort() {
    let port = this.nextPort;
    const usedPorts = Array.from(this.activeServers.values()).map(s => s.port);
    while (usedPorts.includes(port)) {
        port++;
    }
    return port;
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

  async startServer(serverConfig) {
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
      console.error("Error in startServer:", error);
      this.connectionService.sendLog({ serverId, logLine: `Error starting server: ${error.message}` });
      this.connectionService.sendStateUpdate({ serverId, status: 'OFFLINE' });
      this.activeServers.delete(serverId);
    }
  }

  async stopServer(requestedServerId) {
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

  async stopAllServers() {
    for (const active of this.activeServers.values()) {
      try {
        if (active.tunnelService) active.tunnelService.stopTunnel();
        if (active.nativeServerService) await active.nativeServerService.stopMinecraftServer();
      } catch (e) {}
    }
  }
}
