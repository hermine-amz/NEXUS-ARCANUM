import { NextResponse } from "next/server";
import { requireSupabaseAdmin } from "@/lib/supabase";
import { getCurrentSession, isAdminSession } from "@/lib/security/auth";

export async function GET() {
  const session = await getCurrentSession();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  try {
    const supabase = requireSupabaseAdmin();
    const [{ data: logs }, { data: users }] = await Promise.all([
      supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("users").select("id, email, first_name, last_name"),
    ]);

    const userMap = new Map(
      (users || []).map((u) => [u.id, `${u.first_name} ${u.last_name} (${u.email})`])
    );

    return NextResponse.json({
      logs: (logs || []).map((l) => ({
        id: l.id,
        action: l.action,
        entityType: l.entity_type,
        entityId: l.entity_id,
        actor: (l.user_id && userMap.get(l.user_id)) || "Système",
        createdAt: l.created_at,
      })),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
