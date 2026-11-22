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
 * Connecteur SebPay Africa (sebpay.africa / sebpay.bj)
 */
export class SebPayConnector implements IPaymentGateway {
  readonly code = "sebpay";

  async initiatePayment(
    input: PaymentInitInput,
    config: GatewayRuntimeConfig
  ): Promise<PaymentInitResult> {
    const apiKey = config.secrets.apiKey;
    if (!apiKey) {
      return {
        success: false,
        errorMessage: "Clé API SebPay non configurée dans l'administration.",
      };
    }

    const baseUrl = (config.apiBaseUrl || "https://api.sebpay.africa/v1").replace(/\/$/, "");
    const response = await fetch(`${baseUrl}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        amount: input.amountFcfa,
        currency: input.currency || "XOF",
        reference: input.orderReference,
        customer: {
          email: input.customerEmail,
          name: `${input.customerFirstName} ${input.customerLastName}`.trim(),
          phone: input.customerPhone,
          provider: input.preferredOperator || "MTN",
        },
        callback_url: input.webhookUrl,
        return_url: input.redirectUrl,
        metadata: {
          orderId: input.orderId,
          idempotencyKey: input.idempotencyKey,
        },
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok || (!data?.payment_url && !data?.redirect_url)) {
      return {
        success: false,
        rawPayload: data,
        errorMessage: data?.message || `Erreur SebPay HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      externalReference: String(data.id || data.transaction_id || input.orderReference),
      redirectUrl: data.payment_url || data.redirect_url,
      rawPayload: data,
    };
  }

  async verifyPayment(
    externalReference: string,
    config: GatewayRuntimeConfig
  ): Promise<PaymentVerifyResult> {
    const apiKey = config.secrets.apiKey;
    if (!apiKey) {
      return { success: false, status: "PENDING", errorMessage: "Clé API SebPay manquante." };
    }

    const baseUrl = (config.apiBaseUrl || "https://api.sebpay.africa/v1").replace(/\/$/, "");
    const response = await fetch(`${baseUrl}/payments/${encodeURIComponent(externalReference)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return {
        success: false,
        status: "PENDING",
        rawPayload: data,
        errorMessage: `Erreur vérification SebPay HTTP ${response.status}`,
      };
    }

    const s = String(data?.status || "").toUpperCase();
    const status: PaymentVerifyResult["status"] =
      s === "SUCCESS" || s === "COMPLETED" || s === "PAID"
        ? "SUCCEEDED"
        : s === "FAILED"
        ? "FAILED"
        : s === "CANCELLED"
        ? "CANCELLED"
        : "PENDING";

    return {
      success: true,
      status,
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
      const rawSig = headers.get("x-sebpay-signature") || headers.get("x-signature") || "";
      const sig = rawSig.replace(/^sha256=/i, "").trim();
      const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
      validSignature =
        sig.length > 0 &&
        sig.length === expected.length &&
        crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    } else if (config.environment === "TEST") {
      validSignature = true;
    }

    const s = String(payload?.status || "").toUpperCase();
    const status: WebhookParseResult["status"] =
      s === "SUCCESS" || s === "COMPLETED" || s === "PAID"
        ? "SUCCEEDED"
        : s === "FAILED"
        ? "FAILED"
        : s === "CANCELLED"
        ? "CANCELLED"
        : "PENDING";

    return {
      validSignature,
      externalReference: payload?.id || payload?.transaction_id,
      orderId: payload?.metadata?.orderId,
      status,
      amountFcfa: typeof payload?.amount === "number" ? payload.amount : undefined,
      currency: payload?.currency || "XOF",
      rawPayload: payload,
    };
  }

  async testConnection(config: GatewayRuntimeConfig): Promise<{ ok: boolean; message: string }> {
    if (!config.secrets.apiKey) {
      return { ok: false, message: "Clé API SebPay manquante." };
    }
    return {
      ok: true,
      message: `Configuration SebPay (${config.environment}) prête — endpoint ${config.apiBaseUrl}`,
    };
  }
}

