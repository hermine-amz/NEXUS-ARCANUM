import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/data/storefront";
import { ProductDetailClient } from "@/components/catalog/ProductDetailClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { product } = await getProductBySlug(slug);
  if (!product) return { title: "Produit introuvable — NEXUSARCANUM SHOP" };
  return {
    title: `${product.titleFr} — NEXUSARCANUM SHOP`,
    description: product.shortDescFr,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { product, similar } = await getProductBySlug(slug);
  if (!product) notFound();

  return <ProductDetailClient product={product} similar={similar} />;
}

