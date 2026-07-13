import { Hono } from 'hono';
import * as controller from '../controllers/auth.controller.js';
import { validate, loginSchema, registerSchema } from '../middleware/validation.middleware.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/api-response.js';

const router = new Hono();

// ✅ POST /api/v1/auth/login
router.post('/login', validate(loginSchema), asyncHandler(controller.login));

// ✅ POST /api/v1/auth/register (Admin only)
router.post('/register', requireAuth, requireRole('admin'), validate(registerSchema), asyncHandler(controller.register));

// ✅ POST /api/v1/auth/logout
router.post('/logout', requireAuth, asyncHandler(controller.logout));

// ✅ POST /api/v1/auth/refresh-token
router.post('/refresh-token', asyncHandler(controller.refreshToken));

export { router as authRoutes };
