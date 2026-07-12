import { AppError, ApiResponse } from '../utils/api-response.js';
import * as authService from '../services/auth.service.js';

// ✅ POST /api/v1/auth/register
export const register = async (c) => {
  const body = await c.req.json();
  const result = await authService.registerUser(c.env.DB, body, c.env.JWT_SECRET);
   console.log("c.env.JWT_SECRET" , c.env.JWT_SECRET);
  // Set refresh token in cookie
  c.header('Set-Cookie', `refreshToken=${result.refreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${7 * 24 * 60 * 60}`);
  
  return c.json(new ApiResponse(201, {
    user: result.user,
    accessToken: result.accessToken,
  }, 'User registered successfully'));
};

// ✅ POST /api/v1/auth/login
export const login = async (c) => {
  const body = await c.req.json();
  const result = await authService.loginUser(c.env.DB, body, c.env.JWT_SECRET);
  console.log("c.env.JWT_SECRET" , c.env.JWT_SECRET);
  // Set refresh token in cookie
  c.header('Set-Cookie', `refreshToken=${result.refreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${7 * 24 * 60 * 60}`);
  
  return c.json(new ApiResponse(200, {
    user: result.user,
    accessToken: result.accessToken,
  }, 'Login successful'));
};

// ✅ POST /api/v1/auth/logout
export const logout = async (c) => {
  const refreshToken = c.req.header('Cookie')?.split('refreshToken=')[1]?.split(';')[0];
  
  await authService.logoutUser(c.env.DB, refreshToken);
  
  // Clear cookie
  c.header('Set-Cookie', 'refreshToken=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0');
  
  return c.json(new ApiResponse(200, null, 'Logout successful'));
};

// ✅ POST /api/v1/auth/refresh-token
export const refreshToken = async (c) => {
  const refreshToken = c.req.header('Cookie')?.split('refreshToken=')[1]?.split(';')[0];
  
  const result = await authService.refreshAccessToken(c.env.DB, refreshToken, c.env.JWT_SECRET);
  
  // Set new refresh token in cookie
  c.header('Set-Cookie', `refreshToken=${result.refreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${7 * 24 * 60 * 60}`);
  
  return c.json(new ApiResponse(200, {
    accessToken: result.accessToken,
  }, 'Token refreshed successfully'));
};