import { Hono } from 'hono';
import * as controller from '../controllers/upload.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/api-response.js';

const router = new Hono();

// ✅ POST /api/v1/upload/sign (Admin only)
router.post('/sign', requireAuth, requireRole('admin'), asyncHandler(controller.getUploadSignature));

// ✅ POST /api/v1/upload/delete (Admin only)
router.post('/delete', requireAuth, requireRole('admin'), asyncHandler(controller.deleteImage));

// ✅ POST /api/v1/upload/delete-multiple (Admin only)
router.post('/delete-multiple', requireAuth, requireRole('admin'), asyncHandler(controller.deleteImages));

export { router as uploadRoutes };