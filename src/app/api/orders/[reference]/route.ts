import { NextResponse } from "next/server";
import { requireSupabaseAdmin } from "@/lib/supabase";
import { getCurrentSession, isAdminSession } from "@/lib/security/auth";
import { decryptSecrets } from "@/lib/security/crypto";
import { getConnector } from "@/lib/services/payment/gateway-manager";
import { grantEntitlementsForOrder } from "@/lib/services/delivery/download-service";

export async function GET(
  _req: Request,
  context: { params: Promise<{ reference: string }> }
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  const { reference } = await context.params;
  try {
    const supabase = requireSupabaseAdmin();
    const { data: order } = await supabase
      .from("orders")
      .select("*")
      .eq("reference", reference)
      .maybeSingle();

    if (!order) {
      return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
    }

    if (order.user_id !== session.userId && !isAdminSession(session)) {
      return NextResponse.json({ error: "Accès refusé à cette commande." }, { status: 403 });
    }

    const [{ data: items }, { data: payments }] = await Promise.all([
      supabase.from("order_items").select("*").eq("order_id", order.id),
      supabase
        .from("payments")
        .select("*")
        .eq("order_id", order.id)
        .order("created_at", { ascending: false }),
    ]);

    const latestPayment = payments?.[0] || null;
    let currentOrderStatus = order.status;
    let currentPaidAt = order.paid_at;

    // Si la commande est en attente de paiement et qu'une référence externe existe, tenter une vérification serveur
    if (
      currentOrderStatus === "AWAITING_PAYMENT" &&
      latestPayment &&
      latestPayment.external_reference
    ) {
      const { data: gw } = await supabase
        .from("payment_gateways")
        .select("*")
        .eq("id", latestPayment.gateway_id)
        .maybeSingle();

      if (gw) {
        const connector = getConnector(gw.code);
        const verifyRes = await connector
          .verifyPayment(latestPayment.external_reference, {
            id: gw.id,
            code: gw.code,
            name: gw.name,
            isActive: gw.is_active,
            isDefault: gw.is_default,
            environment: gw.environment,
            apiBaseUrl: gw.api_base_url || "",
            webhookUrl: gw.webhook_url || "",
            supportedCurrencies: gw.supported_currencies || ["XOF"],
            supportedCountries: gw.supported_countries || ["BJ"],
            supportedOperators: gw.supported_operators || ["MTN"],
            feePercent: gw.fee_percent ?? 0,
            feeFixedFcfa: gw.fee_fixed_fcfa ?? 0,
            priority: gw.priority ?? 10,
            secrets: decryptSecrets(gw.encrypted_secrets),
          })
          .catch(() => null);

        if (verifyRes?.success && verifyRes.status === "SUCCEEDED") {
          const now = new Date().toISOString();
          await Promise.all([
            supabase
              .from("payments")
              .update({ status: "SUCCEEDED", verified_at: now, updated_at: now })
              .eq("id", latestPayment.id),
            supabase
              .from("orders")
              .update({ status: "PAID", paid_at: now, updated_at: now })
              .eq("id", order.id),
          ]);
          await grantEntitlementsForOrder(order.id);
          currentOrderStatus = "PAID";
          currentPaidAt = now;
        }
      }
    }

    return NextResponse.json({
      order: {
        id: order.id,
        reference: order.reference,
        status: currentOrderStatus,
        subtotalFcfa: order.subtotal_fcfa,
        discountFcfa: order.discount_fcfa,
        totalFcfa: order.total_fcfa,
        currency: order.currency,
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        paidAt: currentPaidAt,
        createdAt: order.created_at,
        gatewayCode: latestPayment?.gateway_code || null,
        items: (items || []).map((i) => ({
          id: i.id,
          titleSnapshot: i.title_snapshot,
          unitPriceFcfa: i.unit_price_fcfa,
          quantity: i.quantity,
        })),
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
