import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { productsRoutes } from './routes/products.routes.js';
import { authRoutes } from './routes/auth.routes.js';

const app = new Hono();

// ✅ Middlewares
app.use('*', logger());
app.use('*', cors({
  origin: ['https://furniture-storee.pages.dev', 'http://localhost:9000','https://furniture-storee.pages.dev'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ✅ Health Check
app.get('/', (c) => c.json({ 
  status: 'ALFEIN API - Cloudflare Workers + D1', 
  timestamp: new Date().toISOString() 
}));

app.get('/health', async (c) => {
  try {
    const db = c.env.DB;
    const result = await db.prepare('SELECT 1 as test').first();
    
    return c.json({ 
      status: 'healthy', 
      database: 'connected',
      method: 'D1 (SQLite)',
      test: result,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return c.json({ 
      status: 'unhealthy', 
      error: err.message 
    }, 500);
  }
});

// ✅ Routes
app.route('/api/v1/auth', authRoutes);
app.route('/api/v1/products', productsRoutes);

// ✅ 404 & Error Handling
app.notFound((c) => c.json({ 
  statusCode: 404, 
  success: false, 
  message: 'Route not found', 
  data: null 
}, 404));

app.onError((err, c) => {
  console.error('❌ Error:', err);
  return c.json({ 
    statusCode: err.statusCode || 500, 
    success: false, 
    message: err.message, 
    data: null 
  }, err.statusCode || 500);
});

export default app;