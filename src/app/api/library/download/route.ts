import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/security/auth";
import {
  createTemporaryDownloadLink,
  serveProtectedAsset,
} from "@/lib/services/delivery/download-service";

const LinkSchema = z.object({
  entitlementId: z.string().min(1),
  assetId: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  const body = await req.json();
  const parsed = LinkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
  }

  const result = await createTemporaryDownloadLink({
    userId: session.userId,
    entitlementId: parsed.data.entitlementId,
    assetId: parsed.data.assetId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }

  return NextResponse.json(result);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Jeton manquant." }, { status: 400 });
  }

  const ipAddress = req.headers.get("x-forwarded-for") || "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";

  const result = await serveProtectedAsset({ token, ipAddress, userAgent });
  if (!result.ok || !result.buffer) {
    return NextResponse.json(
      { error: result.error || "Accès refusé." },
      { status: result.status || 403 }
    );
  }

  return new NextResponse(result.buffer, {
    status: 200,
    headers: {
      "Content-Type": result.mimeType || "application/pdf",
      "Content-Disposition": `attachment; filename="${result.fileName}"`,
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

