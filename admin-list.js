// /api/admin-list
// Returns the full registration list including contact info -- only
// accessible with a valid admin token.

import { getAdminClient } from './_supabaseAdmin.js';
import { isValidAdminToken } from './_adminAuth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.body || {};
  if (!isValidAdminToken(token)) {
    return res.status(401).json({ error: 'Invalid or expired admin session' });
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('registrations')
    .select('*')
    .order('registered_at', { ascending: true });

  if (error) {
    return res.status(500).json({ error: 'Failed to load registrations' });
  }

  return res.status(200).json({ registrations: data });
}
