import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import DnsService from './DnsService.js';

const dnsService = new DnsService();

const serverLogsBuffer = new Map();

export const handleSocketEvents = (io) => {
  io.use(authenticateSocket);
  io.on('connection', (socket) => {
    if (socket.isAgent) registerAgentEvents(socket);
    if (socket.isClient) registerClientEvents(socket);
  });
};

const authenticateSocket = (socket, next) => {
  const agentToken = socket.handshake.auth?.token;
  const clientToken = socket.handshake.auth?.jwt;
  
  if (agentToken && agentToken === process.env.AGENT_SECRET_TOKEN) {
    socket.isAgent = true;
    return next();
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
  socket.on('TELEMETRY_UPDATE', (payload) => handleTelemetry(socket, payload));
  socket.on('SERVER_LOG', (payload) => handleServerLog(socket, payload));
  socket.on('TUNNEL_INFO', (payload) => handleTunnelInfo(socket, payload));
  socket.on('STATUS_UPDATE', (payload) => handleStatusUpdate(socket, payload));
  socket.on('disconnect', (reason) => handleDisconnect(socket, reason));
};

const registerClientEvents = (socket) => {
  socket.on('JOIN_SERVER_CONSOLE', (serverId) => {
    socket.join(serverId);
    const history = serverLogsBuffer.get(serverId) || [];
    if (history.length > 0) {
      socket.emit('CONSOLE_LOG_HISTORY', history);
    }
  });
  socket.on('LEAVE_SERVER_CONSOLE', (serverId) => socket.leave(serverId));
  socket.on('CLEAR_SERVER_CONSOLE', (serverId) => {
    if (serverLogsBuffer.has(serverId)) {
      serverLogsBuffer.set(serverId, []);
    }
  });
  socket.on('SEND_COMMAND', (payload) => {
    socket.broadcast.emit('SEND_COMMAND', payload.command);
  });
};

const handleTelemetry = (socket, payload) => {
  if (payload.serverId) {
    socket.broadcast.to(payload.serverId).emit('TELEMETRY', payload.stats);
  }
};

const handleServerLog = (socket, payload) => {
  if (payload.serverId) {
    if (!serverLogsBuffer.has(payload.serverId)) {
      serverLogsBuffer.set(payload.serverId, []);
    }
    const buffer = serverLogsBuffer.get(payload.serverId);
    buffer.push(payload.logLine);
    if (buffer.length > 200) buffer.shift();

    socket.broadcast.to(payload.serverId).emit('CONSOLE_LOG', payload.logLine);
  }
};

const handleStatusUpdate = async (socket, payload) => {
  if (payload.serverId && payload.status) {
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
      console.error('Error updating status via socket', e);
    }
  }
};

const handleTunnelInfo = async (socket, info) => {
  if (info.serverId) {
    try {
      const updateData = {};
      if (info.address) updateData.tunnelIp = info.address;
      if (info.claimLink) updateData.claimLink = info.claimLink;
      
      if (Object.keys(updateData).length > 0) {
        const server = await prisma.server.update({
          where: { id: info.serverId },
          data: updateData
        });
        
        
        if (server.customDomain && info.address) {
          dnsService.setCustomDomain(server.customDomain, info.address).catch(e => {
            console.error('Failed to auto-update DNS in background', e);
          });
        }
      }
      
      
      socket.broadcast.to(info.serverId).emit('TUNNEL_INFO', info);
    } catch (e) {
      console.error('Error saving tunnel info', e);
    }
  }
};

const handleDisconnect = async (socket, reason) => {
  if (socket.isAgent) {
    try {
      await prisma.server.updateMany({
        data: { status: 'OFFLINE' }
      });
      
      socket.broadcast.emit('STATUS_UPDATE', 'OFFLINE');
    } catch (e) {
      console.error('Error marking servers offline on agent disconnect', e);
    }
  }
};