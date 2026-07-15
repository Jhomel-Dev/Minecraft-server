import { Router } from 'express';
import { requestPairingCode, claimPairingCode, checkAgentStatus } from '../controllers/agent.controller.js';
import { verifyToken } from '../../../core/middlewares/auth.middleware.js';

const router = Router();

router.post('/pairing/request', requestPairingCode);
router.post('/pairing/claim', verifyToken, claimPairingCode);
router.get('/status', verifyToken, checkAgentStatus);

export default router;
