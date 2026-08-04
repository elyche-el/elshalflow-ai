// ============================================================
// ElshalflowAI — Supabase Clients
// ============================================================

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Standard client with anon key (for RLS-protected queries)
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Service role client (for admin operations in API routes)
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
