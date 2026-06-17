// Server-side only. Uses the SERVICE ROLE key, which bypasses RLS.
// This file is never sent to the browser -- it only runs inside /api functions.
import { createClient } from '@supabase/supabase-js';

export function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  }
  return createClient(url, serviceKey);
}

