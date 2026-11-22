import React from "react";
import { getStorefrontData } from "@/lib/data/storefront";
import { HomeClient } from "@/components/home/HomeClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { categories, products, dbConnected } = await getStorefrontData();
  return <HomeClient categories={categories} products={products} dbConnected={dbConnected} />;
}
