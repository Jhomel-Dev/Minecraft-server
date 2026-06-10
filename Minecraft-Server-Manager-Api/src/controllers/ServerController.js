import ServerService from '../services/ServerService.js';

export default class ServerController {
  
  createServer = async (req, res) => {
    try {
      const serverService = this.getServerService(req);
      const userId = req.user.id;
      const { name, type, version, memory } = req.body;
      
      const server = await serverService.createServer(userId, name, type, version, memory);
      
      return res.status(201).json(server);
    } catch (error) {
      this.handleError(res, error);
    }
  };

  startServer = async (req, res) => {
    try {
      const serverService = this.getServerService(req);
      const serverId = req.params.id;
      
      const server = await serverService.startServer(serverId);
      
      return res.status(200).json(server);
    } catch (error) {
      this.handleError(res, error);
    }
  };

  stopServer = async (req, res) => {
    try {
      const serverService = this.getServerService(req);
      const serverId = req.params.id;
      
      const server = await serverService.stopServer(serverId);
      
      return res.status(200).json(server);
    } catch (error) {
      this.handleError(res, error);
    }
  };

  getServerService(req) {
    const io = req.app.get('io');
    return new ServerService(io);
  }

  handleError(res, error) {
    if (error.message.includes('required') || 
        error.message.includes('not found') ||
        error.message.includes('already running')) {
      return res.status(400).json({ error: error.message });
    }
    
    return res.status(500).json({ error: 'Internal server error' });
  }
}
