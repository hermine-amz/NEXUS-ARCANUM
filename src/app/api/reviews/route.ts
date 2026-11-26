import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSupabaseAdmin, newId } from "@/lib/supabase";
import { getCurrentSession } from "@/lib/security/auth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");
  if (!productId) return NextResponse.json({ reviews: [] });

  try {
    const supabase = requireSupabaseAdmin();
    const [{ data: reviews }, { data: users }] = await Promise.all([
      supabase
        .from("reviews")
        .select("*")
        .eq("product_id", productId)
        .eq("is_approved", true)
        .order("created_at", { ascending: false }),
      supabase.from("users").select("id, first_name, last_name"),
    ]);

    const userMap = new Map(
      (users || []).map((u) => [u.id, `${u.first_name} ${u.last_name.charAt(0)}.`])
    );

    return NextResponse.json({
      reviews: (reviews || []).map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        authorName: userMap.get(r.user_id) || "Lecteur",
        createdAt: r.created_at,
      })),
    });
  } catch {
    return NextResponse.json({ reviews: [] });
  }
}

const ReviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().min(5, "Votre avis doit contenir au moins 5 caractères").max(1500),
});

export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json(
      { error: "Connectez-vous pour publier un avis." },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const parsed = ReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Avis invalide." },
        { status: 400 }
      );
    }

    const supabase = requireSupabaseAdmin();
    const now = new Date().toISOString();

    const { data: existing } = await supabase
      .from("reviews")
      .select("id")
      .eq("product_id", parsed.data.productId)
      .eq("user_id", session.userId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("reviews")
        .update({
          rating: parsed.data.rating,
          comment: parsed.data.comment.trim(),
          is_approved: false,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("reviews").insert({
        id: newId(),
        product_id: parsed.data.productId,
        user_id: session.userId,
        rating: parsed.data.rating,
        comment: parsed.data.comment.trim(),
        is_approved: false,
        created_at: now,
      });
    }

    return NextResponse.json({
      ok: true,
      pending: true,
      message: "Merci ! Votre avis est en attente de validation par l'équipe.",
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
