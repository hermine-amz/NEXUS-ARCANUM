import React from "react";
import { ProductManageClient } from "@/components/admin/ProductManageClient";

export const dynamic = "force-dynamic";

export default async function AdminProductManagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProductManageClient productId={id} />;
}
