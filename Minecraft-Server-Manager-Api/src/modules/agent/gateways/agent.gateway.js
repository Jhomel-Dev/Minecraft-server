import jwt from 'jsonwebtoken';
import prisma from '../../../core/database/prisma.client.js';
import DnsService from '../../servers/services/dns.service.js';

const dnsService = new DnsService();
const serverLogsBuffer = new Map();

export const handleSocketEvents = (io) => {
  io.use(authenticateSocket);
  io.on('connection', (socket) => {
    if (socket.isAgent) return registerAgentEvents(socket);
    if (socket.isClient) return registerClientEvents(socket);
  });
};

const authenticateSocket = async (socket, next) => {
  const agentToken = socket.handshake.auth?.token;
  
  let cookieAccessToken = null;
  const cookieHeader = socket.handshake.headers?.cookie;
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce((acc, current) => {
      const [name, ...value] = current.trim().split('=');
      acc[name] = value.join('=');
      return acc;
    }, {});
    cookieAccessToken = cookies.accessToken;
  }
  
  const clientToken = socket.handshake.auth?.jwt || cookieAccessToken;
  
  if (agentToken) {
    try {
      const user = await prisma.user.findUnique({ where: { agentToken } });
      if (user) {
        socket.isAgent = true;
        socket.userId = user.id;
        return next();
      }
    } catch (e) {
      console.error('DB error auth agent', e);
    }
    
    if (agentToken === process.env.AGENT_SECRET_TOKEN) {
      socket.isAgent = true;
      socket.userId = 'LEGACY';
      return next();
    }
  }
  
  if (clientToken) {
    try {
      const decoded = jwt.verify(clientToken, process.env.JWT_SECRET);
      socket.user = decoded;
      socket.isClient = true;
      return next();
    } catch (e) {
      return next(new Error('Invalid JWT'));
    }
  }

  return next(new Error('Authentication Error: Missing Token'));
};

const registerAgentEvents = (socket) => {
  if (socket.userId !== 'LEGACY') {
    socket.join(`agent-${socket.userId}`);
  } else {
    socket.join('agent-global');
  }

  socket.on('TELEMETRY_UPDATE', (payload) => handleTelemetry(socket, payload));
  socket.on('SERVER_LOG', (payload) => handleServerLog(socket, payload));
  socket.on('TUNNEL_INFO', (payload) => handleTunnelInfo(socket, payload));
  socket.on('STATUS_UPDATE', (payload) => handleStatusUpdate(socket, payload));
  socket.on('disconnect', () => handleAgentDisconnect(socket));
};

const registerClientEvents = (socket) => {
  socket.on('JOIN_SERVER_CONSOLE', (serverId) => joinServerConsole(socket, serverId));
  socket.on('LEAVE_SERVER_CONSOLE', (serverId) => socket.leave(serverId));
  socket.on('CLEAR_SERVER_CONSOLE', (serverId) => clearServerConsole(serverId));
  socket.on('SEND_COMMAND', async (payload) => {
    try {
      const server = await prisma.server.findUnique({ where: { id: payload.serverId } });
      if (!server || server.userId !== socket.user.id) return;
      socket.to(`agent-${server.userId}`).to('agent-global').emit('SEND_COMMAND', payload.command);
    } catch (e) {
      console.error('[Agent Gateway] Error in SEND_COMMAND:', e);
    }
  });
};

const joinServerConsole = async (socket, serverId) => {
  try {
    const server = await prisma.server.findUnique({ where: { id: serverId } });
    if (!server || server.userId !== socket.user.id) return;
    
    socket.join(serverId);
    const history = serverLogsBuffer.get(serverId) || [];
    
    if (history.length > 0) {
      socket.emit('CONSOLE_LOG_HISTORY', history);
    }
  } catch (e) {
    console.error('[Agent Gateway] Error joining console:', e);
  }
};

const clearServerConsole = (serverId) => {
  if (serverLogsBuffer.has(serverId)) {
    serverLogsBuffer.set(serverId, []);
  }
};

const handleTelemetry = (socket, payload) => {
  if (!payload.serverId) return;
  socket.broadcast.to(payload.serverId).emit('TELEMETRY', payload.stats);
};

const handleServerLog = (socket, payload) => {
  if (!payload.serverId) return;

  if (!serverLogsBuffer.has(payload.serverId)) {
    serverLogsBuffer.set(payload.serverId, []);
  }
  
  const buffer = serverLogsBuffer.get(payload.serverId);
  buffer.push(payload.logLine);
  
  if (buffer.length > 200) buffer.shift();

  socket.broadcast.to(payload.serverId).emit('CONSOLE_LOG', payload.logLine);
};

const handleStatusUpdate = async (socket, payload) => {
  if (!payload.serverId || !payload.status) return;

  try {
    const updateData = { status: payload.status };
    
    if (payload.status === 'OFFLINE' || payload.status === 'STOPPING') {
      updateData.tunnelIp = null;
    }

    await prisma.server.update({
      where: { id: payload.serverId },
      data: updateData
    });
    
    socket.broadcast.to(payload.serverId).emit('STATUS_UPDATE', payload.status);
  } catch (e) {
    console.error('[Agent Gateway] Error updating status via socket:', e);
  }
};

const handleTunnelInfo = async (socket, info) => {
  if (!info.serverId) return;

  try {
    const updateData = {};
    if (info.address) updateData.tunnelIp = info.address;
    if (info.claimLink) updateData.claimLink = info.claimLink;
    
    if (Object.keys(updateData).length === 0) return;

    const server = await prisma.server.update({
      where: { id: info.serverId },
      data: updateData
    });
    
    await updateDnsBackground(server, info.address);
    
    socket.broadcast.to(info.serverId).emit('TUNNEL_INFO', info);
  } catch (e) {
    console.error('[Agent Gateway] Error saving tunnel info:', e);
  }
};

const updateDnsBackground = async (server, address) => {
  if (!server.customDomain || !address) return;
  
  try {
    await dnsService.setCustomDomain(server.customDomain, address);
  } catch (e) {
    console.error('[Agent Gateway] Failed to auto-update DNS in background:', e);
  }
};

const handleAgentDisconnect = async (socket) => {
  try {
    const whereClause = socket.userId === 'LEGACY' ? {} : { userId: socket.userId };
    await prisma.server.updateMany({
      where: whereClause,
      data: { status: 'OFFLINE' }
    });
    
    socket.broadcast.emit('STATUS_UPDATE', 'OFFLINE');
  } catch (e) {
    console.error('[Agent Gateway] Error marking servers offline on agent disconnect:', e);
  }
};