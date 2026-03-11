import { Router } from 'express';
import { listUsers, createUser, updateUser, updateSelf } from '../controllers/userController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
// Self-update — any logged-in user
router.put('/me', updateSelf);
// Admin-only
router.get('/', requireRole('admin'), listUsers);
router.post('/', requireRole('admin'), createUser);
router.put('/:id', requireRole('admin'), updateUser);
export default router;
