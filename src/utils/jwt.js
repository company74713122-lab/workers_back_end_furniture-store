import { SignJWT, jwtVerify } from 'jose';

// ✅ Secret Key
const getSecretKey = (secret) => new TextEncoder().encode(secret);

// ✅ Sign Access Token
export async function signAccessToken(payload, secret, expiresIn = '1h') {
  const secretKey = getSecretKey(secret);
  
  const jwt = new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn);
  
  return await jwt.sign(secretKey);
}

// ✅ Sign Refresh Token
export async function signRefreshToken(payload, secret, expiresIn = '7d') {
  const secretKey = getSecretKey(secret);
  
  const jwt = new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn);
  
  return await jwt.sign(secretKey);
}

// ✅ Verify Token
export async function verifyToken(token, secret) {
  const secretKey = getSecretKey(secret);
  
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}