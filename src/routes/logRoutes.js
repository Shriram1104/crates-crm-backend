import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getLoginLogs, getAuditLogs } from '../controllers/logController.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));
router.get('/login', getLoginLogs);
router.get('/audit', getAuditLogs);
export default router;
