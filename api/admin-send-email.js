// /api/admin-send-email
// Sends a confirmation email to a registrant, triggered manually by the
// organizer from the admin dashboard. Only accessible with a valid admin
// token. Requires RESEND_API_KEY to be configured -- if it isn't, this
// returns a clear error rather than failing silently.

import { getAdminClient } from './_supabaseAdmin.js';
import { isValidAdminToken } from './_adminAuth.js';
import { Resend } from 'resend';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, id } = req.body || {};
  if (!isValidAdminToken(token)) {
    return res.status(401).json({ error: 'Invalid or expired admin session' });
  }
  if (!id) {
    return res.status(400).json({ error: 'Missing id' });
  }
  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'Email sending is not configured (missing RESEND_API_KEY)' });
  }

  const supabase = getAdminClient();
  const { data: registration, error } = await supabase
    .from('registrations')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !registration) {
    return res.status(404).json({ error: 'Registration not found' });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const displayName = registration.type === 'squad' ? registration.squad_name : registration.player_name;
  const isPaid = registration.status === 'paid';
  const isSquad = registration.type === 'squad';

  const subject = isPaid
    ? "You're confirmed for the Summer World Cup!"
    : 'Summer World Cup — payment details';

  let confirmedBody;
  if (isSquad) {
    confirmedBody = registration.country
      ? `<p>This is the country you'll be representing: <strong>${registration.country}</strong>${registration.group_key ? ` (Group ${registration.group_key})` : ''}.</p>`
      : `<p>Your country assignment will be sent separately.</p>`;
  } else {
    confirmedBody = registration.country
      ? `<p>You have been placed on <strong>${registration.country}</strong>${registration.group_key ? ` (Group ${registration.group_key})` : ''}.</p>`
      : `<p>We'll follow up shortly with your team placement.</p>`;
  }

  const html = isPaid
    ? `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color:#0C0C0E;">You're confirmed! ⚽</h2>
        <p>Hi ${displayName || 'there'},</p>
        <p>This is confirmation that you have paid for the Summer World Cup.</p>
        ${confirmedBody}
        <p>See you on the pitch!</p>
      </div>
    `
    : `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color:#0C0C0E;">Thanks for registering!</h2>
        <p>Hi ${displayName || 'there'},</p>
        <p>We've received your Summer World Cup registration. Total due: $${registration.amount_paid}.</p>
        <p>We'll be in touch shortly with how to complete payment and finalize your spot.</p>
      </div>
    `;

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Summer World Cup <onboarding@resend.dev>',
      to: registration.email,
      subject,
      html,
    });
  } catch (emailError) {
    return res.status(500).json({ error: 'Failed to send email: ' + emailError.message });
  }

  return res.status(200).json({ sent: true });
}
