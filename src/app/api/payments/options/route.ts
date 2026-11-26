import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";

export async function GET() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({
      routingMode: "MODE_A",
      gateways: [],
    });
  }

  try {
    const [{ data: setting }, { data: gateways }] = await Promise.all([
      supabase
        .from("site_settings")
        .select("value")
        .eq("key", "payment_routing_mode")
        .maybeSingle(),
      supabase
        .from("payment_gateways")
        .select(
          "code, name, description, is_default, supported_currencies, supported_countries, supported_operators, fee_percent, priority"
        )
        .eq("is_active", true)
        .order("is_default", { ascending: false })
        .order("priority", { ascending: true }),
    ]);

    return NextResponse.json({
      routingMode: "MODE_A",
      gateways: (gateways || []).map((g) => ({
        code: g.code,
        name: g.name,
        description: g.description || "",
        isDefault: g.is_default,
        supportedCurrencies: g.supported_currencies || ["XOF"],
        supportedCountries: g.supported_countries || ["BJ"],
        supportedOperators: g.supported_operators || ["MTN", "MOOV", "CARD"],
        feePercent: g.fee_percent ?? 0,
      })),
    });
  } catch {
    return NextResponse.json({ routingMode: "MODE_A", gateways: [] });
  }
}
