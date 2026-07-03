import prisma from '../config/prisma.js';

export default class ServerService {
  constructor(io) {
    this.io = io;
  }

  async createServer(userId, name, type, version, memory, compatibilityMode = false) {
    this.validateCreationInputs(userId, name);
    await this.ensureUserExists(userId);

    const userServers = await prisma.server.findMany({
      where: { userId }
    });
    
    let port = 25565;
    if (userServers.length > 0) {
      const maxPort = Math.max(...userServers.map(s => s.port));
      port = maxPort + 1;
    }

    return prisma.server.create({
      data: {
        userId,
        name,
        type: type || 'VANILLA',
        version: version || 'LATEST',
        memory: memory || '2G',
        port,
        status: 'OFFLINE',
        compatibilityMode
      }
    });
  }

  async getMyServers(userId) {
    return prisma.server.findMany({ where: { userId } });
  }

  async updateSettings(serverId, userId, { maxPlayers, whitelist, onlineMode, version, type, memory, compatibilityMode }) {
    const server = await this.findServerById(serverId);
    if (server.userId !== userId) throw new Error('Unauthorized');
    
    return prisma.server.update({
      where: { id: serverId },
      data: {
        maxPlayers: maxPlayers !== undefined ? Number(maxPlayers) : server.maxPlayers,
        whitelist: whitelist !== undefined ? Boolean(whitelist) : server.whitelist,
        onlineMode: onlineMode !== undefined ? Boolean(onlineMode) : server.onlineMode,
        version: version !== undefined ? version : server.version,
        type: type !== undefined ? type : server.type,
        memory: memory !== undefined ? memory : server.memory,
        compatibilityMode: compatibilityMode !== undefined ? Boolean(compatibilityMode) : server.compatibilityMode,
      }
    });
  }

  async startServer(serverId) {
    const server = await this.findServerById(serverId);
    this.verifyServerIsOffline(server);

    await this.updateServerStatus(serverId, 'STARTING');
    
    this.emitStartCommandToAgent(server);
    
    return server;
  }

  async stopServer(serverId) {
    const server = await this.findServerById(serverId);
    
    if (server.status === 'STOPPING') {
      await this.updateServerStatus(serverId, 'OFFLINE');
      return await this.findServerById(serverId);
    }
    
    await this.updateServerStatus(serverId, 'STOPPING');
    
    this.emitStopCommandToAgent(server);
    
    return server;
  }

  async deleteServer(serverId, userId, deleteFiles = true) {
    const server = await this.findServerById(serverId);
    if (server.userId !== userId) throw new Error('Unauthorized');
    
    // Si está encendido, lo detenemos primero (o devolvemos error)
    if (server.status !== 'OFFLINE') {
      throw new Error('Debes detener el servidor antes de eliminarlo');
    }

    // Le pedimos al agente que borre la carpeta (vía socket)
    if (this.io && deleteFiles) {
      this.io.emit('DELETE_SERVER', { id: server.id });
    }

    // Borramos de la BD
    return prisma.server.delete({
      where: { id: serverId }
    });
  }

  validateCreationInputs(userId, name) {
    if (!userId) throw new Error('User ID is required');
    if (!name) throw new Error('Server name is required');
  }

  async ensureUserExists(userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }
  }

  async findServerById(serverId) {
    if (!serverId) throw new Error('Server ID is required');
    
    const server = await prisma.server.findUnique({ where: { id: serverId } });
    if (!server) {
      throw new Error('Server not found');
    }
    return server;
  }

  verifyServerIsOffline(server) {
    if (server.status !== 'OFFLINE') {
      throw new Error('Server is already running or starting');
    }
  }

  async updateServerStatus(serverId, status) {
    return prisma.server.update({
      where: { id: serverId },
      data: { status }
    });
  }

  emitStartCommandToAgent(server) {
    if (!this.io) throw new Error('WebSocket instance not configured');
    
    const config = {
      id: server.id,
      name: server.name,
      type: server.type,
      version: server.version,
      memory: server.memory,
      port: server.port,
      dataDir: `./servers/${server.id}`,
      tunnelSecret: server.tunnelSecret,
      maxPlayers: server.maxPlayers,
      whitelist: server.whitelist,
      onlineMode: server.onlineMode,
      compatibilityMode: server.compatibilityMode
    };

    this.io.emit('START_SERVER', config);
  }

  emitStopCommandToAgent(server) {
    if (!this.io) throw new Error('WebSocket instance not configured');
    this.io.emit('STOP_SERVER', { id: server.id });
  }

  async executeCommand(serverId, command) {
    if (!serverId) throw new Error('Server ID is required');
    if (!command) throw new Error('Command is required');
    
    const server = await this.findServerById(serverId);
    if (server.status !== 'ONLINE') {
      throw new Error('Server must be ONLINE to execute commands');
    }
    
    if (!this.io) throw new Error('WebSocket instance not configured');
    this.io.emit('SEND_COMMAND', command);
    
    return { success: true, message: 'Command sent' };
  }
}
