import { Router } from 'express';
import UserController from '../controllers/UserController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = Router();
const userController = new UserController();

router.use(verifyToken);

router.put('/profile', userController.updateProfile);

export default router;
