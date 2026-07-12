import { z } from 'zod';
import { AppError, ApiResponse } from '../utils/api-response.js';

// ✅ Validation Schemas
export const loginSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  username: z.string()
    .min(2, 'Username must be at least 2 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string().email('Please provide a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  role: z.enum(['employee', 'admin']).optional(),
});

// ✅ Validation Middleware
export const validate = (schema) => {
  return async (c, next) => {
    try {
      const body = await c.req.json();
      const result = schema.parse(body);
      c.set('validatedBody', result);
      await next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        
        return c.json(new ApiResponse(400, null, 'Validation error', errors), 400);
      }
      throw error;
    }
  };
};