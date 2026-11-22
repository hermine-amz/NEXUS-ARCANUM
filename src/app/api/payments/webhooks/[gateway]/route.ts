import { NextResponse } from "next/server";
import { requireSupabaseAdmin, newId } from "@/lib/supabase";
import { decryptSecrets } from "@/lib/security/crypto";
import { getConnector } from "@/lib/services/payment/gateway-manager";
import { grantEntitlementsForOrder } from "@/lib/services/delivery/download-service";

export async function POST(
  req: Request,
  context: { params: Promise<{ gateway: string }> }
) {
  const { gateway: gatewayCode } = await context.params;
  const rawBody = await req.text();

  try {
    const supabase = requireSupabaseAdmin();
    const { data: gw } = await supabase
      .from("payment_gateways")
      .select("*")
      .eq("code", gatewayCode)
      .maybeSingle();

    if (!gw) {
      return NextResponse.json({ error: "Agrégateur inconnu" }, { status: 404 });
    }

    const connector = getConnector(gatewayCode);
    const parsed = await connector.parseWebhook(rawBody, req.headers, {
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
    });

    if (!parsed.validSignature) {
      return NextResponse.json({ error: "Signature webhook invalide" }, { status: 401 });
    }

    let payment = null;
    if (parsed.externalReference) {
      const { data } = await supabase
        .from("payments")
        .select("*")
        .eq("external_reference", parsed.externalReference)
        .maybeSingle();
      payment = data;
    }
    if (!payment && parsed.orderId) {
      const { data } = await supabase
        .from("payments")
        .select("*")
        .eq("order_id", parsed.orderId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      payment = data;
    }

    if (!payment) {
      return NextResponse.json({ error: "Paiement introuvable" }, { status: 404 });
    }

    const now = new Date().toISOString();
    const amountMismatch =
      typeof parsed.amountFcfa === "number" && parsed.amountFcfa !== payment.amount_fcfa;
    const currencyMismatch =
      parsed.currency && parsed.currency.toUpperCase() !== String(payment.currency).toUpperCase();

    if (amountMismatch || currencyMismatch) {
      await supabase.from("payment_transactions").insert({
        id: newId(),
        payment_id: payment.id,
        gateway_id: gw.id,
        event_type: "WEBHOOK_MISMATCH",
        status: "REJECTED",
        external_tx_id: parsed.externalReference ?? null,
        raw_payload: (parsed.rawPayload ?? {}) as object,
        signature_valid: parsed.validSignature,
        error_message: "Incohérence montant ou devise détectée",
        created_at: now,
      });
      return NextResponse.json({ error: "Incohérence montant/devise" }, { status: 400 });
    }

    await supabase.from("payment_transactions").insert({
      id: newId(),
      payment_id: payment.id,
      gateway_id: gw.id,
      event_type: "WEBHOOK",
      status: parsed.status,
      external_tx_id: parsed.externalReference ?? null,
      raw_payload: (parsed.rawPayload ?? {}) as object,
      signature_valid: parsed.validSignature,
      created_at: now,
    });

    if (parsed.status === "SUCCEEDED" && payment.status !== "SUCCEEDED") {
      await Promise.all([
        supabase
          .from("payments")
          .update({ status: "SUCCEEDED", verified_at: now, updated_at: now })
          .eq("id", payment.id),
        supabase
          .from("orders")
          .update({ status: "PAID", paid_at: now, updated_at: now })
          .eq("id", payment.order_id),
      ]);
      await grantEntitlementsForOrder(payment.order_id);
    } else if (parsed.status === "FAILED" || parsed.status === "CANCELLED") {
      await supabase
        .from("payments")
        .update({ status: parsed.status, updated_at: now })
        .eq("id", payment.id);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Erreur traitement webhook", details: String(err) },
      { status: 500 }
    );
  }
}
