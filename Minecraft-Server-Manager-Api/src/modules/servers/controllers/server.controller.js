import ServerService from '../services/server.service.js';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { z } from 'zod';
import prisma from '../../../core/database/prisma.client.js';
import { agentHardwareMap } from '../../agent/gateways/agent.gateway.js';

const createServerSchema = z.object({
  name: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_\- ]+$/, 'Nombre inválido'),
  type: z.string(),
  version: z.string(),
  memory: z.string().regex(/^\d{1,4}[MG]$/, 'Formato de RAM inválido (ej. 4G o 4096M)'),
  compatibilityMode: z.boolean().optional().default(false)
});

export default class ServerController {
  
  createServer = async (req, res) => {
    try {
      const parsedBody = createServerSchema.parse(req.body);
      
      const serverService = this.getServerService(req);
      const userId = req.user.id;
      
      const serverCount = await prisma.server.count({ where: { userId } });
      if (serverCount >= 3) {
        return res.status(403).json({ error: 'Has alcanzado el límite de 3 servidores' });
      }

      const { name, type, version, memory, compatibilityMode } = parsedBody;
      
      const server = await serverService.createServer(userId, name, type, version, memory, compatibilityMode);
      
      return res.status(201).json(server);
    } catch (error) {
      this.handleError(res, error);
    }
  };

  getMyServers = async (req, res) => {
    try {
      const serverService = this.getServerService(req);
      const userId = req.user.id;
      const servers = await serverService.getMyServers(userId);
      return res.status(200).json(servers);
    } catch (error) {
      this.handleError(res, error);
    }
  };

  getAgentHardware = async (req, res) => {
    try {
      const hardware = agentHardwareMap.get(req.user.id);
      if (!hardware) return res.status(404).json({ error: 'Agent offline' });
      return res.status(200).json(hardware);
    } catch (error) {
      this.handleError(res, error);
    }
  };

  updateSettings = async (req, res) => {
    try {
      const serverService = this.getServerService(req);
      const userId = req.user.id;
      const serverId = req.params.id;
      const settings = req.body;
      const server = await serverService.updateSettings(serverId, userId, settings);
      return res.status(200).json(server);
    } catch (error) {
      this.handleError(res, error);
    }
  };

  startServer = async (req, res) => {
    try {
      const serverService = this.getServerService(req);
      const serverId = req.params.id;
      const userId = req.user.id;
      
      const server = await serverService.startServer(serverId, userId);
      
      return res.status(200).json(server);
    } catch (error) {
      this.handleError(res, error);
    }
  };

  stopServer = async (req, res) => {
    try {
      const serverService = this.getServerService(req);
      const serverId = req.params.id;
      const userId = req.user.id;
      
      const server = await serverService.stopServer(serverId, userId);
      
      return res.status(200).json(server);
    } catch (error) {
      this.handleError(res, error);
    }
  };

  executeCommand = async (req, res) => {
    try {
      const serverService = this.getServerService(req);
      const serverId = req.params.id;
      const userId = req.user.id;
      const { command } = req.body;
      
      const result = await serverService.executeCommand(serverId, userId, command);
      
      return res.status(200).json(result);
    } catch (error) {
      this.handleError(res, error);
    }
  };

  deleteServer = async (req, res) => {
    try {
      const serverService = this.getServerService(req);
      const userId = req.user.id;
      const serverId = req.params.id;
      const { keepFiles } = req.body || {}; 
      
      await serverService.deleteServer(serverId, userId, !keepFiles);
      
      return res.status(200).json({ success: true });
    } catch (error) {
      this.handleError(res, error);
    }
  };

  handleFileSystem = async (req, res) => {
    try {
      const serverService = this.getServerService(req);
      const userId = req.user.id;
      const serverId = req.params.id;
      const { action, filePath, content, isBase64, url } = req.body;
      
      const server = await serverService.findServerById(serverId);
      if (server.userId !== userId) return res.status(403).json({ error: 'Unauthorized' });

      const io = req.app.get('io');
      const sockets = await io.fetchSockets();
      const agentSocket = sockets.find(s => s.isAgent);
      
      if (!agentSocket) return res.status(503).json({ error: 'Agent offline' });

      agentSocket.emit('FS_OPERATION', { serverId, action, filePath, content, isBase64, url }, (response) => {
        if (response.success) {
          return res.status(200).json(response.data);
        } else {
          return res.status(400).json({ error: response.error });
        }
      });
    } catch (error) {
      this.handleError(res, error);
    }
  };

  getPlayers = async (req, res) => {
    try {
      const serverService = this.getServerService(req);
      const userId = req.user.id;
      const serverId = req.params.id;
      
      const server = await serverService.findServerById(serverId);
      if (server.userId !== userId) return res.status(403).json({ error: 'Unauthorized' });

      const io = req.app.get('io');
      const sockets = await io.fetchSockets();
      const agentSocket = sockets.find(s => s.isAgent);
      
      if (!agentSocket) return res.status(503).json({ error: 'Agent offline' });

      agentSocket.emit('get_player_stats', { serverId }, (response) => {
        if (response.success) {
          return res.status(200).json(response.data);
        } else {
          return res.status(400).json({ error: response.error });
        }
      });
    } catch (error) {
      this.handleError(res, error);
    }
  };
  getBackups = async (req, res) => {
    try {
      const serverService = this.getServerService(req);
      const userId = req.user.id;
      const serverId = req.params.id;
      
      const server = await serverService.findServerById(serverId);
      if (server.userId !== userId) return res.status(403).json({ error: 'Unauthorized' });

      const io = req.app.get('io');
      const agentSocket = (await io.fetchSockets()).find(s => s.isAgent);
      if (!agentSocket) return res.status(503).json({ error: 'Agent offline' });

      agentSocket.emit('list_backups', { serverId }, (response) => {
        if (response.success) return res.status(200).json(response.data);
        return res.status(400).json({ error: response.error });
      });
    } catch (error) { this.handleError(res, error); }
  };

  createBackup = async (req, res) => {
    try {
      const serverService = this.getServerService(req);
      const userId = req.user.id;
      const serverId = req.params.id;
      const { profile } = req.body;
      
      const server = await serverService.findServerById(serverId);
      if (server.userId !== userId) return res.status(403).json({ error: 'Unauthorized' });

      const io = req.app.get('io');
      const agentSocket = (await io.fetchSockets()).find(s => s.isAgent);
      if (!agentSocket) return res.status(503).json({ error: 'Agent offline' });

      agentSocket.emit('create_backup', { serverId, profile: profile || 'full' }, (response) => {
        if (response.success) return res.status(201).json(response);
        return res.status(400).json({ error: response.error });
      });
    } catch (error) { this.handleError(res, error); }
  };

  deleteBackup = async (req, res) => {
    try {
      const serverService = this.getServerService(req);
      const userId = req.user.id;
      const { id: serverId, fileName } = req.params;
      
      const server = await serverService.findServerById(serverId);
      if (server.userId !== userId) return res.status(403).json({ error: 'Unauthorized' });

      const io = req.app.get('io');
      const agentSocket = (await io.fetchSockets()).find(s => s.isAgent);
      if (!agentSocket) return res.status(503).json({ error: 'Agent offline' });

      agentSocket.emit('delete_backup', { serverId, fileName }, (response) => {
        if (response.success) return res.status(200).json(response);
        return res.status(400).json({ error: response.error });
      });
    } catch (error) { this.handleError(res, error); }
  };

  downloadBackup = async (req, res) => {
    try {
      const serverService = this.getServerService(req);
      const userId = req.user.id;
      const { id: serverId, fileName } = req.params;
      
      const server = await serverService.findServerById(serverId);
      if (server.userId !== userId) return res.status(403).json({ error: 'Unauthorized' });

      if (!fileName.endsWith('.zip') || fileName.includes('/')) return res.status(400).json({ error: 'Archivo inválido' });

      const backupPath = path.join(os.homedir(), '.minecraft-manager', 'servers', serverId, 'backups', fileName);
      
      if (!fs.existsSync(backupPath)) {
        return res.status(404).json({ error: 'Backup no encontrado' });
      }

      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', 'application/zip');
      
      const fileStream = fs.createReadStream(backupPath);
      fileStream.on('error', (err) => {
        console.error('Error streaming file:', err);
        if (!res.headersSent) res.status(500).json({ error: 'Error leyendo archivo' });
      });
      
      return fileStream.pipe(res);
    } catch (error) { this.handleError(res, error); }
  };

  getServerService(req) {
    const io = req.app.get('io');
    return new ServerService(io);
  }

  handleError(res, error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors.map(e => e.message).join(', ') });
    }

    if (error.message.includes('required') || 
        error.message.includes('not found') ||
        error.message.includes('already running') ||
        error.message.includes('must be ONLINE') ||
        error.message.includes('detener')) {
      return res.status(400).json({ error: error.message });
    }
    
    return res.status(500).json({ error: 'Internal server error' });
  }
}
