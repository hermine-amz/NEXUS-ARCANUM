import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "nxa_session";

export interface SessionPayload {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

function getJwtSecret(): Uint8Array {
  const secret =
    process.env.JWT_SECRET || "dev-nexusarcanum-jwt-secret-key-2026-do-not-use-in-prod";
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getCurrentSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export function isAdminSession(session: SessionPayload | null): boolean {
  if (!session) return false;
  return session.roles.some((r) => r === "SUPER_ADMIN" || r === "ADMIN" || r === "EDITOR");
}

