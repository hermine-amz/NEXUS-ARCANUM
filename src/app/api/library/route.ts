import { NextResponse } from "next/server";
import { requireSupabaseAdmin } from "@/lib/supabase";
import { getCurrentSession } from "@/lib/security/auth";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  try {
    const supabase = requireSupabaseAdmin();
    const { data: ents } = await supabase
      .from("digital_entitlements")
      .select("*")
      .eq("user_id", session.userId)
      .eq("is_revoked", false)
      .order("granted_at", { ascending: false });

    const productIds = Array.from(new Set((ents || []).map((e) => e.product_id)));
    if (productIds.length === 0) {
      return NextResponse.json({ entitlements: [] });
    }

    const [{ data: prods }, { data: authors }, { data: assets }] = await Promise.all([
      supabase.from("products").select("*").in("id", productIds),
      supabase.from("authors").select("id, name"),
      supabase
        .from("digital_assets")
        .select("id, product_id, format, file_name")
        .in("product_id", productIds)
        .eq("asset_kind", "FULL_PRODUCT"),
    ]);

    const prodById = new Map((prods || []).map((p) => [p.id, p]));
    const authorById = new Map((authors || []).map((a) => [a.id, a.name]));

    const formatted = (ents || [])
      .map((e) => {
        const p = prodById.get(e.product_id);
        if (!p) return null;
        return {
          id: e.id,
          licenseKey: e.license_key,
          downloadCount: e.download_count,
          maxDownloads: e.max_downloads,
          grantedAt: e.granted_at,
          product: {
            slug: p.slug,
            titleFr: p.title_fr,
            coverUrl: p.cover_url,
            primaryFormat: p.primary_format,
            author: { name: authorById.get(p.author_id) || "Auteur" },
            assets: (assets || [])
              .filter((a) => a.product_id === p.id)
              .map((a) => ({ id: a.id, format: a.format, fileName: a.file_name })),
          },
        };
      })
      .filter(Boolean);

    return NextResponse.json({ entitlements: formatted });
  } catch (err) {
    return NextResponse.json(
      { error: "Erreur lecture bibliothèque.", details: String(err) },
      { status: 500 }
    );
  }
}
