import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/security/auth";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  try {
    const entitlements = await prisma.digitalEntitlement.findMany({
      where: { userId: session.userId, isRevoked: false },
      include: {
        product: {
          include: {
            author: true,
            category: true,
            assets: { where: { assetKind: "FULL_PRODUCT" } },
          },
        },
        order: { select: { reference: true, paidAt: true, totalFcfa: true } },
      },
      orderBy: { grantedAt: "desc" },
    });
    return NextResponse.json({ entitlements });
  } catch (err) {
    return NextResponse.json(
      { error: "Erreur lecture bibliothèque.", details: String(err) },
      { status: 500 }
    );
  }
}

