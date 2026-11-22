import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSupabaseAdmin, newId } from "@/lib/supabase";
import { getCurrentSession, isAdminSession } from "@/lib/security/auth";

const AdminProductPatchSchema = z.object({
  productId: z.string().min(1),
  action: z.enum([
    "UPDATE",
    "ARCHIVE",
    "UNARCHIVE",
    "TOGGLE_HIDE",
    "DUPLICATE",
    "CONVERT_TO_COMMERCIAL",
  ]),
  titleFr: z.string().optional(),
  shortDescFr: z.string().optional(),
  priceFcfa: z.number().int().min(0).optional(),
  promoPriceFcfa: z.number().int().min(0).nullable().optional(),
  categoryId: z.string().optional(),
  coverUrl: z.string().optional(),
});

export async function GET() {
  const session = await getCurrentSession();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  try {
    const supabase = requireSupabaseAdmin();
    const [{ data: prods }, { data: cats }] = await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("categories").select("id, name_fr"),
    ]);

    const catById = new Map((cats || []).map((c) => [c.id, c.name_fr]));

    const formatted = (prods || []).map((p) => ({
      id: p.id,
      slug: p.slug,
      titleFr: p.title_fr,
      priceFcfa: p.price_fcfa,
      isDemo: p.is_demo,
      isArchived: p.is_archived,
      isHiddenFromPublic: p.is_hidden_from_public,
      salesCount: p.sales_count,
      viewCount: p.view_count,
      category: { nameFr: catById.get(p.category_id) || "" },
    }));

    return NextResponse.json({ products: formatted });
  } catch (err) {
    return NextResponse.json(
      { error: "Erreur lecture catalogue admin.", details: String(err) },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const session = await getCurrentSession();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = AdminProductPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
    }

    const supabase = requireSupabaseAdmin();
    const d = parsed.data;
    const { data: product } = await supabase
      .from("products")
      .select("*")
      .eq("id", d.productId)
      .maybeSingle();

    if (!product) {
      return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
    }

    const now = new Date().toISOString();

    if (d.action === "ARCHIVE") {
      await supabase
        .from("products")
        .update({ is_archived: true, is_published: false, updated_at: now })
        .eq("id", product.id);
    } else if (d.action === "UNARCHIVE") {
      await supabase
        .from("products")
        .update({ is_archived: false, is_published: true, updated_at: now })
        .eq("id", product.id);
    } else if (d.action === "TOGGLE_HIDE") {
      await supabase
        .from("products")
        .update({ is_hidden_from_public: !product.is_hidden_from_public, updated_at: now })
        .eq("id", product.id);
    } else if (d.action === "CONVERT_TO_COMMERCIAL") {
      await supabase
        .from("products")
        .update({ is_demo: false, demo_notice: null, updated_at: now })
        .eq("id", product.id);
    } else if (d.action === "DUPLICATE") {
      const suffix = crypto.randomBytes(2).toString("hex");
      const clone = {
        ...product,
        id: newId(),
        slug: `${product.slug}-copie-${suffix}`,
        title_fr: `${product.title_fr} (Copie)`,
        title_en: `${product.title_en} (Copy)`,
        created_at: now,
        updated_at: now,
      };
      await supabase.from("products").insert(clone);
    } else if (d.action === "UPDATE") {
      await supabase
        .from("products")
        .update({
          title_fr: d.titleFr ?? product.title_fr,
          short_desc_fr: d.shortDescFr ?? product.short_desc_fr,
          price_fcfa: d.priceFcfa ?? product.price_fcfa,
          promo_price_fcfa:
            d.promoPriceFcfa !== undefined ? d.promoPriceFcfa : product.promo_price_fcfa,
          category_id: d.categoryId ?? product.category_id,
          cover_url: d.coverUrl ?? product.cover_url,
          updated_at: now,
        })
        .eq("id", product.id);
    }

    await supabase.from("audit_logs").insert({
      id: newId(),
      user_id: session!.userId,
      action: `PRODUCT_${d.action}`,
      entity_type: "Product",
      entity_id: product.id,
      created_at: now,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Erreur mise à jour produit.", details: String(err) },
      { status: 500 }
    );
  }
}
