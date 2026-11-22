import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSupabaseAdmin, newId } from "@/lib/supabase";
import { getCurrentSession } from "@/lib/security/auth";
import { grantEntitlementsForOrder } from "@/lib/services/delivery/download-service";

const CreateOrderSchema = z.object({
  productIds: z.array(z.string().min(1)).min(1, "Panier vide"),
  couponCode: z.string().optional(),
  customerPhone: z.string().optional(),
  customerCountry: z.string().default("BJ"),
  idempotencyKey: z.string().optional(),
});

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  try {
    const supabase = requireSupabaseAdmin();
    const { data: orders } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", session.userId)
      .order("created_at", { ascending: false });

    const orderIds = (orders || []).map((o) => o.id);
    const [{ data: items }, { data: payments }] = orderIds.length
      ? await Promise.all([
          supabase.from("order_items").select("*").in("order_id", orderIds),
          supabase
            .from("payments")
            .select("order_id, gateway_code, status, created_at")
            .in("order_id", orderIds)
            .order("created_at", { ascending: false }),
        ])
      : [{ data: [] }, { data: [] }];

    const formatted = (orders || []).map((o) => ({
      id: o.id,
      reference: o.reference,
      totalFcfa: o.total_fcfa,
      status: o.status,
      createdAt: o.created_at,
      items: (items || [])
        .filter((i) => i.order_id === o.id)
        .map((i) => ({
          id: i.id,
          titleSnapshot: i.title_snapshot,
          unitPriceFcfa: i.unit_price_fcfa,
        })),
      payments: (payments || [])
        .filter((p) => p.order_id === o.id)
        .slice(0, 1)
        .map((p) => ({ gatewayCode: p.gateway_code, status: p.status })),
    }));

    return NextResponse.json({ orders: formatted });
  } catch (err) {
    return NextResponse.json(
      { error: "Erreur lecture des commandes.", details: String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json(
      { error: "Veuillez vous connecter pour valider votre commande." },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const parsed = CreateOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Données de commande invalides." },
        { status: 400 }
      );
    }

    const supabase = requireSupabaseAdmin();

    if (parsed.data.idempotencyKey) {
      const { data: existing } = await supabase
        .from("orders")
        .select("*")
        .eq("idempotency_key", parsed.data.idempotencyKey)
        .maybeSingle();
      if (existing) {
        return NextResponse.json({
          order: { id: existing.id, reference: existing.reference, totalFcfa: existing.total_fcfa },
          deduplicated: true,
        });
      }
    }

    const { data: products } = await supabase
      .from("products")
      .select("*")
      .in("id", parsed.data.productIds)
      .eq("is_published", true)
      .eq("is_archived", false);

    if (!products || products.length === 0) {
      return NextResponse.json({ error: "Aucun produit valide sélectionné." }, { status: 400 });
    }

    let subtotalFcfa = 0;
    let isDemoOrder = false;

    const orderId = newId();
    const orderItemsData = products.map((p) => {
      const unitPrice = p.is_free ? 0 : p.promo_price_fcfa ?? p.price_fcfa;
      subtotalFcfa += unitPrice;
      if (p.is_demo) isDemoOrder = true;
      return {
        id: newId(),
        order_id: orderId,
        product_id: p.id,
        title_snapshot: p.title_fr,
        unit_price_fcfa: unitPrice,
        quantity: 1,
        is_demo: p.is_demo,
      };
    });

    let discountFcfa = 0;
    let couponId: string | null = null;
    if (parsed.data.couponCode) {
      const { data: coupon } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", parsed.data.couponCode.trim().toUpperCase())
        .maybeSingle();
      if (coupon && coupon.is_active && subtotalFcfa >= coupon.min_order_fcfa) {
        couponId = coupon.id;
        discountFcfa =
          coupon.discount_type === "PERCENTAGE"
            ? Math.round((subtotalFcfa * coupon.discount_value) / 100)
            : Math.min(subtotalFcfa, coupon.discount_value);
      }
    }

    const totalFcfa = Math.max(0, subtotalFcfa - discountFcfa);
    const reference = `NXA-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${crypto
      .randomBytes(3)
      .toString("hex")
      .toUpperCase()}`;

    const isZeroFcfa = totalFcfa === 0;
    const now = new Date().toISOString();

    const { error: orderErr } = await supabase.from("orders").insert({
      id: orderId,
      reference,
      user_id: session.userId,
      coupon_id: couponId,
      subtotal_fcfa: subtotalFcfa,
      discount_fcfa: discountFcfa,
      total_fcfa: totalFcfa,
      currency: "XOF",
      status: isZeroFcfa ? "PAID" : "PENDING",
      is_demo_order: isDemoOrder,
      idempotency_key: parsed.data.idempotencyKey || crypto.randomUUID(),
      customer_email: session.email,
      customer_name: `${session.firstName} ${session.lastName}`.trim(),
      customer_phone: parsed.data.customerPhone ?? null,
      customer_country: parsed.data.customerCountry,
      paid_at: isZeroFcfa ? now : null,
      created_at: now,
      updated_at: now,
    });

    if (orderErr) {
      return NextResponse.json(
        { error: "Erreur création de commande.", details: orderErr.message },
        { status: 500 }
      );
    }

    await supabase.from("order_items").insert(orderItemsData);

    if (isZeroFcfa) {
      await grantEntitlementsForOrder(orderId);
    }

    return NextResponse.json({
      order: { id: orderId, reference, totalFcfa, status: isZeroFcfa ? "PAID" : "PENDING" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Erreur création de commande.", details: String(err) },
      { status: 500 }
    );
  }
}
