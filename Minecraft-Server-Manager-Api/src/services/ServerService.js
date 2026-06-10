import prisma from '../config/prisma.js';

export default class ServerService {
  constructor(io) {
    this.io = io;
  }

  async createServer(userId, name, type, version, memory) {
    this.validateCreationInputs(userId, name);
    await this.ensureUserExists(userId);

    return prisma.server.create({
      data: {
        userId,
        name,
        type: type || 'VANILLA',
        version: version || 'LATEST',
        memory: memory || '2G',
        status: 'OFFLINE'
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
    
    await this.updateServerStatus(serverId, 'STOPPING');
    
    this.emitStopCommandToAgent(server);
    
    return server;
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
      tunnelSecret: server.tunnelSecret
    };

    this.io.emit('START_SERVER', config);
  }

  emitStopCommandToAgent(server) {
    if (!this.io) throw new Error('WebSocket instance not configured');
    this.io.emit('STOP_SERVER', { id: server.id });
  }
}
