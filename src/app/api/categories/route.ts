import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { DEMO_CATEGORIES } from "@/lib/data/demo-catalog";

export async function GET() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({
      categories: DEMO_CATEGORIES.map((c) => ({
        slug: c.slug,
        nameFr: c.nameFr,
        nameEn: c.nameEn,
      })),
    });
  }

  try {
    const { data, error } = await supabase
      .from("categories")
      .select("slug, name_fr, name_en")
      .eq("is_active", true)
      .is("parent_id", null)
      .order("sort_order", { ascending: true });

    if (error || !data || data.length === 0) {
      return NextResponse.json({
        categories: DEMO_CATEGORIES.map((c) => ({
          slug: c.slug,
          nameFr: c.nameFr,
          nameEn: c.nameEn,
        })),
      });
    }

    return NextResponse.json({
      categories: data.map((c) => ({
        slug: c.slug,
        nameFr: c.name_fr,
        nameEn: c.name_en,
      })),
    });
  } catch {
    return NextResponse.json({
      categories: DEMO_CATEGORIES.map((c) => ({
        slug: c.slug,
        nameFr: c.nameFr,
        nameEn: c.nameEn,
      })),
    });
  }
}
