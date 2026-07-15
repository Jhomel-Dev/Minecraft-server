import { Router } from 'express';
import AuthController from '../controllers/auth.controller.js';
import { verifyToken } from '../../../core/middlewares/auth.middleware.js';

const router = Router();
const authController = new AuthController();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/google', authController.googleLogin);
router.post('/refresh', authController.refresh);
router.post('/logout', verifyToken, authController.logout);
router.get('/me/agent-token', verifyToken, authController.getAgentToken);

export default router;
