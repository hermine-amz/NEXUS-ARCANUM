import { NextResponse } from "next/server";
import { requireSupabaseAdmin } from "@/lib/supabase";
import { getCurrentSession, isAdminSession } from "@/lib/security/auth";

export async function GET() {
  const session = await getCurrentSession();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  try {
    const supabase = requireSupabaseAdmin();
    const [{ data: orders }, { data: users }] = await Promise.all([
      supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("users")
        .select("id, first_name, last_name, email, country, created_at")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    const orderIds = (orders || []).map((o) => o.id);
    const [{ data: items }, { data: payments }] = orderIds.length
      ? await Promise.all([
          supabase.from("order_items").select("*").in("order_id", orderIds),
          supabase
            .from("payments")
            .select("order_id, gateway_code, status, external_reference")
            .in("order_id", orderIds)
            .order("created_at", { ascending: false }),
        ])
      : [{ data: [] }, { data: [] }];

    return NextResponse.json({
      orders: (orders || []).map((o) => {
        const latestPay = (payments || []).find((p) => p.order_id === o.id);
        return {
          id: o.id,
          reference: o.reference,
          customerName: o.customer_name,
          customerEmail: o.customer_email,
          customerPhone: o.customer_phone || "",
          subtotalFcfa: o.subtotal_fcfa,
          discountFcfa: o.discount_fcfa,
          totalFcfa: o.total_fcfa,
          status: o.status,
          isDemoOrder: o.is_demo_order,
          gatewayCode: latestPay?.gateway_code || null,
          paymentStatus: latestPay?.status || null,
          createdAt: o.created_at,
          items: (items || [])
            .filter((i) => i.order_id === o.id)
            .map((i) => ({
              id: i.id,
              titleSnapshot: i.title_snapshot,
              unitPriceFcfa: i.unit_price_fcfa,
            })),
        };
      }),
      clients: (users || []).map((u) => ({
        id: u.id,
        name: `${u.first_name} ${u.last_name}`.trim(),
        email: u.email,
        country: u.country || "BJ",
        createdAt: u.created_at,
      })),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
