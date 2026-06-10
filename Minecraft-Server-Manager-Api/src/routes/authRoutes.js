import { Router } from 'express';
import AuthController from '../controllers/AuthController.js';

const router = Router();
const authController = new AuthController();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/google', authController.googleLogin);
router.get('/refresh', authController.refresh);
router.post('/logout', authController.logout);

export default router;
