import { Router } from 'express';
import VersionService from '../services/version.service.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const versions = await VersionService.getVersions();
    res.status(200).json(versions);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
