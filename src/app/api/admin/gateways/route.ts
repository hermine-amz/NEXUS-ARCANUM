import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession, isAdminSession } from "@/lib/security/auth";
import { encryptSecrets, decryptSecrets } from "@/lib/security/crypto";
import { getConnector, getRoutingMode } from "@/lib/services/payment/gateway-manager";

const UpdateGatewaySchema = z.object({
  action: z.enum(["UPDATE_CONFIG", "SET_DEFAULT", "TEST_CONNECTION", "SET_ROUTING_MODE"]),
  gatewayId: z.string().optional(),
  routingMode: z.enum(["MODE_A", "MODE_B", "MODE_C"]).optional(),
  isActive: z.boolean().optional(),
  environment: z.enum(["TEST", "PRODUCTION"]).optional(),
  apiBaseUrl: z.string().optional(),
  webhookUrl: z.string().optional(),
  feePercent: z.number().min(0).max(50).optional(),
  feeFixedFcfa: z.number().int().min(0).optional(),
  supportedCurrencies: z.array(z.string()).optional(),
  supportedCountries: z.array(z.string()).optional(),
  supportedOperators: z.array(z.string()).optional(),
  secrets: z.record(z.string(), z.string()).optional(),
});

export async function GET() {
  const session = await getCurrentSession();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  try {
    const [gateways, routingMode] = await Promise.all([
      prisma.paymentGateway.findMany({ orderBy: [{ isDefault: "desc" }, { priority: "asc" }] }),
      getRoutingMode(),
    ]);

    // Ne jamais renvoyer les secrets en clair au client ; indiquer seulement s'ils sont renseignés
    const sanitized = gateways.map((g) => {
      const dec = decryptSecrets(g.encryptedSecrets);
      return {
        ...g,
        encryptedSecrets: undefined,
        hasApiKey: Boolean(dec.apiKey),
        hasWebhookSecret: Boolean(dec.webhookSecret),
        gatewayProductDocumentId: dec.gatewayProductDocumentId || "",
      };
    });

    return NextResponse.json({ gateways: sanitized, routingMode });
  } catch (err) {
    return NextResponse.json(
      { error: "Erreur lecture des agrégateurs.", details: String(err) },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const session = await getCurrentSession();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = UpdateGatewaySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
    }

    const data = parsed.data;

    if (data.action === "SET_ROUTING_MODE" && data.routingMode) {
      await prisma.siteSetting.upsert({
        where: { key: "payment_routing_mode" },
        update: { value: data.routingMode },
        create: { key: "payment_routing_mode", value: data.routingMode },
      });
      await prisma.auditLog.create({
        data: {
          userId: session!.userId,
          action: "PAYMENT_ROUTING_MODE_CHANGED",
          entityType: "SiteSetting",
          entityId: "payment_routing_mode",
          details: { routingMode: data.routingMode },
        },
      });
      return NextResponse.json({ ok: true, routingMode: data.routingMode });
    }

    if (!data.gatewayId) {
      return NextResponse.json({ error: "gatewayId requis." }, { status: 400 });
    }

    const gw = await prisma.paymentGateway.findUnique({ where: { id: data.gatewayId } });
    if (!gw) {
      return NextResponse.json({ error: "Agrégateur introuvable." }, { status: 404 });
    }

    if (data.action === "SET_DEFAULT") {
      await prisma.$transaction([
        prisma.paymentGateway.updateMany({ data: { isDefault: false } }),
        prisma.paymentGateway.update({
          where: { id: gw.id },
          data: { isDefault: true, isActive: true },
        }),
      ]);
      await prisma.auditLog.create({
        data: {
          userId: session!.userId,
          action: "GATEWAY_SET_DEFAULT",
          entityType: "PaymentGateway",
          entityId: gw.id,
          details: { code: gw.code },
        },
      });
      return NextResponse.json({ ok: true });
    }

    if (data.action === "TEST_CONNECTION") {
      const connector = getConnector(gw.code);
      const result = await connector.testConnection({
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

      await prisma.paymentGateway.update({
        where: { id: gw.id },
        data: {
          lastTestStatus: result.ok ? "OK" : "ERROR",
          lastTestedAt: new Date(),
        },
      });

      return NextResponse.json(result);
    }

    // UPDATE_CONFIG
    const existingSecrets = decryptSecrets(gw.encryptedSecrets);
    const mergedSecrets = {
      ...existingSecrets,
      ...(data.secrets
        ? Object.fromEntries(
            Object.entries(data.secrets).filter(([, v]) => v !== undefined && v !== "")
          )
        : {}),
    };

    const updated = await prisma.paymentGateway.update({
      where: { id: gw.id },
      data: {
        isActive: data.isActive ?? gw.isActive,
        environment: data.environment ?? gw.environment,
        apiBaseUrl: data.apiBaseUrl ?? gw.apiBaseUrl,
        webhookUrl: data.webhookUrl ?? gw.webhookUrl,
        feePercent: data.feePercent ?? gw.feePercent,
        feeFixedFcfa: data.feeFixedFcfa ?? gw.feeFixedFcfa,
        supportedCurrencies: data.supportedCurrencies ?? gw.supportedCurrencies,
        supportedCountries: data.supportedCountries ?? gw.supportedCountries,
        supportedOperators: data.supportedOperators ?? gw.supportedOperators,
        encryptedSecrets: encryptSecrets(mergedSecrets),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session!.userId,
        action: "GATEWAY_CONFIG_UPDATED",
        entityType: "PaymentGateway",
        entityId: gw.id,
        details: { code: gw.code, isActive: updated.isActive, environment: updated.environment },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Erreur mise à jour agrégateur.", details: String(err) },
      { status: 500 }
    );
  }
}

