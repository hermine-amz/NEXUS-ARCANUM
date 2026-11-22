import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";

export async function GET() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({
      status: "degraded",
      database: "disconnected",
      message: "SUPABASE_SERVICE_ROLE_KEY manquant",
    });
  }

  const { error } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true });

  if (error) {
    return NextResponse.json({
      status: "degraded",
      database: "disconnected",
      message: error.message,
    });
  }

  return NextResponse.json({ status: "ok", database: "supabase-connected" });
}
