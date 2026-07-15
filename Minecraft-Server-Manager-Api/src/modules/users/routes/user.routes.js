import { Router } from 'express';
import UserController from '../controllers/user.controller.js';
import { verifyToken } from '../../../core/middlewares/auth.middleware.js';

const router = Router();
const userController = new UserController();

router.use(verifyToken);
router.put('/profile', userController.updateProfile);

export default router;
