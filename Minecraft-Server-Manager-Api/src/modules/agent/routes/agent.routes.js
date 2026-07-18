import { Router } from 'express';
import { requestPairingCode, claimPairingCode, checkAgentStatus, unlinkAgent, unlinkSelfAgent, hibernateAgent, wakeAgent } from '../controllers/agent.controller.js';
import { verifyToken } from '../../../core/middlewares/auth.middleware.js';

const router = Router();

router.post('/pairing/request', requestPairingCode);
router.post('/pairing/claim', verifyToken, claimPairingCode);
router.get('/status', verifyToken, checkAgentStatus);
router.post('/unlink', verifyToken, unlinkAgent);
router.post('/unlink-self', unlinkSelfAgent);
router.post('/hibernate', verifyToken, hibernateAgent);
router.post('/wake', verifyToken, wakeAgent);

export default router;
