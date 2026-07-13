import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { productsRoutes } from './routes/products.routes.js';
import { authRoutes } from './routes/auth.routes.js';

const app = new Hono();
// test
// ✅ Enhanced Logger Middleware
app.use('*', async (c, next) => {
  const start = Date.now();
  const method = c.req.method;
  const path = c.req.path;
  const origin = c.req.header('Origin') || 'no-origin';
  
  console.log(`📥 [${new Date().toISOString()}] ${method} ${path} | Origin: ${origin}`);
  
  await next();
  
  const duration = Date.now() - start;
  const status = c.res.status;
  console.log(`📤 [${new Date().toISOString()}] ${method} ${path} | Status: ${status} | Duration: ${duration}ms`);
});

// ✅ CORS Configuration - Fixed for Workers
app.use('*', cors({
  origin: (origin, c) => {
    const allowedOrigins = [
      'https://furniture-storee.pages.dev',
      'https://furniture-store-5d3.pages.dev',
      'http://localhost:9000',
      'http://localhost:8787',
      'http://localhost:5173',
      'https://workers-front-end-furniture-store.pages.dev'
    ];
    
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) {
      console.log('✅ CORS: No origin header, allowing request');
      return allowedOrigins[0];
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      console.log(`✅ CORS: Origin ${origin} is allowed`);
      return origin;
    }
    
    // Allow any *.pages.dev subdomain (for development)
    if (origin.endsWith('.pages.dev')) {
      console.log(`✅ CORS: Origin ${origin} is *.pages.dev, allowing`);
      return origin;
    }
    
    // In development mode, allow localhost with any port
    // ✅ Fixed: Use c.env instead of process.env
    if (c.env?.NODE_ENV === 'development' && origin.startsWith('http://localhost')) {
      console.log(`✅ CORS: Development mode, allowing localhost origin ${origin}`);
      return origin;
    }
    
    // Default: return first allowed origin
    console.log(`⚠️ CORS: Origin ${origin} not in allowed list, returning default`);
    return allowedOrigins[0];
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposeHeaders: ['Content-Length', 'X-Request-Id'],
  credentials: true,
  maxAge: 86400, // 24 hours
}));

// ✅ Health Check
app.get('/', (c) => c.json({ 
  status: 'ALFEIN API - Cloudflare Workers + D1', 
  environment: c.env.NODE_ENV || 'development',
  timestamp: new Date().toISOString() 
}));

// ✅ Database Health Check
app.get('/health', async (c) => {
  try {
    const db = c.env.DB;
    
    if (!db) {
      console.error('❌ Health Check: DB binding not found');
      return c.json({ 
        status: 'unhealthy', 
        error: 'Database binding not configured'
      }, 500);
    }
    
    const result = await db.prepare('SELECT 1 as test').first();
    
    console.log('✅ Health Check: Database connected successfully');
    
    return c.json({ 
      status: 'healthy', 
      database: 'connected',
      method: 'D1 (SQLite)',
      environment: c.env.NODE_ENV || 'development',
      test: result,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('❌ Health Check Error:', err.message);
    return c.json({ 
      status: 'unhealthy', 
      error: err.message 
    }, 500);
  }
});

// ✅ Routes
app.route('/api/v1/auth', authRoutes);
app.route('/api/v1/products', productsRoutes);

// ✅ 404 Handler with detailed logging
app.notFound((c) => {
  console.warn(`⚠️ 404 Not Found: ${c.req.method} ${c.req.path}`);
  return c.json({ 
    statusCode: 404, 
    success: false, 
    message: 'Route not found', 
    data: null 
  }, 404);
});

// ✅ Error Handler with detailed logging
app.onError((err, c) => {
  console.error('❌ Error Details:');
  console.error('  - Path:', c.req.path);
  console.error('  - Method:', c.req.method);
  console.error('  - Status:', err.statusCode || 500);
  console.error('  - Message:', err.message);
  console.error('  - Stack:', err.stack);
  
  return c.json({ 
    statusCode: err.statusCode || 500, 
    success: false, 
    message: err.message, 
    data: null 
  }, err.statusCode || 500);
});

export default app;
