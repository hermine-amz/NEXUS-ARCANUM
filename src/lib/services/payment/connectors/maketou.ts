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
 * Connecteur officiel Maketou Pay (https://docs-api.maketou.com/)
 * - Auth: Authorization: Bearer <API_KEY>
 * - Checkout: POST /stores/cart/checkout
 * - Verify: GET /stores/cart/{cartId}
 */
export class MaketouConnector implements IPaymentGateway {
  readonly code = "maketou";

  async initiatePayment(
    input: PaymentInitInput,
    config: GatewayRuntimeConfig
  ): Promise<PaymentInitResult> {
    const apiKey = config.secrets.apiKey;
    const productDocumentId = config.secrets.gatewayProductDocumentId;

    if (!apiKey) {
      return {
        success: false,
        errorMessage: "Clé API Maketou non configurée dans l'administration.",
      };
    }
    if (!productDocumentId) {
      return {
        success: false,
        errorMessage:
          "productDocumentId Maketou manquant dans la configuration de l'agrégateur.",
      };
    }

    const baseUrl = (config.apiBaseUrl || "https://api.maketou.net/api/v1").replace(/\/$/, "");
    const response = await fetch(`${baseUrl}/stores/cart/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        productDocumentId,
        email: input.customerEmail,
        firstName: input.customerFirstName,
        lastName: input.customerLastName,
        phone: input.customerPhone,
        redirectURL: input.redirectUrl,
        webhookUrl: input.webhookUrl,
        customerPrice: input.amountFcfa,
        meta: {
          orderId: input.orderId,
          orderReference: input.orderReference,
          idempotencyKey: input.idempotencyKey,
          ...input.meta,
        },
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.redirectUrl) {
      return {
        success: false,
        rawPayload: data,
        errorMessage:
          data?.message || `Erreur Maketou HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      externalReference: String(data.id || data.cartId || ""),
      redirectUrl: data.redirectUrl,
      rawPayload: data,
    };
  }

  async verifyPayment(
    externalReference: string,
    config: GatewayRuntimeConfig
  ): Promise<PaymentVerifyResult> {
    const apiKey = config.secrets.apiKey;
    if (!apiKey) {
      return {
        success: false,
        status: "PENDING",
        errorMessage: "Clé API Maketou non configurée.",
      };
    }

    const baseUrl = (config.apiBaseUrl || "https://api.maketou.net/api/v1").replace(/\/$/, "");
    const response = await fetch(`${baseUrl}/stores/cart/${encodeURIComponent(externalReference)}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return {
        success: false,
        status: "PENDING",
        rawPayload: data,
        errorMessage: `Erreur vérification Maketou HTTP ${response.status}`,
      };
    }

    const statusMap: Record<string, PaymentVerifyResult["status"]> = {
      completed: "SUCCEEDED",
      waiting_payment: "PENDING",
      payment_failed: "FAILED",
      abandoned: "CANCELLED",
    };

    return {
      success: true,
      status: statusMap[String(data?.status || "").toLowerCase()] ?? "PENDING",
      externalReference,
      amountFcfa: typeof data?.amount === "number" ? data.amount : undefined,
      currency: data?.currency || "XOF",
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
    let validSignature = false;

    if (secret) {
      const rawSig = headers.get("x-maketou-signature") || headers.get("x-signature") || "";
      const sig = rawSig.replace(/^sha256=/i, "").trim();
      const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
      validSignature =
        sig.length > 0 &&
        sig.length === expected.length &&
        crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    } else if (config.environment === "TEST") {
      // En mode TEST uniquement sans secret configuré
      validSignature = true;
    }

    const rawStatus = String(payload?.status || payload?.data?.status || "").toLowerCase();
    const statusMap: Record<string, WebhookParseResult["status"]> = {
      completed: "SUCCEEDED",
      waiting_payment: "PENDING",
      payment_failed: "FAILED",
      abandoned: "CANCELLED",
    };

    return {
      validSignature,
      externalReference: payload?.id || payload?.cartId || payload?.data?.id,
      orderId: payload?.meta?.orderId || payload?.data?.meta?.orderId,
      status: statusMap[rawStatus] ?? "PENDING",
      amountFcfa: typeof payload?.amount === "number" ? payload.amount : undefined,
      currency: payload?.currency || "XOF",
      rawPayload: payload,
    };
  }

  async testConnection(config: GatewayRuntimeConfig): Promise<{ ok: boolean; message: string }> {
    if (!config.secrets.apiKey) {
      return { ok: false, message: "Clé API Maketou manquante." };
    }
    return {
      ok: true,
      message: `Configuration Maketou (${config.environment}) prête — endpoint ${config.apiBaseUrl}`,
    };
  }
}

