import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
    const gw = await prisma.paymentGateway.findUnique({ where: { code: gatewayCode } });
    if (!gw) {
      return NextResponse.json({ error: "Agrégateur inconnu" }, { status: 404 });
    }

    const connector = getConnector(gatewayCode);
    const parsed = await connector.parseWebhook(rawBody, req.headers, {
      id: gw.id,
      code: gw.code,
      name: gw.name,
      isActive: gw.isActive,
      isDefault: gw.isDefault,
      environment: gw.environment,
      apiBaseUrl: gw.apiBaseUrl || "",
      webhookUrl: gw.webhookUrl || "",
      supportedCurrencies: gw.supportedCurrencies,
      supportedCountries: gw.supportedCountries,
      supportedOperators: gw.supportedOperators,
      feePercent: gw.feePercent,
      feeFixedFcfa: gw.feeFixedFcfa,
      priority: gw.priority,
      secrets: decryptSecrets(gw.encryptedSecrets),
    });

    if (!parsed.validSignature) {
      return NextResponse.json({ error: "Signature webhook invalide" }, { status: 401 });
    }

    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          ...(parsed.externalReference ? [{ externalReference: parsed.externalReference }] : []),
          ...(parsed.orderId ? [{ orderId: parsed.orderId }] : []),
        ],
      },
      include: { order: true },
    });

    if (!payment) {
      return NextResponse.json({ error: "Paiement introuvable" }, { status: 404 });
    }

    // Contrôle strict du montant et de la devise
    const amountMismatch =
      typeof parsed.amountFcfa === "number" && parsed.amountFcfa !== payment.amountFcfa;
    const currencyMismatch =
      parsed.currency && parsed.currency.toUpperCase() !== payment.currency.toUpperCase();

    if (amountMismatch || currencyMismatch) {
      await prisma.paymentTransaction.create({
        data: {
          paymentId: payment.id,
          gatewayId: gw.id,
          eventType: "WEBHOOK_MISMATCH",
          status: "REJECTED",
          externalTxId: parsed.externalReference,
          rawPayload: (parsed.rawPayload ?? {}) as object,
          signatureValid: parsed.validSignature,
          errorMessage: "Incohérence montant ou devise détectée",
        },
      });
      return NextResponse.json({ error: "Incohérence montant/devise" }, { status: 400 });
    }

    await prisma.paymentTransaction.create({
      data: {
        paymentId: payment.id,
        gatewayId: gw.id,
        eventType: "WEBHOOK",
        status: parsed.status,
        externalTxId: parsed.externalReference,
        rawPayload: (parsed.rawPayload ?? {}) as object,
        signatureValid: parsed.validSignature,
      },
    });

    if (parsed.status === "SUCCEEDED" && payment.status !== "SUCCEEDED") {
      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: { status: "SUCCEEDED", verifiedAt: new Date() },
        }),
        prisma.order.update({
          where: { id: payment.orderId },
          data: { status: "PAID", paidAt: new Date() },
        }),
      ]);
      await grantEntitlementsForOrder(payment.orderId);
    } else if (parsed.status === "FAILED" || parsed.status === "CANCELLED") {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: parsed.status },
      });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Erreur traitement webhook", details: String(err) },
      { status: 500 }
    );
  }
}

