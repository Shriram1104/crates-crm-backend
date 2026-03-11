import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { listQuotes, createQuote, getQuote, updateQuote, generatePdf, getShareLinks, deleteQuote } from '../controllers/quoteController.js';

const router = Router();
router.use(requireAuth);
router.get('/', listQuotes);
router.post('/', createQuote);
router.get('/:id', getQuote);
router.put('/:id', updateQuote);
router.post('/:id/generate-pdf', generatePdf);
router.get('/:id/generate-pdf', generatePdf);
router.get('/:id/share-links', getShareLinks);
router.delete('/:id', requireRole('admin'), deleteQuote);
export default router;
