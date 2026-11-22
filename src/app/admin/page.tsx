import React from "react";
import { prisma } from "@/lib/prisma";
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

  try {
    const [ordersAgg, totalOrders, totalUsers, totalProducts, succeededPayments, failedPayments, pendingPayments] =
      await Promise.all([
        prisma.order.aggregate({
          where: { status: "PAID" },
          _sum: { totalFcfa: true },
        }),
        prisma.order.count(),
        prisma.user.count(),
        prisma.product.count({ where: { isArchived: false } }),
        prisma.payment.count({ where: { status: "SUCCEEDED" } }),
        prisma.payment.count({ where: { status: "FAILED" } }),
        prisma.payment.count({ where: { status: "PENDING" } }),
      ]);

    stats = {
      dbConnected: true,
      totalRevenueFcfa: ordersAgg._sum.totalFcfa ?? 0,
      totalOrders,
      totalUsers,
      totalProducts,
      succeededPayments,
      failedPayments,
      pendingPayments,
    };
  } catch {
    // DB non connectée
  }

  return <AdminClient stats={stats} />;
}

