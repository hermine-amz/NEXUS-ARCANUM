import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSupabaseAdmin, newId } from "@/lib/supabase";
import { getCurrentSession, isAdminSession } from "@/lib/security/auth";
import { encryptSecrets, decryptSecrets } from "@/lib/security/crypto";
import { getConnector, getRoutingMode } from "@/lib/services/payment/gateway-manager";

const UpdateGatewaySchema = z.object({
  action: z.enum([
    "UPDATE_CONFIG",
    "SET_DEFAULT",
    "TEST_CONNECTION",
    "SET_ROUTING_MODE",
    "TOGGLE_ACTIVE",
  ]),
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
    const supabase = requireSupabaseAdmin();
    const [{ data: gateways }, routingMode] = await Promise.all([
      supabase
        .from("payment_gateways")
        .select("*")
        .order("is_default", { ascending: false })
        .order("priority", { ascending: true }),
      getRoutingMode(),
    ]);

    const sanitized = (gateways || []).map((g) => {
      const dec = decryptSecrets(g.encrypted_secrets);
      return {
        id: g.id,
        code: g.code,
        name: g.name,
        description: g.description,
        isActive: g.is_active,
        isDefault: g.is_default,
        environment: g.environment,
        apiBaseUrl: g.api_base_url,
        webhookUrl: g.webhook_url,
        supportedCurrencies: g.supported_currencies || ["XOF"],
        supportedCountries: g.supported_countries || ["BJ"],
        supportedOperators: g.supported_operators || ["MTN"],
        feePercent: g.fee_percent ?? 0,
        feeFixedFcfa: g.fee_fixed_fcfa ?? 0,
        hasApiKey: Boolean(dec.apiKey),
        hasWebhookSecret: Boolean(dec.webhookSecret),
        gatewayProductDocumentId: dec.gatewayProductDocumentId || "",
        lastTestStatus: g.last_test_status,
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

    const supabase = requireSupabaseAdmin();
    const data = parsed.data;
    const now = new Date().toISOString();

    if (data.action === "SET_ROUTING_MODE" && data.routingMode) {
      await supabase.from("site_settings").upsert(
        { key: "payment_routing_mode", value: data.routingMode, updated_at: now },
        { onConflict: "key" }
      );
      await supabase.from("audit_logs").insert({
        id: newId(),
        user_id: session!.userId,
        action: "PAYMENT_ROUTING_MODE_CHANGED",
        entity_type: "SiteSetting",
        entity_id: "payment_routing_mode",
        details: { routingMode: data.routingMode },
        created_at: now,
      });
      return NextResponse.json({ ok: true, routingMode: data.routingMode });
    }

    if (!data.gatewayId) {
      return NextResponse.json({ error: "gatewayId requis." }, { status: 400 });
    }

    const { data: gw } = await supabase
      .from("payment_gateways")
      .select("*")
      .eq("id", data.gatewayId)
      .maybeSingle();

    if (!gw) {
      return NextResponse.json({ error: "Agrégateur introuvable." }, { status: 404 });
    }

    if (data.action === "TOGGLE_ACTIVE") {
      const nextActive = !gw.is_active;
      await supabase
        .from("payment_gateways")
        .update({
          is_active: nextActive,
          is_default: nextActive ? gw.is_default : false,
          updated_at: now,
        })
        .eq("id", gw.id);
      await supabase.from("audit_logs").insert({
        id: newId(),
        user_id: session!.userId,
        action: nextActive ? "GATEWAY_ACTIVATED" : "GATEWAY_DEACTIVATED",
        entity_type: "PaymentGateway",
        entity_id: gw.id,
        details: { code: gw.code },
        created_at: now,
      });
      return NextResponse.json({ ok: true, isActive: nextActive });
    }

    if (data.action === "SET_DEFAULT") {
      await supabase.from("payment_gateways").update({ is_default: false, updated_at: now }).neq("id", gw.id);
      await supabase
        .from("payment_gateways")
        .update({ is_default: true, is_active: true, updated_at: now })
        .eq("id", gw.id);
      await supabase.from("audit_logs").insert({
        id: newId(),
        user_id: session!.userId,
        action: "GATEWAY_SET_DEFAULT",
        entity_type: "PaymentGateway",
        entity_id: gw.id,
        details: { code: gw.code },
        created_at: now,
      });
      return NextResponse.json({ ok: true });
    }

    if (data.action === "TEST_CONNECTION") {
      const connector = getConnector(gw.code);
      const result = await connector.testConnection({
        id: gw.id,
        code: gw.code,
        name: gw.name,
        isActive: gw.is_active,
        isDefault: gw.is_default,
        environment: gw.environment,
        apiBaseUrl: gw.api_base_url || "",
        webhookUrl: gw.webhook_url || "",
        supportedCurrencies: gw.supported_currencies || ["XOF"],
        supportedCountries: gw.supported_countries || ["BJ"],
        supportedOperators: gw.supported_operators || ["MTN"],
        feePercent: gw.fee_percent ?? 0,
        feeFixedFcfa: gw.fee_fixed_fcfa ?? 0,
        priority: gw.priority ?? 10,
        secrets: decryptSecrets(gw.encrypted_secrets),
      });

      await supabase
        .from("payment_gateways")
        .update({
          last_test_status: result.ok ? "OK" : "ERROR",
          last_tested_at: now,
          updated_at: now,
        })
        .eq("id", gw.id);

      return NextResponse.json(result);
    }

    const existingSecrets = decryptSecrets(gw.encrypted_secrets);
    const mergedSecrets = {
      ...existingSecrets,
      ...(data.secrets
        ? Object.fromEntries(
            Object.entries(data.secrets).filter(([, v]) => v !== undefined && v !== "")
          )
        : {}),
    };

    const nextActive = data.isActive ?? gw.is_active;
    const nextEnv = data.environment ?? gw.environment;

    await supabase
      .from("payment_gateways")
      .update({
        is_active: nextActive,
        environment: nextEnv,
        api_base_url: data.apiBaseUrl ?? gw.api_base_url,
        webhook_url: data.webhookUrl ?? gw.webhook_url,
        fee_percent: data.feePercent ?? gw.fee_percent,
        fee_fixed_fcfa: data.feeFixedFcfa ?? gw.fee_fixed_fcfa,
        supported_currencies: data.supportedCurrencies ?? gw.supported_currencies,
        supported_countries: data.supportedCountries ?? gw.supported_countries,
        supported_operators: data.supportedOperators ?? gw.supported_operators,
        encrypted_secrets: encryptSecrets(mergedSecrets),
        updated_at: now,
      })
      .eq("id", gw.id);

    await supabase.from("audit_logs").insert({
      id: newId(),
      user_id: session!.userId,
      action: "GATEWAY_CONFIG_UPDATED",
      entity_type: "PaymentGateway",
      entity_id: gw.id,
      details: { code: gw.code, isActive: nextActive, environment: nextEnv },
      created_at: now,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Erreur mise à jour agrégateur.", details: String(err) },
      { status: 500 }
    );
  }
}

const CreateGatewaySchema = z.object({
  name: z.string().min(2, "Nom requis"),
  code: z.string().min(2, "Code requis").max(32),
  description: z.string().optional(),
  apiBaseUrl: z.string().optional(),
  feePercent: z.coerce.number().min(0).max(50).default(2.5),
  environment: z.enum(["TEST", "PRODUCTION"]).default("TEST"),
  apiKey: z.string().optional(),
  webhookSecret: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = CreateGatewaySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Paramètres invalides." },
        { status: 400 }
      );
    }

    const supabase = requireSupabaseAdmin();
    const d = parsed.data;
    const cleanCode = d.code
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9_-]+/g, "");
    const now = new Date().toISOString();
    const id = newId();

    const { error } = await supabase.from("payment_gateways").insert({
      id,
      code: cleanCode,
      name: d.name.trim(),
      description: d.description?.trim() || "Agrégateur de paiement personnalisé",
      is_active: false,
      is_default: false,
      environment: d.environment,
      api_base_url: d.apiBaseUrl?.trim() || "",
      webhook_url: `/api/payments/webhooks/${cleanCode}`,
      supported_currencies: ["XOF"],
      supported_countries: ["BJ", "CI", "SN", "TG", "BF", "ML"],
      supported_operators: ["MTN", "MOOV", "CARD"],
      fee_percent: d.feePercent,
      fee_fixed_fcfa: 0,
      priority: 10,
      encrypted_secrets: encryptSecrets({
        apiKey: d.apiKey || "",
        webhookSecret: d.webhookSecret || "",
      }),
      created_at: now,
      updated_at: now,
    });

    if (error) {
      return NextResponse.json(
        { error: "Ce code agrégateur existe déjà ou est invalide." },
        { status: 400 }
      );
    }

    await supabase.from("audit_logs").insert({
      id: newId(),
      user_id: session!.userId,
      action: "GATEWAY_CREATED",
      entity_type: "PaymentGateway",
      entity_id: id,
      details: { code: cleanCode, name: d.name },
      created_at: now,
    });

    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getCurrentSession();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis." }, { status: 400 });

  const supabase = requireSupabaseAdmin();
  const { count } = await supabase
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("gateway_id", id);

  if (count && count > 0) {
    return NextResponse.json(
      {
        error:
          "Cet agrégateur possède un historique financier. Désactivez-le plutôt que de le supprimer afin de conserver les preuves de transactions.",
      },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("payment_gateways").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("audit_logs").insert({
    id: newId(),
    user_id: session!.userId,
    action: "GATEWAY_DELETED",
    entity_type: "PaymentGateway",
    entity_id: id,
    created_at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
