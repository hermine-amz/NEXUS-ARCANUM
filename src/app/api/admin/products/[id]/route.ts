import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSupabaseAdmin, newId } from "@/lib/supabase";
import { getCurrentSession, isAdminSession } from "@/lib/security/auth";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  const { id } = await context.params;
  try {
    const supabase = requireSupabaseAdmin();
    const [
      { data: product, error },
      { data: assets },
      { data: categories },
      { data: authors },
      { data: publishers },
    ] = await Promise.all([
      supabase.from("products").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("digital_assets")
        .select("*")
        .eq("product_id", id)
        .order("asset_kind", { ascending: true }),
      supabase.from("categories").select("id, slug, name_fr").order("sort_order", { ascending: true }),
      supabase.from("authors").select("id, name").order("name", { ascending: true }),
      supabase.from("publishers").select("id, name").order("name", { ascending: true }),
    ]);

    if (error || !product) {
      return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
    }

    return NextResponse.json({
      product: {
        id: product.id,
        slug: product.slug,
        titleFr: product.title_fr,
        titleEn: product.title_en,
        subtitleFr: product.subtitle_fr || "",
        subtitleEn: product.subtitle_en || "",
        shortDescFr: product.short_desc_fr,
        shortDescEn: product.short_desc_en,
        longDescFr: product.long_desc_fr,
        longDescEn: product.long_desc_en,
        summaryFr: product.summary_fr,
        summaryEn: product.summary_en,
        productType: product.product_type,
        primaryFormat: product.primary_format,
        pageCount: product.page_count,
        language: product.language,
        isbn: product.isbn || "",
        coverUrl: product.cover_url,
        priceFcfa: product.price_fcfa,
        promoPriceFcfa: product.promo_price_fcfa,
        isFree: product.is_free,
        isDemo: product.is_demo,
        demoNotice: product.demo_notice || "",
        isArchived: product.is_archived,
        isHiddenFromPublic: product.is_hidden_from_public,
        isPublished: product.is_published,
        isNewArrival: product.is_new_arrival,
        isBestseller: product.is_bestseller,
        isRecommended: product.is_recommended,
        collectionTag: product.collection_tag || "",
        maxDownloads: product.max_downloads,
        watermarkEnabled: product.watermark_enabled,
        categoryId: product.category_id,
        authorId: product.author_id,
        publisherId: product.publisher_id || "",
        viewCount: product.view_count,
        salesCount: product.sales_count,
      },
      assets: (assets || []).map((a) => ({
        id: a.id,
        assetKind: a.asset_kind,
        format: a.format,
        fileName: a.file_name,
        storagePath: a.storage_path,
        mimeType: a.mime_type,
        fileSizeBytes: a.file_size_bytes,
        isPrivate: a.is_private,
      })),
      categories: (categories || []).map((c) => ({ id: c.id, slug: c.slug, nameFr: c.name_fr })),
      authors: authors || [],
      publishers: publishers || [],
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

const FullUpdateSchema = z.object({
  titleFr: z.string().min(2),
  titleEn: z.string().min(2),
  subtitleFr: z.string().optional(),
  subtitleEn: z.string().optional(),
  shortDescFr: z.string().min(2),
  shortDescEn: z.string().min(2),
  longDescFr: z.string().min(2),
  longDescEn: z.string().min(2),
  summaryFr: z.string().optional(),
  summaryEn: z.string().optional(),
  primaryFormat: z.string().min(1),
  productType: z.string().min(1),
  pageCount: z.coerce.number().int().positive().nullable().optional(),
  language: z.string().min(1),
  isbn: z.string().optional(),
  coverUrl: z.string().min(1),
  priceFcfa: z.coerce.number().int().min(0),
  promoPriceFcfa: z.coerce.number().int().min(0).nullable().optional(),
  isFree: z.boolean(),
  isDemo: z.boolean(),
  demoNotice: z.string().optional(),
  isArchived: z.boolean(),
  isHiddenFromPublic: z.boolean(),
  isPublished: z.boolean(),
  isNewArrival: z.boolean(),
  isBestseller: z.boolean(),
  isRecommended: z.boolean(),
  collectionTag: z.string().optional(),
  maxDownloads: z.coerce.number().int().min(1).max(100),
  watermarkEnabled: z.boolean(),
  categoryId: z.string().min(1),
  authorId: z.string().min(1),
  publisherId: z.string().optional(),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  const { id } = await context.params;
  try {
    const body = await req.json();
    const parsed = FullUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Champs invalides." },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const supabase = requireSupabaseAdmin();
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("products")
      .update({
        title_fr: d.titleFr.trim(),
        title_en: d.titleEn.trim(),
        subtitle_fr: d.subtitleFr?.trim() || null,
        subtitle_en: d.subtitleEn?.trim() || null,
        short_desc_fr: d.shortDescFr.trim(),
        short_desc_en: d.shortDescEn.trim(),
        long_desc_fr: d.longDescFr.trim(),
        long_desc_en: d.longDescEn.trim(),
        summary_fr: d.summaryFr?.trim() || "",
        summary_en: d.summaryEn?.trim() || "",
        primary_format: d.primaryFormat.toUpperCase(),
        product_type: d.productType,
        page_count: d.pageCount ?? null,
        language: d.language.trim(),
        isbn: d.isbn?.trim() || null,
        cover_url: d.coverUrl.trim(),
        price_fcfa: d.priceFcfa,
        promo_price_fcfa: d.promoPriceFcfa ?? null,
        is_free: d.isFree,
        is_demo: d.isDemo,
        demo_notice: d.isDemo
          ? d.demoNotice?.trim() || "PRODUIT DE DÉMONSTRATION — CONTENU NON COMMERCIAL"
          : null,
        is_archived: d.isArchived,
        is_hidden_from_public: d.isHiddenFromPublic,
        is_published: d.isPublished,
        is_new_arrival: d.isNewArrival,
        is_bestseller: d.isBestseller,
        is_recommended: d.isRecommended,
        collection_tag: d.collectionTag?.trim() || null,
        max_downloads: d.maxDownloads,
        watermark_enabled: d.watermarkEnabled,
        category_id: d.categoryId,
        author_id: d.authorId,
        publisher_id: d.publisherId || null,
        updated_at: now,
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase.from("audit_logs").insert({
      id: newId(),
      user_id: session!.userId,
      action: "PRODUCT_FULL_UPDATE",
      entity_type: "Product",
      entity_id: id,
      created_at: now,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  const { id } = await context.params;
  try {
    const supabase = requireSupabaseAdmin();
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    await supabase.from("audit_logs").insert({
      id: newId(),
      user_id: session!.userId,
      action: "PRODUCT_DELETED",
      entity_type: "Product",
      entity_id: id,
      created_at: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
