// Shared helper used by admin endpoints to check the session token
// produced by /api/admin-login. Tokens expire after 12 hours.
import crypto from 'crypto';

const TOKEN_LIFETIME_MS = 12 * 60 * 60 * 1000; // 12 hours

export function isValidAdminToken(token) {
  if (!token || typeof token !== 'string') return false;
  const [timestamp, signature] = token.split('.');
  if (!timestamp || !signature) return false;

  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) return false;

  const expectedSignature = crypto.createHmac('sha256', secret).update(timestamp).digest('hex');
  if (signature !== expectedSignature) return false;

  const age = Date.now() - parseInt(timestamp, 10);
  if (Number.isNaN(age) || age > TOKEN_LIFETIME_MS || age < 0) return false;

  return true;
}
