// /api/admin-mark-paid
// Marks a registration as paid (or back to awaiting_payment). Only
// accessible with a valid admin token. This is the moment a country
// actually becomes "taken" on the public board. For solo players, this is
// also when they get auto-placed onto an open country/group.

import { getAdminClient } from './_supabaseAdmin.js';
import { isValidAdminToken } from './_adminAuth.js';

const GROUPS = {
  A: ['Brazil', 'Germany', 'Japan', 'Nigeria'],
  B: ['Argentina', 'France', 'Mexico', 'Ghana'],
  C: ['USA', 'Spain', 'South Korea', 'Senegal'],
  D: ['Netherlands', 'Portugal', 'Morocco', 'Colombia'],
};
const ALL_COUNTRIES = Object.entries(GROUPS).flatMap(([g, list]) => list.map((name) => ({ name, group: g })));

async function findOpenCountryForSolo(supabase) {
  const { data: paidRegs, error } = await supabase
    .from('registrations')
    .select('type, country, squad_name')
    .eq('status', 'paid');
  if (error) throw error;

  const eligible = ALL_COUNTRIES.filter((c) => {
    const paidSquad = paidRegs.find((r) => r.country === c.name && r.type === 'squad');
    if (paidSquad) return false; // a full squad already owns this country
    const soloCount = paidRegs.filter((r) => r.country === c.name && r.type === 'solo').length;
    return soloCount < 11; // still has room for more solo players
  });

  if (eligible.length === 0) return null;
  return eligible[Math.floor(Math.random() * eligible.length)];
}

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

  const updates = {
    status: newStatus,
    verified_at: newStatus === 'paid' ? new Date().toISOString() : null,
  };

  // Auto-place solo players onto an open country the moment they're marked paid,
  // if they don't already have one assigned.
  if (newStatus === 'paid') {
    const { data: existing, error: fetchError } = await supabase
      .from('registrations')
      .select('type, country, group_key')
      .eq('id', id)
      .single();
    if (fetchError) {
      return res.status(500).json({ error: 'Failed to load registration' });
    }
    if (existing.type === 'solo' && !existing.country) {
      const pick = await findOpenCountryForSolo(supabase);
      if (pick) {
        updates.country = pick.name;
        updates.group_key = pick.group;
      }
    }
  }

  const { data, error } = await supabase
    .from('registrations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: 'Failed to update registration' });
  }

  return res.status(200).json({ registration: data });
}

