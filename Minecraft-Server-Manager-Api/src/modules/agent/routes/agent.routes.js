import { Router } from 'express';
import { requestPairingCode, claimPairingCode } from '../controllers/agent.controller.js';
import { authenticate } from '../../../core/middlewares/auth.middleware.js';

const router = Router();

router.post('/pairing/request', requestPairingCode);
router.post('/pairing/claim', authenticate, claimPairingCode);

export default router;
