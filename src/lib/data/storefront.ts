import { prisma } from "@/lib/prisma";
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
  try {
    const [dbCats, dbProds] = await Promise.all([
      prisma.category.findMany({
        where: { isActive: true, parentId: null },
        orderBy: { sortOrder: "asc" },
        include: {
          _count: {
            select: {
              products: {
                where: { isPublished: true, isArchived: false, isHiddenFromPublic: false },
              },
            },
          },
        },
      }),
      prisma.product.findMany({
        where: { isPublished: true, isArchived: false, isHiddenFromPublic: false },
        include: {
          category: true,
          author: true,
          publisher: true,
          assets: { where: { assetKind: "FREE_EXTRACT" } },
          reviews: { where: { isApproved: true }, select: { rating: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    if (dbCats.length === 0 && dbProds.length === 0) {
      return { dbConnected: true, ...mapDemoFallback() };
    }

    const categories: StorefrontCategory[] = dbCats.map((c) => ({
      id: c.id,
      slug: c.slug,
      nameFr: c.nameFr,
      nameEn: c.nameEn,
      descriptionFr: c.descriptionFr,
      descriptionEn: c.descriptionEn,
      icon: c.icon,
      sortOrder: c.sortOrder,
      productCount: c._count.products,
    }));

    const products: StorefrontProduct[] = dbProds.map((p) => {
      const ratings = p.reviews.map((r) => r.rating);
      const avgRating =
        ratings.length > 0
          ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1))
          : 4.8;
      return {
        id: p.id,
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
        isbn: p.isbn,
        coverUrl: p.coverUrl,
        priceFcfa: p.priceFcfa,
        promoPriceFcfa: p.promoPriceFcfa,
        isFree: p.isFree,
        isDemo: p.isDemo,
        demoNotice: p.demoNotice,
        isNewArrival: p.isNewArrival,
        isBestseller: p.isBestseller,
        isRecommended: p.isRecommended,
        collectionTag: p.collectionTag,
        categorySlug: p.category.slug,
        categoryNameFr: p.category.nameFr,
        categoryNameEn: p.category.nameEn,
        authorName: p.author.name,
        publisherName: p.publisher?.name ?? "NEXUSARCANUM",
        extractUrl: p.assets[0]?.storagePath ?? `/demo-extracts/${p.slug}-extrait.pdf`,
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

