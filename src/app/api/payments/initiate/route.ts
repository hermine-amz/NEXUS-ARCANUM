import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/security/auth";
import { initiateOrderPayment } from "@/lib/services/payment/gateway-manager";

const InitiateSchema = z.object({
  orderId: z.string().min(1),
  gatewayCode: z.string().optional(),
  operator: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = InitiateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Paramètres de paiement invalides." }, { status: 400 });
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      req.headers.get("origin") ||
      "http://localhost:3000";

    const result = await initiateOrderPayment({
      orderId: parsed.data.orderId,
      gatewayCode: parsed.data.gatewayCode,
      operator: parsed.data.operator,
      baseUrl,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          isDemoBlocked: Boolean((result as { isDemoBlocked?: boolean }).isDemoBlocked),
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      payment: result.payment,
      redirectUrl: result.redirectUrl,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Erreur lors de l'initialisation du paiement.", details: String(err) },
      { status: 500 }
    );
  }
}

