import { AppError } from '../utils/api-response.js';
import { verifyToken } from '../utils/jwt.js';

// ✅ Require Authentication
export const requireAuth = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError(401, 'Not authorized.');
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    c.set('user', payload);
    await next();
  } catch (error) {
    throw new AppError(401, 'Invalid or expired token.');
  }
};

// ✅ Require Role
export const requireRole = (role) => {
  return async (c, next) => {
    const user = c.get('user');
    
    if (!user || user.role !== role) {
      throw new AppError(403, 'Forbidden. Admin access required.');
    }
    
    await next();
  };
};

// ✅ Optional Auth (doesn't throw if no token)
export const optionalAuth = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    
    try {
      const payload = await verifyToken(token, c.env.JWT_SECRET);
      c.set('user', payload);
    } catch (error) {
      // Token invalid, continue without user
    }
  }
  
  await next();
};