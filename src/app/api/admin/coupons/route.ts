import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSupabaseAdmin, newId } from "@/lib/supabase";
import { getCurrentSession, isAdminSession } from "@/lib/security/auth";

async function readCouponProductLinks(supabase: ReturnType<typeof requireSupabaseAdmin>): Promise<Record<string, string>> {
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "coupon_product_links")
    .maybeSingle();
  if (!data?.value) return {};
  try {
    return JSON.parse(data.value) as Record<string, string>;
  } catch {
    return {};
  }
}

export async function GET(req: Request) {
  const session = await getCurrentSession();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const productIdFilter = searchParams.get("productId");
    const supabase = requireSupabaseAdmin();
    const [{ data }, links] = await Promise.all([
      supabase.from("coupons").select("*").order("created_at", { ascending: false }),
      readCouponProductLinks(supabase),
    ]);

    const mapped = (data || []).map((c) => ({
      id: c.id,
      code: c.code,
      discountType: c.discount_type,
      discountValue: c.discount_value,
      minOrderFcfa: c.min_order_fcfa,
      maxUses: c.max_uses,
      usedCount: c.used_count,
      isActive: c.is_active,
      expiresAt: c.expires_at,
      productId: links[c.id] || null,
    }));

    return NextResponse.json({
      coupons: productIdFilter
        ? mapped.filter((c) => c.productId === productIdFilter)
        : mapped,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

const CreateCouponSchema = z.object({
  code: z.string().min(3, "Code promo trop court").max(32),
  discountType: z.enum(["PERCENTAGE", "FIXED_FCFA"]),
  discountValue: z.coerce.number().int().positive("Valeur positive requise"),
  minOrderFcfa: z.coerce.number().int().min(0).default(0),
  maxUses: z.coerce.number().int().positive().nullable().optional(),
  productId: z.string().nullable().optional(),
});

export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = CreateCouponSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalide" }, { status: 400 });
    }

    const supabase = requireSupabaseAdmin();
    const now = new Date().toISOString();
    const id = newId();
    const code = parsed.data.code.trim().toUpperCase().replace(/\s+/g, "");

    const { error } = await supabase.from("coupons").insert({
      id,
      code,
      discount_type: parsed.data.discountType,
      discount_value: parsed.data.discountValue,
      min_order_fcfa: parsed.data.minOrderFcfa,
      max_uses: parsed.data.maxUses ?? null,
      used_count: 0,
      is_active: true,
      created_at: now,
    });

    if (error) return NextResponse.json({ error: "Ce code existe déjà ou est invalide." }, { status: 400 });

    if (parsed.data.productId) {
      const links = await readCouponProductLinks(supabase);
      links[id] = parsed.data.productId;
      await supabase.from("site_settings").upsert(
        { key: "coupon_product_links", value: JSON.stringify(links), updated_at: now },
        { onConflict: "key" }
      );
    }

    await supabase.from("audit_logs").insert({
      id: newId(),
      user_id: session!.userId,
      action: "COUPON_CREATED",
      entity_type: "Coupon",
      entity_id: id,
      details: { code },
      created_at: now,
    });

    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getCurrentSession();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  const body = await req.json();
  if (!body.id || typeof body.isActive !== "boolean") {
    return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
  }

  const supabase = requireSupabaseAdmin();
  await supabase.from("coupons").update({ is_active: body.isActive }).eq("id", body.id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await getCurrentSession();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

  const supabase = requireSupabaseAdmin();
  await supabase.from("coupons").delete().eq("id", id);
  const links = await readCouponProductLinks(supabase);
  if (links[id]) {
    delete links[id];
    await supabase.from("site_settings").upsert(
      { key: "coupon_product_links", value: JSON.stringify(links), updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
  }
  return NextResponse.json({ ok: true });
}
