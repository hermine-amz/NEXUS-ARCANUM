import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://muxrjvxgpdnngacwovez.supabase.co";

/**
 * Client Supabase public (anon key) — utilisable côté navigateur et serveur pour les opérations publiques.
 */
export function getSupabasePublicClient() {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) return null;
  return createClient(supabaseUrl, anonKey);
}

/**
 * Client Supabase serveur (service_role key) — UNIQUEMENT côté serveur (API Routes / Server Actions).
 * Utilisé pour Supabase Storage (fichiers numériques privés) et les opérations d'administration.
 */
export function getSupabaseAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
