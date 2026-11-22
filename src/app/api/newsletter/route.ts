import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSupabaseAdmin, newId } from "@/lib/supabase";

const NewsletterSchema = z.object({
  email: z.string().email("Adresse email invalide"),
  lang: z.enum(["fr", "en"]).default("fr"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = NewsletterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Email invalide." }, { status: 400 });
    }

    const supabase = requireSupabaseAdmin();
    const email = parsed.data.email.toLowerCase().trim();
    const { data: existing } = await supabase
      .from("newsletter_subscribers")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("newsletter_subscribers")
        .update({ lang: parsed.data.lang })
        .eq("id", existing.id);
    } else {
      await supabase.from("newsletter_subscribers").insert({
        id: newId(),
        email,
        lang: parsed.data.lang,
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ ok: true, message: "Inscription confirmée !" });
  } catch {
    return NextResponse.json(
      { error: "Impossible d'enregistrer l'inscription pour le moment." },
      { status: 500 }
    );
  }
}
