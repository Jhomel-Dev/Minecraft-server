import { Router } from 'express';
import ServerController from '../controllers/ServerController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = Router();
const serverController = new ServerController();

router.use(verifyToken);

router.get('/', serverController.getMyServers);
router.post('/create', serverController.createServer);
router.put('/:id/settings', serverController.updateSettings);
router.post('/:id/start', serverController.startServer);
router.post('/:id/stop', serverController.stopServer);
router.post('/:id/command', serverController.executeCommand);
router.delete('/:id', serverController.deleteServer);
router.post('/:id/fs', serverController.handleFileSystem);
router.get('/:id/players', serverController.getPlayers);

export default router;
