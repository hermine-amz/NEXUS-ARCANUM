import crypto from "crypto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export type ProductType =
  | "EBOOK_PDF"
  | "EBOOK_EPUB"
  | "AUDIOBOOK"
  | "DIGITAL_MANUAL"
  | "PRACTICAL_GUIDE"
  | "DIGITAL_COURSE"
  | "DIGITAL_MAGAZINE"
  | "EDUCATIONAL_DOC"
  | "BOOK_PACK"
  | "THEMATIC_COLLECTION"
  | "DIGITAL_LIBRARY"
  | "DOWNLOADABLE_RESOURCE"
  | "TRAINING_MATERIAL"
  | "OTHER_DIGITAL";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://muxrjvxgpdnngacwovez.supabase.co";

export function newId(): string {
  return "c" + crypto.randomBytes(12).toString("hex");
}

export function getSupabasePublicClient(): SupabaseClient | null {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) return null;
  return createClient(supabaseUrl, anonKey);
}

export function getSupabaseAdminClient(): SupabaseClient | null {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function requireSupabaseAdmin(): SupabaseClient {
  const client = getSupabaseAdminClient();
  if (!client) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY manquant dans la configuration.");
  }
  return client;
}
