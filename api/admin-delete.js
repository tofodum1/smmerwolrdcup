// /api/admin-delete
// Deletes a single registration by id, or all registrations if `all: true`
// is passed. Only accessible with a valid admin token.

import { getAdminClient } from './_supabaseAdmin.js';
import { isValidAdminToken } from './_adminAuth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, id, all } = req.body || {};
  if (!isValidAdminToken(token)) {
    return res.status(401).json({ error: 'Invalid or expired admin session' });
  }

  const supabase = getAdminClient();

  if (all) {
    const { error } = await supabase.from('registrations').delete().neq('id', '');
    if (error) return res.status(500).json({ error: 'Failed to clear registrations' });
    return res.status(200).json({ deleted: 'all' });
  }

  if (!id) {
    return res.status(400).json({ error: 'Missing id' });
  }

  const { error } = await supabase.from('registrations').delete().eq('id', id);
  if (error) return res.status(500).json({ error: 'Failed to delete registration' });

  return res.status(200).json({ deleted: id });
}
