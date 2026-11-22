import React from "react";
import { notFound } from "next/navigation";
import { getStorefrontData } from "@/lib/data/storefront";
import { CatalogView } from "@/components/catalog/CatalogView";

export const dynamic = "force-dynamic";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { categories, products } = await getStorefrontData();
  const exists = categories.some((c) => c.slug === slug);
  if (!exists) notFound();

  return (
    <CatalogView
      categories={categories}
      products={products}
      initialCategorySlug={slug}
    />
  );
}

