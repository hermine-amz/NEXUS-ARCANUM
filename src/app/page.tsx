import React from "react";
import { getStorefrontData } from "@/lib/data/storefront";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { HomeClient } from "@/components/home/HomeClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { categories, products, dbConnected } = await getStorefrontData();

  let heroBanner: {
    titleFr: string;
    titleEn: string;
    subtitleFr: string | null;
    subtitleEn: string | null;
    ctaLabelFr: string | null;
    ctaUrl: string | null;
  } | null = null;

  const supabase = getSupabaseAdminClient();
  if (supabase) {
    const { data } = await supabase
      .from("banners")
      .select("title_fr, title_en, subtitle_fr, subtitle_en, cta_label_fr, cta_url")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (data) {
      heroBanner = {
        titleFr: data.title_fr,
        titleEn: data.title_en,
        subtitleFr: data.subtitle_fr,
        subtitleEn: data.subtitle_en,
        ctaLabelFr: data.cta_label_fr,
        ctaUrl: data.cta_url,
      };
    }
  }

  return (
    <HomeClient
      categories={categories}
      products={products}
      dbConnected={dbConnected}
      heroBanner={heroBanner}
    />
  );
}
