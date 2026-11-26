import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSupabaseAdmin, newId } from "@/lib/supabase";
import { getCurrentSession, isAdminSession } from "@/lib/security/auth";
import { autoTranslateFrToEn } from "@/lib/services/translate";

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
      supabase.from("categories").select("id, slug, name_fr").order("sort_order", { ascending: true }),
    ]);

    const catById = new Map((cats || []).map((c) => [c.id, c.name_fr]));

    const formatted = (prods || []).map((p) => ({
      id: p.id,
      slug: p.slug,
      titleFr: p.title_fr,
      priceFcfa: p.price_fcfa,
      promoPriceFcfa: p.promo_price_fcfa,
      primaryFormat: p.primary_format,
      coverUrl: p.cover_url,
      isDemo: p.is_demo,
      isArchived: p.is_archived,
      isHiddenFromPublic: p.is_hidden_from_public,
      salesCount: p.sales_count,
      viewCount: p.view_count,
      category: { nameFr: catById.get(p.category_id) || "" },
    }));

    return NextResponse.json({
      products: formatted,
      categories: (cats || []).map((c) => ({ id: c.id, slug: c.slug, nameFr: c.name_fr })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Erreur lecture catalogue admin.", details: String(err) },
      { status: 500 }
    );
  }
}

const CreateProductSchema = z.object({
  titleFr: z.string().min(2, "Titre requis"),
  subtitleFr: z.string().optional(),
  shortDescFr: z.string().min(5, "Description requise"),
  categoryId: z.string().min(1, "Catégorie requise"),
  authorName: z.string().min(2, "Auteur requis"),
  priceFcfa: z.coerce.number().int().min(0),
  primaryFormat: z.string().default("PDF"),
  isDemo: z.boolean().default(false),
});

export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = CreateProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Données invalides." },
        { status: 400 }
      );
    }

    const supabase = requireSupabaseAdmin();
    const d = parsed.data;
    const now = new Date().toISOString();
    const slugBase = d.titleFr
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const slug = `${slugBase}-${crypto.randomBytes(2).toString("hex")}`;

    const authorSlug = d.authorName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    let { data: author } = await supabase
      .from("authors")
      .select("id")
      .eq("slug", authorSlug)
      .maybeSingle();

    if (!author) {
      const id = newId();
      await supabase.from("authors").insert({
        id,
        slug: authorSlug,
        name: d.authorName.trim(),
        created_at: now,
        updated_at: now,
      });
      author = { id };
    }

    const productId = newId();
    const [titleEn, subtitleEn, shortDescEn] = await Promise.all([
      autoTranslateFrToEn(d.titleFr),
      d.subtitleFr ? autoTranslateFrToEn(d.subtitleFr) : Promise.resolve(""),
      autoTranslateFrToEn(d.shortDescFr),
    ]);

    const { error } = await supabase.from("products").insert({
      id: productId,
      slug,
      title_fr: d.titleFr.trim(),
      title_en: titleEn || d.titleFr.trim(),
      subtitle_fr: d.subtitleFr?.trim() || null,
      subtitle_en: subtitleEn || null,
      short_desc_fr: d.shortDescFr.trim(),
      short_desc_en: shortDescEn || d.shortDescFr.trim(),
      long_desc_fr: d.shortDescFr.trim(),
      long_desc_en: shortDescEn || d.shortDescFr.trim(),
      summary_fr: "Sommaire à compléter.",
      summary_en: "Table of contents.",
      product_type: d.primaryFormat === "EPUB" ? "EBOOK_EPUB" : "EBOOK_PDF",
      primary_format: d.primaryFormat,
      language: "Français",
      cover_url: "/covers/fondements-des-sciences-occultes.svg",
      price_fcfa: d.priceFcfa,
      is_free: d.priceFcfa === 0,
      is_demo: d.isDemo,
      demo_notice: d.isDemo ? "PRODUIT DE DÉMONSTRATION — CONTENU NON COMMERCIAL" : null,
      is_archived: false,
      is_hidden_from_public: false,
      is_published: true,
      is_new_arrival: true,
      category_id: d.categoryId,
      author_id: author.id,
      created_at: now,
      updated_at: now,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase.from("audit_logs").insert({
      id: newId(),
      user_id: session!.userId,
      action: "PRODUCT_CREATED",
      entity_type: "Product",
      entity_id: productId,
      created_at: now,
    });

    return NextResponse.json({ ok: true, id: productId, slug });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
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
