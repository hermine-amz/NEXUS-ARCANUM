import crypto from "crypto";
import {
  IPaymentGateway,
  PaymentInitInput,
  PaymentInitResult,
  PaymentVerifyResult,
  WebhookParseResult,
  GatewayRuntimeConfig,
} from "../types";

/**
 * Connecteur FedaPay (https://docs.fedapay.com/)
 * Mobile Money (MTN, Moov, Celtiis) & Cartes bancaires en XOF.
 */
export class FedaPayConnector implements IPaymentGateway {
  readonly code = "fedapay";

  private getBaseUrl(config: GatewayRuntimeConfig): string {
    if (config.apiBaseUrl) return config.apiBaseUrl.replace(/\/$/, "");
    return config.environment === "PRODUCTION"
      ? "https://api.fedapay.com/v1"
      : "https://sandbox-api.fedapay.com/v1";
  }

  async initiatePayment(
    input: PaymentInitInput,
    config: GatewayRuntimeConfig
  ): Promise<PaymentInitResult> {
    const apiKey = config.secrets.apiKey;
    if (!apiKey) {
      return { success: false, errorMessage: "Clé API FedaPay non renseignée." };
    }

    const baseUrl = this.getBaseUrl(config);
    const txRes = await fetch(`${baseUrl}/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        description: `Commande ${input.orderReference} - NEXUSARCANUM SHOP`,
        amount: input.amountFcfa,
        currency: { iso: input.currency || "XOF" },
        callback_url: input.redirectUrl,
        customer: {
          firstname: input.customerFirstName,
          lastname: input.customerLastName,
          email: input.customerEmail,
          phone_number: input.customerPhone
            ? { number: input.customerPhone, country: (input.customerCountry || "BJ").toLowerCase() }
            : undefined,
        },
        custom_metadata: {
          orderId: input.orderId,
          orderReference: input.orderReference,
        },
      }),
    });

    const txData = await txRes.json().catch(() => null);
    const tx = txData?.["v1/transaction"] || txData?.transaction || txData;
    if (!txRes.ok || !tx?.id) {
      return {
        success: false,
        rawPayload: txData,
        errorMessage: txData?.message || `Erreur FedaPay HTTP ${txRes.status}`,
      };
    }

    const tokenRes = await fetch(`${baseUrl}/transactions/${tx.id}/token`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const tokenData = await tokenRes.json().catch(() => null);
    if (!tokenRes.ok || !tokenData?.url) {
      return {
        success: false,
        rawPayload: tokenData,
        errorMessage: "Impossible de générer l'URL de paiement FedaPay.",
      };
    }

    return {
      success: true,
      externalReference: String(tx.id),
      redirectUrl: tokenData.url,
      rawPayload: { tx, tokenData },
    };
  }

  async verifyPayment(
    externalReference: string,
    config: GatewayRuntimeConfig
  ): Promise<PaymentVerifyResult> {
    const apiKey = config.secrets.apiKey;
    if (!apiKey) {
      return { success: false, status: "PENDING", errorMessage: "Clé API FedaPay manquante." };
    }

    const baseUrl = this.getBaseUrl(config);
    const res = await fetch(`${baseUrl}/transactions/${encodeURIComponent(externalReference)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = await res.json().catch(() => null);
    const tx = data?.["v1/transaction"] || data;
    if (!res.ok) {
      return { success: false, status: "PENDING", rawPayload: data };
    }

    const s = String(tx?.status || "").toLowerCase();
    const status: PaymentVerifyResult["status"] =
      s === "approved" || s === "transferred"
        ? "SUCCEEDED"
        : s === "declined"
        ? "FAILED"
        : s === "canceled"
        ? "CANCELLED"
        : "PENDING";

    return {
      success: true,
      status,
      externalReference,
      amountFcfa: typeof tx?.amount === "number" ? tx.amount : undefined,
      currency: "XOF",
      rawPayload: data,
    };
  }

  async parseWebhook(
    rawBody: string,
    headers: Headers,
    config: GatewayRuntimeConfig
  ): Promise<WebhookParseResult> {
    const payload = JSON.parse(rawBody || "{}");
    const secret = config.secrets.webhookSecret;
    let validSignature = config.environment === "TEST" && !secret;

    if (secret) {
      const sig = (headers.get("x-fedapay-signature") || "").trim();
      const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
      validSignature = sig.includes(expected);
    }

    const entity = payload?.entity || payload?.data || payload;
    const s = String(entity?.status || "").toLowerCase();
    const status: WebhookParseResult["status"] =
      s === "approved" || s === "transferred"
        ? "SUCCEEDED"
        : s === "declined"
        ? "FAILED"
        : s === "canceled"
        ? "CANCELLED"
        : "PENDING";

    return {
      validSignature,
      externalReference: entity?.id ? String(entity.id) : undefined,
      orderId: entity?.custom_metadata?.orderId,
      status,
      amountFcfa: typeof entity?.amount === "number" ? entity.amount : undefined,
      currency: "XOF",
      rawPayload: payload,
    };
  }

  async testConnection(config: GatewayRuntimeConfig) {
    if (!config.secrets.apiKey) {
      return { ok: false, message: "Collez votre Clé API secrète FedaPay pour activer." };
    }
    return {
      ok: true,
      message: `FedaPay (${config.environment}) prêt à encaisser en FCFA.`,
    };
  }
}
