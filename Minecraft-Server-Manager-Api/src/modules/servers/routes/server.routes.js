import { Router } from 'express';
import ServerController from '../controllers/server.controller.js';
import { verifyToken } from '../../../core/middlewares/auth.middleware.js';

const router = Router();
const serverController = new ServerController();

router.use(verifyToken);

router.get('/', serverController.getMyServers);
router.get('/agent-hardware', serverController.getAgentHardware);
router.post('/create', serverController.createServer);
router.put('/:id/settings', serverController.updateSettings);
router.post('/:id/start', serverController.startServer);
router.post('/:id/stop', serverController.stopServer);
router.post('/:id/command', serverController.executeCommand);
router.delete('/:id', serverController.deleteServer);
router.post('/:id/fs', serverController.handleFileSystem);
router.get('/:id/players', serverController.getPlayers);
router.get('/:id/backups', serverController.getBackups);
router.post('/:id/backups', serverController.createBackup);
router.delete('/:id/backups/:fileName', serverController.deleteBackup);
router.get('/:id/backups/:fileName/download', serverController.downloadBackup);

export default router;
