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
    const { data: favs } = await supabase
      .from("favorites")
      .select("product_id, created_at")
      .eq("user_id", session.userId)
      .order("created_at", { ascending: false });

    const ids = (favs || []).map((f) => f.product_id);
    if (ids.length === 0) return NextResponse.json({ favorites: [] });

    const { data: products } = await supabase
      .from("products")
      .select("id, slug, title_fr, cover_url, price_fcfa, promo_price_fcfa, is_free, primary_format")
      .in("id", ids);

    return NextResponse.json({
      favorites: (products || []).map((p) => ({
        id: p.id,
        slug: p.slug,
        titleFr: p.title_fr,
        coverUrl: p.cover_url,
        priceFcfa: p.price_fcfa,
        promoPriceFcfa: p.promo_price_fcfa,
        isFree: p.is_free,
        primaryFormat: p.primary_format,
      })),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Connectez-vous pour enregistrer un favori." }, { status: 401 });
  }

  const body = await req.json();
  const productId = String(body.productId || "");
  if (!productId) return NextResponse.json({ error: "productId requis" }, { status: 400 });

  const supabase = requireSupabaseAdmin();
  const { data: existing } = await supabase
    .from("favorites")
    .select("product_id")
    .eq("user_id", session.userId)
    .eq("product_id", productId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("favorites")
      .delete()
      .eq("user_id", session.userId)
      .eq("product_id", productId);
    return NextResponse.json({ favorited: false });
  }

  await supabase.from("favorites").insert({
    user_id: session.userId,
    product_id: productId,
    created_at: new Date().toISOString(),
  });
  return NextResponse.json({ favorited: true });
}
