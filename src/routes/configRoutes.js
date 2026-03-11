import { Router } from 'express';
import {
  listConfigs,
  upsertConfig,
  getConfigDefault,
  saveConfigDefault,
  listPlasticCrates,
  createPlasticCrate,
  updatePlasticCrate,
  getFieldPermissions,
  saveFieldPermissions
} from '../controllers/configController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
router.get('/', listConfigs);
router.post('/', requireRole('admin'), upsertConfig);
router.get('/default/:key', getConfigDefault);
router.post('/default/:key', requireRole('admin'), saveConfigDefault);
router.get('/plastic-crates', listPlasticCrates);
router.post('/plastic-crates', requireRole('admin'), createPlasticCrate);
router.put('/plastic-crates/:id', requireRole('admin'), updatePlasticCrate);
router.get('/field-permissions', getFieldPermissions);
router.post('/field-permissions', requireRole('admin'), saveFieldPermissions);

export default router;
