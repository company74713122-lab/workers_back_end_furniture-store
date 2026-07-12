import { AppError } from '../utils/api-response.js';
import { generateId } from '../db/d1.js';
import { hashPassword, verifyPassword } from '../utils/crypto.js';
import { signAccessToken, signRefreshToken, verifyToken } from '../utils/jwt.js';

// ✅ Register User
export async function registerUser(db, dto, jwtSecret) {
  // Check if user exists
  const existingUser = await db.prepare(
    'SELECT id FROM users WHERE email = ? OR username = ?'
  ).bind(dto.email, dto.username).first();
  
  if (existingUser) {
    throw new AppError(409, 'Username or email already exists');
  }
  
  const id = generateId();
  const hashedPassword = await hashPassword(dto.password);
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO users (id, username, email, password, role, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    dto.username,
    dto.email,
    hashedPassword,
    dto.role || 'employee',
    now,
    now
  ).run();
  
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
  
  // Generate tokens
  const accessToken = await signAccessToken(
    { sub: user.id, role: user.role },
    jwtSecret,
    '1h'
  );
  
  const refreshToken = await signRefreshToken(
    { sub: user.id, role: user.role },
    jwtSecret,
    '7d'
  );
  
  // Store refresh token
  const refreshTokenId = generateId();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  
  await db.prepare(`
    INSERT INTO refresh_tokens (id, user_id, token, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(refreshTokenId, user.id, refreshToken, expiresAt, now).run();
  
  return {
    user: parseUser(user),
    accessToken,
    refreshToken,
  };
}

// ✅ Login User
export async function loginUser(db, dto, jwtSecret) {
  const user = await db.prepare(
    'SELECT * FROM users WHERE email = ?'
  ).bind(dto.email).first();
  
  if (!user) {
    throw new AppError(401, 'Invalid credentials');
  }
  
  const isValid = await verifyPassword(dto.password, user.password);
  
  if (!isValid) {
    throw new AppError(401, 'Invalid credentials');
  }
  
  // Update last login
  const now = new Date().toISOString();
  await db.prepare(
    'UPDATE users SET last_login = ?, updated_at = ? WHERE id = ?'
  ).bind(now, now, user.id).run();
  
  // Generate tokens
  const accessToken = await signAccessToken(
    { sub: user.id, role: user.role },
    jwtSecret,
    '1h'
  );
  
  const refreshToken = await signRefreshToken(
    { sub: user.id, role: user.role },
    jwtSecret,
    '7d'
  );
  
  // Store refresh token
  const refreshTokenId = generateId();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  
  await db.prepare(`
    INSERT INTO refresh_tokens (id, user_id, token, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(refreshTokenId, user.id, refreshToken, expiresAt, now).run();
  
  return {
    user: parseUser(user),
    accessToken,
    refreshToken,
  };
}

// ✅ Logout User
export async function logoutUser(db, refreshToken) {
  if (!refreshToken) {
    throw new AppError(401, 'Refresh token required');
  }
  
  const result = await db.prepare(
    'DELETE FROM refresh_tokens WHERE token = ?'
  ).bind(refreshToken).run();
  
  if (result.changes === 0) {
    throw new AppError(401, 'Invalid refresh token');
  }
  
  return { message: 'Logout successful' };
}

// ✅ Refresh Token
export async function refreshAccessToken(db, refreshToken, jwtSecret) {
  if (!refreshToken) {
    throw new AppError(401, 'Refresh token required');
  }
  
  // Verify refresh token
  let payload;
  try {
    payload = await verifyToken(refreshToken, jwtSecret);
  } catch (error) {
    throw new AppError(401, 'Invalid or expired refresh token');
  }
  
  // Check if token exists in database
  const tokenRecord = await db.prepare(
    'SELECT * FROM refresh_tokens WHERE token = ?'
  ).bind(refreshToken).first();
  
  if (!tokenRecord) {
    throw new AppError(401, 'Invalid refresh token');
  }
  
  // Check if token is expired
  if (new Date(tokenRecord.expires_at) < new Date()) {
    await db.prepare('DELETE FROM refresh_tokens WHERE id = ?').bind(tokenRecord.id).run();
    throw new AppError(401, 'Refresh token expired');
  }
  
  // Delete old refresh token
  await db.prepare('DELETE FROM refresh_tokens WHERE id = ?').bind(tokenRecord.id).run();
  
  // Generate new tokens
  const accessToken = await signAccessToken(
    { sub: payload.sub, role: payload.role },
    jwtSecret,
    '1h'
  );
  
  const newRefreshToken = await signRefreshToken(
    { sub: payload.sub, role: payload.role },
    jwtSecret,
    '7d'
  );
  
  // Store new refresh token
  const refreshTokenId = generateId();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO refresh_tokens (id, user_id, token, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(refreshTokenId, payload.sub, newRefreshToken, expiresAt, now).run();
  
  return { accessToken, refreshToken: newRefreshToken };
}

// ✅ Get User by ID
export async function getUserById(db, id) {
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
  
  if (!user) {
    throw new AppError(404, 'User not found');
  }
  
  return parseUser(user);
}

// ✅ Parse User Object
function parseUser(row) {
  if (!row) return null;
  
  return {
    _id: row.id,
    id: row.id,
    username: row.username,
    email: row.email,
    role: row.role,
    last_login: row.last_login,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    __v: 0,
  };
}