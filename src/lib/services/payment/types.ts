export type RoutingMode = "MODE_A" | "MODE_B" | "MODE_C";

export interface GatewayRuntimeConfig {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  isDefault: boolean;
  environment: "TEST" | "PRODUCTION";
  apiBaseUrl: string;
  webhookUrl: string;
  supportedCurrencies: string[];
  supportedCountries: string[];
  supportedOperators: string[];
  feePercent: number;
  feeFixedFcfa: number;
  priority: number;
  secrets: Record<string, string>;
}

export interface PaymentInitInput {
  orderId: string;
  orderReference: string;
  amountFcfa: number;
  currency: string;
  customerEmail: string;
  customerFirstName: string;
  customerLastName: string;
  customerPhone?: string;
  customerCountry?: string;
  preferredOperator?: string;
  redirectUrl: string;
  webhookUrl: string;
  idempotencyKey: string;
  meta?: Record<string, unknown>;
}

export interface PaymentInitResult {
  success: boolean;
  externalReference?: string;
  redirectUrl?: string;
  rawPayload?: unknown;
  errorMessage?: string;
}

export interface PaymentVerifyResult {
  success: boolean;
  status: "PENDING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  amountFcfa?: number;
  currency?: string;
  externalReference?: string;
  rawPayload?: unknown;
  errorMessage?: string;
}

export interface WebhookParseResult {
  validSignature: boolean;
  externalReference?: string;
  orderId?: string;
  status: "PENDING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  amountFcfa?: number;
  currency?: string;
  rawPayload: unknown;
}

export interface IPaymentGateway {
  readonly code: string;
  initiatePayment(
    input: PaymentInitInput,
    config: GatewayRuntimeConfig
  ): Promise<PaymentInitResult>;
  verifyPayment(
    externalReference: string,
    config: GatewayRuntimeConfig
  ): Promise<PaymentVerifyResult>;
  parseWebhook(
    rawBody: string,
    headers: Headers,
    config: GatewayRuntimeConfig
  ): Promise<WebhookParseResult>;
  testConnection(config: GatewayRuntimeConfig): Promise<{ ok: boolean; message: string }>;
}

