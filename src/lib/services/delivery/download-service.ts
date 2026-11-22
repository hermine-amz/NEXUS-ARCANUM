import crypto from "crypto";
import fs from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { signDownloadToken, verifyDownloadToken } from "@/lib/security/crypto";

/**
 * Attribue les droits d'accès numériques après vérification stricte d'une commande payée (ou gratuite).
 */
export async function grantEntitlementsForOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { product: true } },
    },
  });

  if (!order) {
    throw new Error("Commande introuvable");
  }

  // Aucune livraison numérique sans paiement vérifié (sauf produits 100% gratuits à 0 FCFA)
  if (order.status !== "PAID" && order.totalFcfa > 0) {
    throw new Error("Livraison refusée : paiement non vérifié.");
  }

  const created = [];
  for (const item of order.items) {
    const licenseKey = `NXA-${crypto.randomBytes(4).toString("hex").toUpperCase()}-${crypto
      .randomBytes(4)
      .toString("hex")
      .toUpperCase()}`;

    const entitlement = await prisma.digitalEntitlement.upsert({
      where: {
        userId_productId_orderId: {
          userId: order.userId,
          productId: item.productId,
          orderId: order.id,
        },
      },
      update: {},
      create: {
        userId: order.userId,
        productId: item.productId,
        orderId: order.id,
        licenseKey,
        maxDownloads: item.product.maxDownloads,
      },
    });
    created.push(entitlement);
  }

  return created;
}

/**
 * Génère un lien temporaire signé (valide 10 minutes) pour un actif privé.
 */
export async function createTemporaryDownloadLink(params: {
  userId: string;
  entitlementId: string;
  assetId: string;
}) {
  const entitlement = await prisma.digitalEntitlement.findFirst({
    where: {
      id: params.entitlementId,
      userId: params.userId,
      isRevoked: false,
    },
    include: {
      product: { include: { assets: true } },
    },
  });

  if (!entitlement) {
    return { ok: false, error: "Droit d'accès introuvable ou révoqué." };
  }

  if (entitlement.expiresAt && entitlement.expiresAt < new Date()) {
    return { ok: false, error: "Votre licence de téléchargement a expiré." };
  }

  if (entitlement.downloadCount >= entitlement.maxDownloads) {
    return {
      ok: false,
      error: `Limite de téléchargements atteinte (${entitlement.maxDownloads}/${entitlement.maxDownloads}).`,
    };
  }

  const asset = entitlement.product.assets.find(
    (a) => a.id === params.assetId && a.assetKind === "FULL_PRODUCT"
  );
  if (!asset) {
    return { ok: false, error: "Fichier numérique introuvable pour ce produit." };
  }

  const token = signDownloadToken({
    userId: params.userId,
    entitlementId: entitlement.id,
    assetId: asset.id,
    exp: Date.now() + 10 * 60 * 1000, // 10 minutes
  });

  return {
    ok: true,
    url: `/api/library/download?token=${encodeURIComponent(token)}`,
    expiresInSeconds: 600,
  };
}

/**
 * Vérifie un jeton temporaire, applique un filigrane facultatif et lit le fichier privé.
 */
export async function serveProtectedAsset(params: {
  token: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const decoded = verifyDownloadToken(params.token);
  if (!decoded) {
    return { ok: false, status: 403, error: "Lien de téléchargement invalide ou expiré." };
  }

  const entitlement = await prisma.digitalEntitlement.findFirst({
    where: {
      id: decoded.entitlementId,
      userId: decoded.userId,
      isRevoked: false,
    },
    include: {
      user: true,
      product: true,
    },
  });

  if (!entitlement || entitlement.downloadCount >= entitlement.maxDownloads) {
    return { ok: false, status: 403, error: "Quota de téléchargements épuisé ou accès révoqué." };
  }

  const asset = await prisma.digitalAsset.findUnique({
    where: { id: decoded.assetId },
  });
  if (!asset) {
    return { ok: false, status: 404, error: "Fichier introuvable." };
  }

  const privateRoot = path.resolve(process.cwd(), "storage", "private");
  const fileNameOnly = path.basename(asset.storagePath);
  const diskPath = path.resolve(privateRoot, fileNameOnly);

  if (!diskPath.startsWith(privateRoot + path.sep) || !fs.existsSync(diskPath)) {
    return { ok: false, status: 404, error: "Fichier absent du stockage privé." };
  }

  let fileBuffer: Uint8Array = fs.readFileSync(diskPath);

  // Filigrane facultatif sur les PDF si activé sur le produit
  if (entitlement.product.watermarkEnabled && asset.mimeType === "application/pdf") {
    try {
      const pdfDoc = await PDFDocument.load(fileBuffer);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const stamp = `Licence ${entitlement.licenseKey} - ${entitlement.user.email}`;
      for (const page of pdfDoc.getPages()) {
        page.drawText(stamp, {
          x: 40,
          y: 22,
          size: 8,
          font,
          color: rgb(0.45, 0.45, 0.45),
          opacity: 0.7,
          rotate: degrees(0),
        });
      }
      fileBuffer = await pdfDoc.save();
    } catch {
      // Conserve le fichier original si le PDF n'est pas modifiable
    }
  }

  await prisma.$transaction([
    prisma.digitalEntitlement.update({
      where: { id: entitlement.id },
      data: { downloadCount: { increment: 1 } },
    }),
    prisma.download.create({
      data: {
        userId: decoded.userId,
        entitlementId: entitlement.id,
        assetId: asset.id,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    }),
  ]);

  return {
    ok: true,
    buffer: Buffer.from(fileBuffer),
    fileName: asset.fileName,
    mimeType: asset.mimeType,
  };
}

