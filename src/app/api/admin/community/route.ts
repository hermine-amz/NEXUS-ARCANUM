import { NextResponse } from "next/server";
import { requireSupabaseAdmin, newId } from "@/lib/supabase";
import { getCurrentSession, isAdminSession } from "@/lib/security/auth";

export async function GET() {
  const session = await getCurrentSession();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  try {
    const supabase = requireSupabaseAdmin();
    const [{ data: reviews }, { data: users }, { data: products }, { data: subscribers }] =
      await Promise.all([
        supabase.from("reviews").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("users").select("id, first_name, last_name, email"),
        supabase.from("products").select("id, title_fr, slug"),
        supabase
          .from("newsletter_subscribers")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(500),
      ]);

    const userMap = new Map(
      (users || []).map((u) => [u.id, `${u.first_name} ${u.last_name} (${u.email})`])
    );
    const prodMap = new Map((products || []).map((p) => [p.id, p.title_fr]));

    return NextResponse.json({
      reviews: (reviews || []).map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        isApproved: r.is_approved,
        author: userMap.get(r.user_id) || "Lecteur",
        productTitle: prodMap.get(r.product_id) || "Ouvrage",
        createdAt: r.created_at,
      })),
      subscribers: (subscribers || []).map((s) => ({
        id: s.id,
        email: s.email,
        lang: s.lang || "fr",
        createdAt: s.created_at,
      })),
    });
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
  if (!body.id || typeof body.isApproved !== "boolean") {
    return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
  }

  const supabase = requireSupabaseAdmin();
  await supabase
    .from("reviews")
    .update({ is_approved: body.isApproved })
    .eq("id", body.id);

  await supabase.from("audit_logs").insert({
    id: newId(),
    user_id: session!.userId,
    action: body.isApproved ? "REVIEW_APPROVED" : "REVIEW_HIDDEN",
    entity_type: "Review",
    entity_id: body.id,
    created_at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await getCurrentSession();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const id = searchParams.get("id");
  if (!id || !type) return NextResponse.json({ error: "Paramètres requis." }, { status: 400 });

  const supabase = requireSupabaseAdmin();
  if (type === "review") {
    await supabase.from("reviews").delete().eq("id", id);
    await supabase.from("audit_logs").insert({
      id: newId(),
      user_id: session!.userId,
      action: "REVIEW_DELETED",
      entity_type: "Review",
      entity_id: id,
      created_at: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true });
  }

  if (type === "subscriber") {
    await supabase.from("newsletter_subscribers").delete().eq("id", id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Type inconnu." }, { status: 400 });
}
