import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSupabaseAdmin } from "@/lib/supabase";
import { verifyPassword } from "@/lib/security/crypto";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/security/auth";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = checkRateLimit({ key: `login:${ip}`, maxRequests: 10, windowMs: 15 * 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Trop de tentatives. Réessayez dans ${rl.retryAfterSeconds}s.` },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Identifiants invalides." }, { status: 400 });
    }

    const supabase = requireSupabaseAdmin();
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", parsed.data.email.toLowerCase().trim())
      .maybeSingle();

    if (error || !user || !user.is_active) {
      return NextResponse.json({ error: "Email ou mot de passe incorrect." }, { status: 401 });
    }

    const valid = await verifyPassword(parsed.data.password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "Email ou mot de passe incorrect." }, { status: 401 });
    }

    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("role_id")
      .eq("user_id", user.id);

    let roles: string[] = [];
    if (userRoles && userRoles.length > 0) {
      const { data: roleRows } = await supabase
        .from("roles")
        .select("name")
        .in(
          "id",
          userRoles.map((r) => r.role_id)
        );
      roles = (roleRows || []).map((r) => r.name);
    }

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      roles,
    });

    const res = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        roles,
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
        error: "Erreur de connexion au serveur Supabase.",
        details: err instanceof Error ? err.message : undefined,
      },
      { status: 500 }
    );
  }
}
