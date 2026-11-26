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
 * Connecteur KKiaPay (https://docs.kkiapay.me/)
 * Mobile Money Bénin / Afrique de l'Ouest & Cartes bancaires.
 */
export class KkiapayConnector implements IPaymentGateway {
  readonly code = "kkiapay";

  private getBaseUrl(config: GatewayRuntimeConfig): string {
    if (config.apiBaseUrl) return config.apiBaseUrl.replace(/\/$/, "");
    return config.environment === "PRODUCTION"
      ? "https://api.kkiapay.me"
      : "https://api-sandbox.kkiapay.me";
  }

  async initiatePayment(
    input: PaymentInitInput,
    config: GatewayRuntimeConfig
  ): Promise<PaymentInitResult> {
    const publicKey = config.secrets.apiKey;
    if (!publicKey) {
      return { success: false, errorMessage: "Clé API KKiaPay non renseignée." };
    }

    const sandboxParam = config.environment === "TEST" ? "&sandbox=true" : "";
    const redirectUrl = `https://widget.kkiapay.me/?amount=${input.amountFcfa}&key=${encodeURIComponent(
      publicKey
    )}&callback=${encodeURIComponent(input.redirectUrl)}&data=${encodeURIComponent(
      input.orderReference
    )}${sandboxParam}`;

    return {
      success: true,
      externalReference: input.orderReference,
      redirectUrl,
    };
  }

  async verifyPayment(
    externalReference: string,
    config: GatewayRuntimeConfig
  ): Promise<PaymentVerifyResult> {
    const apiKey = config.secrets.apiKey;
    const secret = config.secrets.webhookSecret;
    if (!apiKey) {
      return { success: false, status: "PENDING", errorMessage: "Clé API KKiaPay manquante." };
    }

    const baseUrl = this.getBaseUrl(config);
    const res = await fetch(`${baseUrl}/api/v1/transactions/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        ...(secret ? { "x-secret-key": secret } : {}),
      },
      body: JSON.stringify({ transactionId: externalReference }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { success: false, status: "PENDING", rawPayload: data };

    const s = String(data?.status || "").toUpperCase();
    const status: PaymentVerifyResult["status"] =
      s === "SUCCESS" ? "SUCCEEDED" : s === "FAILED" ? "FAILED" : "PENDING";

    return {
      success: true,
      status,
      externalReference,
      amountFcfa: typeof data?.amount === "number" ? data.amount : undefined,
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
      const sig = (headers.get("x-kkiapay-secret") || "").trim();
      validSignature =
        sig.length > 0 &&
        sig.length === secret.length &&
        crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(secret));
    }

    const isSuccess = payload?.isPaymentSucces === true || payload?.status === "SUCCESS";
    return {
      validSignature,
      externalReference: payload?.transactionId ? String(payload.transactionId) : undefined,
      orderId: payload?.stateData?.orderId,
      status: isSuccess ? "SUCCEEDED" : "FAILED",
      amountFcfa: typeof payload?.amount === "number" ? payload.amount : undefined,
      currency: "XOF",
      rawPayload: payload,
    };
  }

  async testConnection(config: GatewayRuntimeConfig) {
    if (!config.secrets.apiKey) {
      return { ok: false, message: "Collez votre Clé Publique KKiaPay pour activer." };
    }
    return {
      ok: true,
      message: `KKiaPay (${config.environment}) prêt à encaisser (MTN, Moov, Celtiis, Cartes).`,
    };
  }
}
