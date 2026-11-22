import crypto from "crypto";
import { prisma } from "@/lib/prisma";
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
    new ConfigurableExternalConnector(
      code,
      `Aucun adaptateur implémenté pour ${code}.`
    )
  );
}

export async function getRoutingMode(): Promise<RoutingMode> {
  const setting = await prisma.siteSetting.findUnique({
    where: { key: "payment_routing_mode" },
  });
  if (setting?.value === "MODE_A" || setting?.value === "MODE_B" || setting?.value === "MODE_C") {
    return setting.value;
  }
  return "MODE_B";
}

export async function getActiveGateways(): Promise<GatewayRuntimeConfig[]> {
  const rows = await prisma.paymentGateway.findMany({
    where: { isActive: true },
    orderBy: [{ isDefault: "desc" }, { priority: "asc" }],
  });

  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    isActive: row.isActive,
    isDefault: row.isDefault,
    environment: row.environment,
    apiBaseUrl: row.apiBaseUrl || "",
    webhookUrl: row.webhookUrl || "",
    supportedCurrencies: row.supportedCurrencies,
    supportedCountries: row.supportedCountries,
    supportedOperators: row.supportedOperators,
    feePercent: row.feePercent,
    feeFixedFcfa: row.feeFixedFcfa,
    priority: row.priority,
    secrets: decryptSecrets(row.encryptedSecrets),
  }));
}

/**
 * Sélectionne l'agrégateur selon le mode actif (MODE A, MODE B, MODE C).
 */
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
    // Routage intelligent : privilégie les frais les plus bas puis la priorité
    return [...pool].sort((a, b) => {
      if (a.feePercent !== b.feePercent) return a.feePercent - b.feePercent;
      return a.priority - b.priority;
    })[0];
  }

  return active.find((g) => g.isDefault) ?? active[0];
}

/**
 * Initialise un paiement pour une commande réelle (jamais pour un produit de démonstration).
 */
export async function initiateOrderPayment(params: {
  orderId: string;
  gatewayCode?: string;
  operator?: string;
  baseUrl: string;
}) {
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: { items: true, payments: true },
  });

  if (!order) {
    return { ok: false, error: "Commande introuvable." };
  }

  // Règle absolue : les produits de démonstration ne déclenchent JAMAIS un paiement réel
  if (order.isDemoOrder || order.items.some((item) => item.isDemo)) {
    return {
      ok: false,
      isDemoBlocked: true,
      error:
        "Cette commande contient des produits de démonstration non commerciaux. Aucun paiement réel n'est déclenché.",
    };
  }

  // Protection contre les doubles paiements ou relance sur un autre prestataire si déjà en attente
  const existingPending = order.payments.find(
    (p) => p.status === "PENDING" || p.status === "SUCCEEDED"
  );
  if (existingPending) {
    return {
      ok: false,
      error:
        existingPending.status === "SUCCEEDED"
          ? "Cette commande est déjà réglée."
          : `Une transaction est déjà en cours (${existingPending.gatewayCode}). Ne jamais relancer sur un autre prestataire tant qu'elle est en attente.`,
      existingPayment: existingPending,
    };
  }

  const gatewayConfig = await selectGateway({
    requestedGatewayCode: params.gatewayCode,
    country: order.customerCountry || "BJ",
    currency: order.currency,
    operator: params.operator,
  });

  if (!gatewayConfig) {
    return { ok: false, error: "Aucun agrégateur de paiement actif." };
  }

  const idempotencyKey = `pay_${order.id}_${crypto.randomUUID()}`;
  const [firstName, ...restName] = order.customerName.split(" ");
  const lastName = restName.join(" ") || firstName;

  const initInput: PaymentInitInput = {
    orderId: order.id,
    orderReference: order.reference,
    amountFcfa: order.totalFcfa,
    currency: order.currency,
    customerEmail: order.customerEmail,
    customerFirstName: firstName,
    customerLastName: lastName,
    customerPhone: order.customerPhone || undefined,
    customerCountry: order.customerCountry || "BJ",
    preferredOperator: params.operator,
    redirectUrl: `${params.baseUrl}/commande/${order.reference}`,
    webhookUrl: `${params.baseUrl}/api/payments/webhooks/${gatewayConfig.code}`,
    idempotencyKey,
  };

  const connector = getConnector(gatewayConfig.code);
  const result = await connector.initiatePayment(initInput, gatewayConfig);

  const feeFcfa = Math.round(
    (order.totalFcfa * gatewayConfig.feePercent) / 100 + gatewayConfig.feeFixedFcfa
  );

  const payment = await prisma.payment.create({
    data: {
      orderId: order.id,
      gatewayId: gatewayConfig.id,
      gatewayCode: gatewayConfig.code,
      amountFcfa: order.totalFcfa,
      currency: order.currency,
      feeFcfa,
      status: result.success ? "PENDING" : "FAILED",
      externalReference: result.externalReference,
      redirectUrl: result.redirectUrl,
      idempotencyKey,
      transactions: {
        create: {
          gatewayId: gatewayConfig.id,
          eventType: "INIT",
          status: result.success ? "PENDING" : "FAILED",
          externalTxId: result.externalReference,
          rawPayload: (result.rawPayload ?? {}) as object,
          errorMessage: result.errorMessage,
        },
      },
    },
  });

  if (!result.success) {
    return {
      ok: false,
      error: result.errorMessage || "Échec d'initialisation du paiement.",
      payment,
    };
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { status: "AWAITING_PAYMENT" },
  });

  return {
    ok: true,
    payment,
    redirectUrl: result.redirectUrl,
  };
}

