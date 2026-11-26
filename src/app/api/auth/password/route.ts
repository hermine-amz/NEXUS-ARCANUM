import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSupabaseAdmin, newId } from "@/lib/supabase";
import { getCurrentSession } from "@/lib/security/auth";
import { verifyPassword, hashPassword } from "@/lib/security/crypto";

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Mot de passe actuel requis"),
  newPassword: z
    .string()
    .min(8, "8 caractères minimum")
    .regex(/[A-Z]/, "Au moins une majuscule")
    .regex(/[a-z]/, "Au moins une minuscule")
    .regex(/[0-9]/, "Au moins un chiffre"),
});

export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = ChangePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Mot de passe trop faible." },
        { status: 400 }
      );
    }

    const supabase = requireSupabaseAdmin();
    const { data: user } = await supabase
      .from("users")
      .select("id, password_hash")
      .eq("id", session.userId)
      .maybeSingle();

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }

    const ok = await verifyPassword(parsed.data.currentPassword, user.password_hash);
    if (!ok) {
      return NextResponse.json({ error: "Mot de passe actuel incorrect." }, { status: 400 });
    }

    const newHash = await hashPassword(parsed.data.newPassword);
    const now = new Date().toISOString();

    await supabase
      .from("users")
      .update({ password_hash: newHash, updated_at: now })
      .eq("id", user.id);

    await supabase.from("audit_logs").insert({
      id: newId(),
      user_id: user.id,
      action: "PASSWORD_CHANGED",
      entity_type: "User",
      entity_id: user.id,
      created_at: now,
    });

    return NextResponse.json({ ok: true, message: "Mot de passe mis à jour avec succès." });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
