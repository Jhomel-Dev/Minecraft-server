import { Router } from 'express';
import { requestPairingCode, claimPairingCode, checkAgentStatus } from '../controllers/agent.controller.js';
import { authenticate } from '../../../core/middlewares/auth.middleware.js';

const router = Router();

router.post('/pairing/request', requestPairingCode);
router.post('/pairing/claim', authenticate, claimPairingCode);
router.get('/status', authenticate, checkAgentStatus);

export default router;
