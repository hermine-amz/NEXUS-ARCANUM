import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession, isAdminSession } from "@/lib/security/auth";

const AdminProductPatchSchema = z.object({
  productId: z.string().min(1),
  action: z.enum([
    "UPDATE",
    "ARCHIVE",
    "UNARCHIVE",
    "TOGGLE_HIDE",
    "DUPLICATE",
    "CONVERT_TO_COMMERCIAL",
  ]),
  titleFr: z.string().optional(),
  shortDescFr: z.string().optional(),
  priceFcfa: z.number().int().min(0).optional(),
  promoPriceFcfa: z.number().int().min(0).nullable().optional(),
  categoryId: z.string().optional(),
  coverUrl: z.string().optional(),
});

export async function GET() {
  const session = await getCurrentSession();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  try {
    const products = await prisma.product.findMany({
      include: { category: true, author: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ products });
  } catch (err) {
    return NextResponse.json(
      { error: "Erreur lecture catalogue admin.", details: String(err) },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const session = await getCurrentSession();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = AdminProductPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
    }

    const d = parsed.data;
    const product = await prisma.product.findUnique({ where: { id: d.productId } });
    if (!product) {
      return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
    }

    if (d.action === "ARCHIVE") {
      await prisma.product.update({
        where: { id: product.id },
        data: { isArchived: true, isPublished: false },
      });
    } else if (d.action === "UNARCHIVE") {
      await prisma.product.update({
        where: { id: product.id },
        data: { isArchived: false, isPublished: true },
      });
    } else if (d.action === "TOGGLE_HIDE") {
      await prisma.product.update({
        where: { id: product.id },
        data: { isHiddenFromPublic: !product.isHiddenFromPublic },
      });
    } else if (d.action === "CONVERT_TO_COMMERCIAL") {
      await prisma.product.update({
        where: { id: product.id },
        data: { isDemo: false, demoNotice: null },
      });
    } else if (d.action === "DUPLICATE") {
      const suffix = crypto.randomBytes(2).toString("hex");
      await prisma.product.create({
        data: {
          ...product,
          id: undefined,
          slug: `${product.slug}-copie-${suffix}`,
          titleFr: `${product.titleFr} (Copie)`,
          titleEn: `${product.titleEn} (Copy)`,
          createdAt: undefined,
          updatedAt: undefined,
        },
      });
    } else if (d.action === "UPDATE") {
      await prisma.product.update({
        where: { id: product.id },
        data: {
          titleFr: d.titleFr ?? product.titleFr,
          shortDescFr: d.shortDescFr ?? product.shortDescFr,
          priceFcfa: d.priceFcfa ?? product.priceFcfa,
          promoPriceFcfa: d.promoPriceFcfa !== undefined ? d.promoPriceFcfa : product.promoPriceFcfa,
          categoryId: d.categoryId ?? product.categoryId,
          coverUrl: d.coverUrl ?? product.coverUrl,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: session!.userId,
        action: `PRODUCT_${d.action}`,
        entityType: "Product",
        entityId: product.id,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Erreur mise à jour produit.", details: String(err) },
      { status: 500 }
    );
  }
}

