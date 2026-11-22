import { getSupabaseAdminClient } from "@/lib/supabase";
import { DEMO_CATEGORIES, DEMO_PRODUCTS } from "./demo-catalog";

export interface StorefrontCategory {
  id: string;
  slug: string;
  nameFr: string;
  nameEn: string;
  descriptionFr: string | null;
  descriptionEn: string | null;
  icon: string | null;
  sortOrder: number;
  productCount: number;
}

export interface StorefrontProduct {
  id: string;
  slug: string;
  titleFr: string;
  titleEn: string;
  subtitleFr: string | null;
  subtitleEn: string | null;
  shortDescFr: string;
  shortDescEn: string;
  longDescFr: string;
  longDescEn: string;
  summaryFr: string;
  summaryEn: string;
  primaryFormat: string;
  pageCount: number | null;
  language: string;
  isbn: string | null;
  coverUrl: string;
  priceFcfa: number;
  promoPriceFcfa: number | null;
  isFree: boolean;
  isDemo: boolean;
  demoNotice: string | null;
  isNewArrival: boolean;
  isBestseller: boolean;
  isRecommended: boolean;
  collectionTag: string | null;
  categorySlug: string;
  categoryNameFr: string;
  categoryNameEn: string;
  authorName: string;
  publisherName: string;
  extractUrl: string;
  avgRating: number;
  reviewCount: number;
}

function mapDemoFallback(): {
  categories: StorefrontCategory[];
  products: StorefrontProduct[];
} {
  const catMap = new Map(DEMO_CATEGORIES.map((c) => [c.slug, c]));
  const categories: StorefrontCategory[] = DEMO_CATEGORIES.map((c, idx) => ({
    id: `demo-cat-${idx + 1}`,
    slug: c.slug,
    nameFr: c.nameFr,
    nameEn: c.nameEn,
    descriptionFr: c.descriptionFr,
    descriptionEn: c.descriptionEn,
    icon: c.icon,
    sortOrder: c.sortOrder,
    productCount: DEMO_PRODUCTS.filter((p) => p.categorySlug === c.slug).length,
  }));

  const products: StorefrontProduct[] = DEMO_PRODUCTS.map((p, idx) => {
    const cat = catMap.get(p.categorySlug)!;
    return {
      id: `demo-prod-${idx + 1}`,
      slug: p.slug,
      titleFr: p.titleFr,
      titleEn: p.titleEn,
      subtitleFr: p.subtitleFr,
      subtitleEn: p.subtitleEn,
      shortDescFr: p.shortDescFr,
      shortDescEn: p.shortDescEn,
      longDescFr: p.longDescFr,
      longDescEn: p.longDescEn,
      summaryFr: p.summaryFr,
      summaryEn: p.summaryEn,
      primaryFormat: p.primaryFormat,
      pageCount: p.pageCount,
      language: p.language,
      isbn: null,
      coverUrl: `/covers/${p.slug}.svg`,
      priceFcfa: p.priceFcfa,
      promoPriceFcfa: p.promoPriceFcfa ?? null,
      isFree: Boolean(p.isFree),
      isDemo: true,
      demoNotice: "PRODUIT DE DÉMONSTRATION — CONTENU NON COMMERCIAL",
      isNewArrival: Boolean(p.isNewArrival),
      isBestseller: Boolean(p.isBestseller),
      isRecommended: Boolean(p.isRecommended),
      collectionTag: p.collectionTag ?? null,
      categorySlug: cat.slug,
      categoryNameFr: cat.nameFr,
      categoryNameEn: cat.nameEn,
      authorName: p.authorName,
      publisherName: p.publisherName,
      extractUrl: `/demo-extracts/${p.slug}-extrait.pdf`,
      avgRating: 4.8,
      reviewCount: 12 + (idx % 15),
    };
  });

  return { categories, products };
}

export async function getStorefrontData(): Promise<{
  dbConnected: boolean;
  categories: StorefrontCategory[];
  products: StorefrontProduct[];
}> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { dbConnected: false, ...mapDemoFallback() };
  }

  try {
    const [catsRes, prodsRes, authorsRes, pubsRes, assetsRes, reviewsRes] = await Promise.all([
      supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .is("parent_id", null)
        .order("sort_order", { ascending: true }),
      supabase
        .from("products")
        .select("*")
        .eq("is_published", true)
        .eq("is_archived", false)
        .eq("is_hidden_from_public", false)
        .order("created_at", { ascending: false }),
      supabase.from("authors").select("id, name"),
      supabase.from("publishers").select("id, name"),
      supabase
        .from("digital_assets")
        .select("product_id, storage_path")
        .eq("asset_kind", "FREE_EXTRACT"),
      supabase.from("reviews").select("product_id, rating").eq("is_approved", true),
    ]);

    if (catsRes.error || prodsRes.error) {
      return { dbConnected: false, ...mapDemoFallback() };
    }

    const dbCats = catsRes.data || [];
    const dbProds = prodsRes.data || [];

    if (dbCats.length === 0 && dbProds.length === 0) {
      return { dbConnected: true, ...mapDemoFallback() };
    }

    const catById = new Map(dbCats.map((c) => [c.id, c]));
    const authorById = new Map((authorsRes.data || []).map((a) => [a.id, a.name]));
    const pubById = new Map((pubsRes.data || []).map((p) => [p.id, p.name]));
    const extractByProd = new Map(
      (assetsRes.data || []).map((a) => [a.product_id, a.storage_path])
    );

    const reviewsByProd = new Map<string, number[]>();
    for (const r of reviewsRes.data || []) {
      const arr = reviewsByProd.get(r.product_id) || [];
      arr.push(r.rating);
      reviewsByProd.set(r.product_id, arr);
    }

    const countByCat = new Map<string, number>();
    for (const p of dbProds) {
      countByCat.set(p.category_id, (countByCat.get(p.category_id) || 0) + 1);
    }

    const categories: StorefrontCategory[] = dbCats.map((c) => ({
      id: c.id,
      slug: c.slug,
      nameFr: c.name_fr,
      nameEn: c.name_en,
      descriptionFr: c.description_fr,
      descriptionEn: c.description_en,
      icon: c.icon,
      sortOrder: c.sort_order,
      productCount: countByCat.get(c.id) || 0,
    }));

    const products: StorefrontProduct[] = dbProds.map((p) => {
      const cat = catById.get(p.category_id);
      const ratings = reviewsByProd.get(p.id) || [];
      const avgRating =
        ratings.length > 0
          ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1))
          : 4.8;

      return {
        id: p.id,
        slug: p.slug,
        titleFr: p.title_fr,
        titleEn: p.title_en,
        subtitleFr: p.subtitle_fr,
        subtitleEn: p.subtitle_en,
        shortDescFr: p.short_desc_fr,
        shortDescEn: p.short_desc_en,
        longDescFr: p.long_desc_fr,
        longDescEn: p.long_desc_en,
        summaryFr: p.summary_fr,
        summaryEn: p.summary_en,
        primaryFormat: p.primary_format,
        pageCount: p.page_count,
        language: p.language,
        isbn: p.isbn,
        coverUrl: p.cover_url,
        priceFcfa: p.price_fcfa,
        promoPriceFcfa: p.promo_price_fcfa,
        isFree: p.is_free,
        isDemo: p.is_demo,
        demoNotice: p.demo_notice,
        isNewArrival: p.is_new_arrival,
        isBestseller: p.is_bestseller,
        isRecommended: p.is_recommended,
        collectionTag: p.collection_tag,
        categorySlug: cat?.slug || "",
        categoryNameFr: cat?.name_fr || "",
        categoryNameEn: cat?.name_en || "",
        authorName: authorById.get(p.author_id) || "Auteur",
        publisherName: (p.publisher_id && pubById.get(p.publisher_id)) || "NEXUSARCANUM",
        extractUrl: extractByProd.get(p.id) || `/demo-extracts/${p.slug}-extrait.pdf`,
        avgRating,
        reviewCount: ratings.length,
      };
    });

    return { dbConnected: true, categories, products };
  } catch {
    return { dbConnected: false, ...mapDemoFallback() };
  }
}

export async function getProductBySlug(slug: string): Promise<{
  dbConnected: boolean;
  product: StorefrontProduct | null;
  similar: StorefrontProduct[];
}> {
  const { dbConnected, products } = await getStorefrontData();
  const product = products.find((p) => p.slug === slug) ?? null;
  const similar = product
    ? products
        .filter((p) => p.categorySlug === product.categorySlug && p.slug !== product.slug)
        .slice(0, 4)
    : [];
  return { dbConnected, product, similar };
}
