// /api/admin-mark-paid
// Marks a registration as paid (or back to awaiting_payment). Only
// accessible with a valid admin token. This is the moment a country
// actually becomes "taken" on the public board.

import { getAdminClient } from './_supabaseAdmin.js';
import { isValidAdminToken } from './_adminAuth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, id, paid } = req.body || {};
  if (!isValidAdminToken(token)) {
    return res.status(401).json({ error: 'Invalid or expired admin session' });
  }
  if (!id) {
    return res.status(400).json({ error: 'Missing id' });
  }

  const supabase = getAdminClient();
  const newStatus = paid === false ? 'awaiting_payment' : 'paid';

  const { data, error } = await supabase
    .from('registrations')
    .update({
      status: newStatus,
      verified_at: newStatus === 'paid' ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: 'Failed to update registration' });
  }

  return res.status(200).json({ registration: data });
}
