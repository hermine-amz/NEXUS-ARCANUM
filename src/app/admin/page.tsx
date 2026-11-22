import React from "react";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { AdminClient } from "@/components/admin/AdminClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  let stats = {
    dbConnected: false,
    totalRevenueFcfa: 0,
    totalOrders: 0,
    totalUsers: 0,
    totalProducts: 32,
    succeededPayments: 0,
    failedPayments: 0,
    pendingPayments: 0,
  };

  const supabase = getSupabaseAdminClient();
  if (supabase) {
    try {
      const [
        paidOrdersRes,
        ordersCount,
        usersCount,
        productsCount,
        succeededRes,
        failedRes,
        pendingRes,
      ] = await Promise.all([
        supabase.from("orders").select("total_fcfa").eq("status", "PAID"),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("users").select("id", { count: "exact", head: true }),
        supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("is_archived", false),
        supabase
          .from("payments")
          .select("id", { count: "exact", head: true })
          .eq("status", "SUCCEEDED"),
        supabase
          .from("payments")
          .select("id", { count: "exact", head: true })
          .eq("status", "FAILED"),
        supabase
          .from("payments")
          .select("id", { count: "exact", head: true })
          .eq("status", "PENDING"),
      ]);

      if (!ordersCount.error) {
        const totalRevenueFcfa = (paidOrdersRes.data || []).reduce(
          (sum, row) => sum + (row.total_fcfa || 0),
          0
        );
        stats = {
          dbConnected: true,
          totalRevenueFcfa,
          totalOrders: ordersCount.count ?? 0,
          totalUsers: usersCount.count ?? 0,
          totalProducts: productsCount.count ?? 0,
          succeededPayments: succeededRes.count ?? 0,
          failedPayments: failedRes.count ?? 0,
          pendingPayments: pendingRes.count ?? 0,
        };
      }
    } catch {
      // Supabase non joignable
    }
  }

  return <AdminClient stats={stats} />;
}
