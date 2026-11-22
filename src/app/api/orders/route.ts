import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/security/auth";
import { grantEntitlementsForOrder } from "@/lib/services/delivery/download-service";

const CreateOrderSchema = z.object({
  productIds: z.array(z.string().min(1)).min(1, "Panier vide"),
  couponCode: z.string().optional(),
  customerPhone: z.string().optional(),
  customerCountry: z.string().default("BJ"),
  idempotencyKey: z.string().optional(),
});

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  try {
    const orders = await prisma.order.findMany({
      where: { userId: session.userId },
      include: {
        items: true,
        payments: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ orders });
  } catch (err) {
    return NextResponse.json(
      { error: "Erreur lecture des commandes.", details: String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json(
      { error: "Veuillez vous connecter pour valider votre commande." },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const parsed = CreateOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Données de commande invalides." },
        { status: 400 }
      );
    }

    // Idempotence contre les doubles commandes
    if (parsed.data.idempotencyKey) {
      const existing = await prisma.order.findUnique({
        where: { idempotencyKey: parsed.data.idempotencyKey },
        include: { items: true },
      });
      if (existing) {
        return NextResponse.json({ order: existing, deduplicated: true });
      }
    }

    const products = await prisma.product.findMany({
      where: {
        id: { in: parsed.data.productIds },
        isPublished: true,
        isArchived: false,
      },
    });

    if (products.length === 0) {
      return NextResponse.json({ error: "Aucun produit valide sélectionné." }, { status: 400 });
    }

    let subtotalFcfa = 0;
    let isDemoOrder = false;

    const orderItemsData = products.map((p) => {
      const unitPrice = p.isFree ? 0 : p.promoPriceFcfa ?? p.priceFcfa;
      subtotalFcfa += unitPrice;
      if (p.isDemo) isDemoOrder = true;
      return {
        productId: p.id,
        titleSnapshot: p.titleFr,
        unitPriceFcfa: unitPrice,
        quantity: 1,
        isDemo: p.isDemo,
      };
    });

    let discountFcfa = 0;
    let couponId: string | null = null;
    if (parsed.data.couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: parsed.data.couponCode.trim().toUpperCase() },
      });
      if (coupon && coupon.isActive && subtotalFcfa >= coupon.minOrderFcfa) {
        couponId = coupon.id;
        discountFcfa =
          coupon.discountType === "PERCENTAGE"
            ? Math.round((subtotalFcfa * coupon.discountValue) / 100)
            : Math.min(subtotalFcfa, coupon.discountValue);
      }
    }

    const totalFcfa = Math.max(0, subtotalFcfa - discountFcfa);
    const reference = `NXA-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${crypto
      .randomBytes(3)
      .toString("hex")
      .toUpperCase()}`;

    // Si la commande est 100% gratuite (produits gratuits uniquement, hors démo payante), livraison directe
    const isZeroFcfa = totalFcfa === 0;

    const order = await prisma.order.create({
      data: {
        reference,
        userId: session.userId,
        couponId,
        subtotalFcfa,
        discountFcfa,
        totalFcfa,
        currency: "XOF",
        status: isZeroFcfa ? "PAID" : "PENDING",
        isDemoOrder,
        idempotencyKey: parsed.data.idempotencyKey || crypto.randomUUID(),
        customerEmail: session.email,
        customerName: `${session.firstName} ${session.lastName}`.trim(),
        customerPhone: parsed.data.customerPhone,
        customerCountry: parsed.data.customerCountry,
        paidAt: isZeroFcfa ? new Date() : null,
        items: { create: orderItemsData },
      },
      include: { items: true },
    });

    if (isZeroFcfa) {
      await grantEntitlementsForOrder(order.id);
    }

    return NextResponse.json({ order });
  } catch (err) {
    return NextResponse.json(
      { error: "Erreur création de commande.", details: String(err) },
      { status: 500 }
    );
  }
}

