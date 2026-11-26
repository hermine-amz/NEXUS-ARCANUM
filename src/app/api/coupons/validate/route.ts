import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSupabaseAdmin } from "@/lib/supabase";

const ValidateCouponSchema = z.object({
  code: z.string().min(1),
  subtotalFcfa: z.coerce.number().int().min(0),
  items: z
    .array(z.object({ id: z.string(), priceFcfa: z.coerce.number().int().min(0) }))
    .optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = ValidateCouponSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Code promo invalide." }, { status: 400 });
    }

    const code = parsed.data.code.trim().toUpperCase();
    const supabase = requireSupabaseAdmin();
    const [{ data: coupon }, { data: linkSetting }] = await Promise.all([
      supabase.from("coupons").select("*").eq("code", code).maybeSingle(),
      supabase
        .from("site_settings")
        .select("value")
        .eq("key", "coupon_product_links")
        .maybeSingle(),
    ]);

    if (!coupon || !coupon.is_active) {
      return NextResponse.json(
        { error: "Ce code promo n'existe pas ou n'est plus actif." },
        { status: 404 }
      );
    }

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return NextResponse.json({ error: "Ce code promo a expiré." }, { status: 400 });
    }

    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
      return NextResponse.json(
        { error: "Ce code promo a atteint sa limite d'utilisation." },
        { status: 400 }
      );
    }

    let targetBaseFcfa = parsed.data.subtotalFcfa;
    let linkedProductId: string | null = null;
    if (linkSetting?.value) {
      try {
        const links = JSON.parse(linkSetting.value) as Record<string, string>;
        linkedProductId = links[coupon.id] || null;
      } catch {
        linkedProductId = null;
      }
    }

    if (linkedProductId) {
      const matchedItem = (parsed.data.items || []).find((it) => it.id === linkedProductId);
      if (!matchedItem) {
        return NextResponse.json(
          { error: "Ce code promo est réservé à un livre spécifique absent de votre panier." },
          { status: 400 }
        );
      }
      targetBaseFcfa = matchedItem.priceFcfa;
    }

    if (parsed.data.subtotalFcfa < coupon.min_order_fcfa) {
      return NextResponse.json(
        {
          error: `Montant minimum requis : ${coupon.min_order_fcfa.toLocaleString("fr-FR")} FCFA.`,
        },
        { status: 400 }
      );
    }

    const discountFcfa =
      coupon.discount_type === "PERCENTAGE"
        ? Math.round((targetBaseFcfa * coupon.discount_value) / 100)
        : Math.min(targetBaseFcfa, coupon.discount_value);

    return NextResponse.json({
      valid: true,
      code: coupon.code,
      discountFcfa,
      finalTotalFcfa: Math.max(0, parsed.data.subtotalFcfa - discountFcfa),
      label:
        coupon.discount_type === "PERCENTAGE"
          ? `-${coupon.discount_value}%`
          : `-${coupon.discount_value.toLocaleString("fr-FR")} FCFA`,
    });
  } catch {
    return NextResponse.json({ error: "Erreur lors de la vérification du code." }, { status: 500 });
  }
}
