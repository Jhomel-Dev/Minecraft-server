import { Router } from 'express';
import ServerController from '../controllers/ServerController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = Router();
const serverController = new ServerController();

router.use(verifyToken);

router.post('/create', serverController.createServer);
router.post('/:id/start', serverController.startServer);
router.post('/:id/stop', serverController.stopServer);

export default router;
