import crypto from "crypto";
import { requireSupabaseAdmin, newId } from "@/lib/supabase";
import { decryptSecrets } from "@/lib/security/crypto";
import {
  GatewayRuntimeConfig,
  IPaymentGateway,
  PaymentInitInput,
  RoutingMode,
} from "./types";
import { MaketouConnector } from "./connectors/maketou";
import { SebPayConnector } from "./connectors/sebpay";
import { ConfigurableExternalConnector } from "./connectors/placeholder";

const CONNECTOR_REGISTRY: Record<string, IPaymentGateway> = {
  maketou: new MaketouConnector(),
  sebpay: new SebPayConnector(),
  saaspay: new ConfigurableExternalConnector(
    "saaspay",
    "SaaSPay nécessite la confirmation de la documentation API officielle et de vos clés."
  ),
  geneci: new ConfigurableExternalConnector(
    "geneci",
    "Geneci.ci est en attente de documentation API officielle."
  ),
};

export function getConnector(code: string): IPaymentGateway {
  return (
    CONNECTOR_REGISTRY[code] ??
    new ConfigurableExternalConnector(code, `Aucun adaptateur implémenté pour ${code}.`)
  );
}

export async function getRoutingMode(): Promise<RoutingMode> {
  const supabase = requireSupabaseAdmin();
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "payment_routing_mode")
    .maybeSingle();

  if (data?.value === "MODE_A" || data?.value === "MODE_B" || data?.value === "MODE_C") {
    return data.value;
  }
  return "MODE_B";
}

export async function getActiveGateways(): Promise<GatewayRuntimeConfig[]> {
  const supabase = requireSupabaseAdmin();
  const { data: rows } = await supabase
    .from("payment_gateways")
    .select("*")
    .eq("is_active", true)
    .order("is_default", { ascending: false })
    .order("priority", { ascending: true });

  return (rows || []).map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    isActive: row.is_active,
    isDefault: row.is_default,
    environment: row.environment,
    apiBaseUrl: row.api_base_url || "",
    webhookUrl: row.webhook_url || "",
    supportedCurrencies: row.supported_currencies || ["XOF"],
    supportedCountries: row.supported_countries || ["BJ"],
    supportedOperators: row.supported_operators || ["MTN"],
    feePercent: row.fee_percent ?? 0,
    feeFixedFcfa: row.fee_fixed_fcfa ?? 0,
    priority: row.priority ?? 10,
    secrets: decryptSecrets(row.encrypted_secrets),
  }));
}

export async function selectGateway(params: {
  requestedGatewayCode?: string;
  country?: string;
  currency?: string;
  operator?: string;
}): Promise<GatewayRuntimeConfig | null> {
  const mode = await getRoutingMode();
  const active = await getActiveGateways();
  if (active.length === 0) return null;

  if (mode === "MODE_A") {
    return active.find((g) => g.isDefault) ?? active[0];
  }

  if (mode === "MODE_B" && params.requestedGatewayCode) {
    const found = active.find((g) => g.code === params.requestedGatewayCode);
    if (found) return found;
  }

  if (mode === "MODE_C") {
    const country = (params.country || "BJ").toUpperCase();
    const currency = (params.currency || "XOF").toUpperCase();
    const operator = (params.operator || "").toUpperCase();

    const candidates = active.filter(
      (g) =>
        g.supportedCurrencies.includes(currency) &&
        g.supportedCountries.includes(country) &&
        (!operator || g.supportedOperators.includes(operator))
    );

    const pool = candidates.length > 0 ? candidates : active;
    return [...pool].sort((a, b) => {
      if (a.feePercent !== b.feePercent) return a.feePercent - b.feePercent;
      return a.priority - b.priority;
    })[0];
  }

  return active.find((g) => g.isDefault) ?? active[0];
}

export async function initiateOrderPayment(params: {
  orderId: string;
  gatewayCode?: string;
  operator?: string;
  baseUrl: string;
}) {
  const supabase = requireSupabaseAdmin();

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", params.orderId)
    .maybeSingle();

  if (!order) {
    return { ok: false, error: "Commande introuvable." };
  }

  const [{ data: items }, { data: payments }] = await Promise.all([
    supabase.from("order_items").select("*").eq("order_id", order.id),
    supabase.from("payments").select("*").eq("order_id", order.id),
  ]);

  if (order.is_demo_order || (items || []).some((item) => item.is_demo)) {
    return {
      ok: false,
      isDemoBlocked: true,
      error:
        "Cette commande contient des produits de démonstration non commerciaux. Aucun paiement réel n'est déclenché.",
    };
  }

  const existingPending = (payments || []).find(
    (p) => p.status === "PENDING" || p.status === "SUCCEEDED"
  );
  if (existingPending) {
    return {
      ok: false,
      error:
        existingPending.status === "SUCCEEDED"
          ? "Cette commande est déjà réglée."
          : `Une transaction est déjà en cours (${existingPending.gateway_code}). Ne jamais relancer sur un autre prestataire tant qu'elle est en attente.`,
      existingPayment: existingPending,
    };
  }

  const gatewayConfig = await selectGateway({
    requestedGatewayCode: params.gatewayCode,
    country: order.customer_country || "BJ",
    currency: order.currency,
    operator: params.operator,
  });

  if (!gatewayConfig) {
    return { ok: false, error: "Aucun agrégateur de paiement actif." };
  }

  const idempotencyKey = `pay_${order.id}_${crypto.randomUUID()}`;
  const [firstName, ...restName] = String(order.customer_name || "").split(" ");
  const lastName = restName.join(" ") || firstName;

  const initInput: PaymentInitInput = {
    orderId: order.id,
    orderReference: order.reference,
    amountFcfa: order.total_fcfa,
    currency: order.currency,
    customerEmail: order.customer_email,
    customerFirstName: firstName,
    customerLastName: lastName,
    customerPhone: order.customer_phone || undefined,
    customerCountry: order.customer_country || "BJ",
    preferredOperator: params.operator,
    redirectUrl: `${params.baseUrl}/commande/${order.reference}`,
    webhookUrl: `${params.baseUrl}/api/payments/webhooks/${gatewayConfig.code}`,
    idempotencyKey,
  };

  const connector = getConnector(gatewayConfig.code);
  const result = await connector.initiatePayment(initInput, gatewayConfig);

  const feeFcfa = Math.round(
    (order.total_fcfa * gatewayConfig.feePercent) / 100 + gatewayConfig.feeFixedFcfa
  );

  const paymentId = newId();
  const now = new Date().toISOString();

  const { data: payment } = await supabase
    .from("payments")
    .insert({
      id: paymentId,
      order_id: order.id,
      gateway_id: gatewayConfig.id,
      gateway_code: gatewayConfig.code,
      amount_fcfa: order.total_fcfa,
      currency: order.currency,
      fee_fcfa: feeFcfa,
      status: result.success ? "PENDING" : "FAILED",
      external_reference: result.externalReference ?? null,
      redirect_url: result.redirectUrl ?? null,
      idempotency_key: idempotencyKey,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  await supabase.from("payment_transactions").insert({
    id: newId(),
    payment_id: paymentId,
    gateway_id: gatewayConfig.id,
    event_type: "INIT",
    status: result.success ? "PENDING" : "FAILED",
    external_tx_id: result.externalReference ?? null,
    raw_payload: (result.rawPayload ?? {}) as object,
    error_message: result.errorMessage ?? null,
    created_at: now,
  });

  if (!result.success) {
    return {
      ok: false,
      error: result.errorMessage || "Échec d'initialisation du paiement.",
      payment,
    };
  }

  await supabase
    .from("orders")
    .update({ status: "AWAITING_PAYMENT", updated_at: now })
    .eq("id", order.id);

  return {
    ok: true,
    payment,
    redirectUrl: result.redirectUrl,
  };
}
