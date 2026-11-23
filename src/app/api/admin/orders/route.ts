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
        .select("id, reference, customer_name, customer_email, total_fcfa, status, is_demo_order, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("users")
        .select("id, first_name, last_name, email, country, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    return NextResponse.json({
      orders: (orders || []).map((o) => ({
        id: o.id,
        reference: o.reference,
        customerName: o.customer_name,
        customerEmail: o.customer_email,
        totalFcfa: o.total_fcfa,
        status: o.status,
        isDemoOrder: o.is_demo_order,
        createdAt: o.created_at,
      })),
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
