import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

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

    await prisma.newsletterSubscriber.upsert({
      where: { email: parsed.data.email.toLowerCase().trim() },
      update: { lang: parsed.data.lang },
      create: {
        email: parsed.data.email.toLowerCase().trim(),
        lang: parsed.data.lang,
      },
    });

    return NextResponse.json({ ok: true, message: "Inscription confirmée !" });
  } catch {
    return NextResponse.json(
      { error: "Impossible d'enregistrer l'inscription pour le moment." },
      { status: 500 }
    );
  }
}

