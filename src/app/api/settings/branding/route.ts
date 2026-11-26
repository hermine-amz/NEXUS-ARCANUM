import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const DEFAULT_BRANDING = {
  siteName: "NEXUSARCANUM",
  siteTagline: "SHOP • LIBRAIRIE NUMÉRIQUE",
  siteLogoUrl: "",
};

export async function GET() {
  try {
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json(DEFAULT_BRANDING);
    }

    const { data } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["site_name", "site_tagline", "site_logo_url"]);

    const map = new Map((data || []).map((r) => [r.key, r.value]));

    return NextResponse.json({
      siteName: map.get("site_name") || DEFAULT_BRANDING.siteName,
      siteTagline: map.get("site_tagline") || DEFAULT_BRANDING.siteTagline,
      siteLogoUrl: map.get("site_logo_url") || DEFAULT_BRANDING.siteLogoUrl,
    });
  } catch {
    return NextResponse.json(DEFAULT_BRANDING);
  }
}
