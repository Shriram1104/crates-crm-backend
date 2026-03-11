import { Router } from 'express';
import { login, me, logout, changePassword } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.post('/login', login);
router.get('/me', requireAuth, me);
router.post('/logout', requireAuth, logout);
router.post('/change-password', requireAuth, changePassword);
export default router;
