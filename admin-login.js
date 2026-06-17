// /api/admin-login
// Checks the submitted password against ADMIN_PASSWORD (set in Vercel env vars,
// never exposed to the browser). On success, returns a simple session token
// that the admin page stores and sends with subsequent admin requests.

import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body || {};
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return res.status(500).json({ error: 'Admin password not configured on the server' });
  }

  if (password !== adminPassword) {
    return res.status(401).json({ error: 'Incorrect password' });
  }

  // Simple signed token: a timestamp + HMAC, checked by other admin endpoints.
  // Good enough for a single-organizer tool with no multi-user accounts.
  const secret = process.env.ADMIN_PASSWORD;
  const timestamp = Date.now().toString();
  const signature = crypto.createHmac('sha256', secret).update(timestamp).digest('hex');
  const token = `${timestamp}.${signature}`;

  return res.status(200).json({ token });
}
