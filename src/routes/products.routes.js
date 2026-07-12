import { Hono } from 'hono';
import * as controller from '../controllers/products.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/api-response.js';

const router = new Hono();

// ✅ Public Endpoints (قبل /:id)
router.get('/search', asyncHandler(controller.searchProducts));
router.get('/home', asyncHandler(controller.getHomePageData));
router.get('/featured', asyncHandler(controller.getFeaturedProducts));
router.get('/latest', asyncHandler(controller.getLatestProducts));
router.get('/offers', asyncHandler(controller.getProductsOnOffer));
router.get('/most-viewed', asyncHandler(controller.getMostViewedProducts));
router.get('/category/:category', asyncHandler(controller.getProductsByCategory));
router.get('/slug/:slug', asyncHandler(controller.getProductBySlug));

// ✅ Admin Endpoints (تحتاج Auth)
router.post('/', requireAuth, requireRole('admin'), asyncHandler(controller.createProduct));

// ✅ Public Endpoint
router.get('/', asyncHandler(controller.getProducts));

// ✅ Admin Endpoints
router.put('/:id', requireAuth, requireRole('admin'), asyncHandler(controller.updateProduct));
router.delete('/:id', requireAuth, requireRole('admin'), asyncHandler(controller.deleteProduct));

// ✅ Public Endpoints
router.get('/:id', asyncHandler(controller.getProductById));
router.post('/:id/view', asyncHandler(controller.incrementViewCount));

export { router as productsRoutes };