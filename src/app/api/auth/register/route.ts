import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSupabaseAdmin, newId } from "@/lib/supabase";
import { hashPassword } from "@/lib/security/crypto";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/security/auth";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";

const RegisterSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une majuscule")
    .regex(/[a-z]/, "Le mot de passe doit contenir au moins une minuscule")
    .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre"),
  firstName: z.string().min(2, "Prénom requis"),
  lastName: z.string().min(2, "Nom requis"),
  phone: z.string().optional(),
  country: z.string().default("BJ"),
});

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = checkRateLimit({ key: `register:${ip}`, maxRequests: 5, windowMs: 15 * 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Trop de créations de compte. Réessayez dans ${rl.retryAfterSeconds}s.` },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Données invalides" },
        { status: 400 }
      );
    }

    const supabase = requireSupabaseAdmin();
    const email = parsed.data.email.toLowerCase().trim();
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Un compte existe déjà avec cette adresse email." },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    let { data: customerRole } = await supabase
      .from("roles")
      .select("id")
      .eq("name", "CUSTOMER")
      .maybeSingle();

    if (!customerRole) {
      const id = newId();
      await supabase
        .from("roles")
        .insert({ id, name: "CUSTOMER", description: "Client lecteur", created_at: now });
      customerRole = { id };
    }

    const userId = newId();
    const passwordHash = await hashPassword(parsed.data.password);
    const { error: insertErr } = await supabase.from("users").insert({
      id: userId,
      email,
      password_hash: passwordHash,
      first_name: parsed.data.firstName.trim(),
      last_name: parsed.data.lastName.trim(),
      phone: parsed.data.phone?.trim() ?? null,
      country: parsed.data.country,
      preferred_lang: "fr",
      is_active: true,
      created_at: now,
      updated_at: now,
    });

    if (insertErr) {
      return NextResponse.json(
        { error: "Impossible de créer le compte.", details: insertErr.message },
        { status: 500 }
      );
    }

    await supabase
      .from("user_roles")
      .insert({ user_id: userId, role_id: customerRole.id });

    const token = await createSessionToken({
      userId,
      email,
      firstName: parsed.data.firstName.trim(),
      lastName: parsed.data.lastName.trim(),
      roles: ["CUSTOMER"],
    });

    const res = NextResponse.json({
      user: {
        id: userId,
        email,
        firstName: parsed.data.firstName.trim(),
        lastName: parsed.data.lastName.trim(),
        roles: ["CUSTOMER"],
      },
    });

    const isHttps =
      req.url.startsWith("https://") || req.headers.get("x-forwarded-proto") === "https";

    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: isHttps,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (err) {
    return NextResponse.json(
      {
        error: "Impossible de créer le compte (vérifiez Supabase).",
        details: err instanceof Error ? err.message : undefined,
      },
      { status: 500 }
    );
  }
}
