import React from "react";
import { getStorefrontData } from "@/lib/data/storefront";
import { CatalogView } from "@/components/catalog/CatalogView";

export const dynamic = "force-dynamic";

export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; category?: string }>;
}) {
  const sp = await searchParams;
  const { categories, products } = await getStorefrontData();

  return (
    <CatalogView
      categories={categories}
      products={products}
      initialQuery={sp.q ?? ""}
      initialFilter={sp.filter ?? ""}
      initialCategorySlug={sp.category ?? ""}
    />
  );
}

