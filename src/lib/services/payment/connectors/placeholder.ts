import {
  IPaymentGateway,
  PaymentInitInput,
  PaymentInitResult,
  PaymentVerifyResult,
  WebhookParseResult,
  GatewayRuntimeConfig,
} from "../types";

/**
 * Connecteur SaaSPay / Geneci.ci — Interface conforme, en attente de clés API et/ou documentation officielle.
 * Conformément à la directive « Ne jamais inventer d'API », aucune requête fictive n'est simulée.
 */
export class ConfigurableExternalConnector implements IPaymentGateway {
  constructor(readonly code: string, private readonly reasonIfUnconfigured: string) {}

  async initiatePayment(
    _input: PaymentInitInput,
    config: GatewayRuntimeConfig
  ): Promise<PaymentInitResult> {
    if (!config.secrets.apiKey || !config.apiBaseUrl) {
      return {
        success: false,
        errorMessage: this.reasonIfUnconfigured,
      };
    }
    return {
      success: false,
      errorMessage: `Connecteur ${this.code} : endpoint officiel à valider avant activation en production.`,
    };
  }

  async verifyPayment(): Promise<PaymentVerifyResult> {
    return {
      success: false,
      status: "PENDING",
      errorMessage: this.reasonIfUnconfigured,
    };
  }

  async parseWebhook(rawBody: string): Promise<WebhookParseResult> {
    const payload = JSON.parse(rawBody || "{}");
    return {
      validSignature: false,
      status: "PENDING",
      rawPayload: payload,
    };
  }

  async testConnection(config: GatewayRuntimeConfig): Promise<{ ok: boolean; message: string }> {
    if (!config.secrets.apiKey || !config.apiBaseUrl) {
      return { ok: false, message: this.reasonIfUnconfigured };
    }
    return {
      ok: true,
      message: `Paramètres ${this.code} enregistrés (${config.environment}).`,
    };
  }
}

