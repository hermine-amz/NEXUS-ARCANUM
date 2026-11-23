import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME, isAdminSession } from "@/lib/security/auth";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Protection CSRF par vérification Origin/Referer sur les mutations API (hors webhooks externes)
  if (
    pathname.startsWith("/api/") &&
    !pathname.startsWith("/api/payments/webhooks/") &&
    MUTATING_METHODS.has(request.method)
  ) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    if (origin && host) {
      try {
        const originHost = new URL(origin).host;
        if (originHost !== host) {
          return NextResponse.json(
            { error: "Requête cross-origin refusée (protection CSRF)." },
            { status: 403 }
          );
        }
      } catch {
        return NextResponse.json({ error: "Origin invalide." }, { status: 403 });
      }
    }
  }

  // 2. Défense en profondeur RBAC sur /api/admin/*
  if (pathname.startsWith("/api/admin/")) {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;
    if (!isAdminSession(session)) {
      return NextResponse.json(
        { error: "Accès administrateur requis." },
        { status: 403 }
      );
    }
  }

  const response = NextResponse.next();

  // 3. En-têtes de sécurité HTTP (CSP, XSS, Clickjacking, HSTS)
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https://*.supabase.co",
      "connect-src 'self' https://api.maketou.net https://api.sebpay.africa",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")
  );

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

