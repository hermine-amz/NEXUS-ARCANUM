import crypto from "crypto";
import fs from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import { requireSupabaseAdmin, newId } from "@/lib/supabase";
import { signDownloadToken, verifyDownloadToken } from "@/lib/security/crypto";

export async function grantEntitlementsForOrder(orderId: string) {
  const supabase = requireSupabaseAdmin();

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (orderErr || !order) {
    throw new Error("Commande introuvable");
  }

  if (order.status !== "PAID" && order.total_fcfa > 0) {
    throw new Error("Livraison refusée : paiement non vérifié.");
  }

  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", orderId);

  const created = [];
  const now = new Date().toISOString();

  for (const item of items || []) {
    const { data: existing } = await supabase
      .from("digital_entitlements")
      .select("*")
      .eq("user_id", order.user_id)
      .eq("product_id", item.product_id)
      .eq("order_id", order.id)
      .maybeSingle();

    if (existing) {
      created.push(existing);
      continue;
    }

    const { data: prod } = await supabase
      .from("products")
      .select("max_downloads")
      .eq("id", item.product_id)
      .maybeSingle();

    const licenseKey = `NXA-${crypto.randomBytes(4).toString("hex").toUpperCase()}-${crypto
      .randomBytes(4)
      .toString("hex")
      .toUpperCase()}`;

    const { data: ent, error } = await supabase
      .from("digital_entitlements")
      .insert({
        id: newId(),
        user_id: order.user_id,
        product_id: item.product_id,
        order_id: order.id,
        license_key: licenseKey,
        max_downloads: prod?.max_downloads ?? 5,
        download_count: 0,
        is_revoked: false,
        granted_at: now,
      })
      .select("*")
      .single();

    if (!error && ent) created.push(ent);
  }

  return created;
}

export async function createTemporaryDownloadLink(params: {
  userId: string;
  entitlementId: string;
  assetId: string;
}) {
  const supabase = requireSupabaseAdmin();

  const { data: entitlement } = await supabase
    .from("digital_entitlements")
    .select("*")
    .eq("id", params.entitlementId)
    .eq("user_id", params.userId)
    .eq("is_revoked", false)
    .maybeSingle();

  if (!entitlement) {
    return { ok: false, error: "Droit d'accès introuvable ou révoqué." };
  }

  if (entitlement.expires_at && new Date(entitlement.expires_at) < new Date()) {
    return { ok: false, error: "Votre licence de téléchargement a expiré." };
  }

  if (entitlement.download_count >= entitlement.max_downloads) {
    return {
      ok: false,
      error: `Limite de téléchargements atteinte (${entitlement.max_downloads}/${entitlement.max_downloads}).`,
    };
  }

  const { data: asset } = await supabase
    .from("digital_assets")
    .select("*")
    .eq("id", params.assetId)
    .eq("product_id", entitlement.product_id)
    .eq("asset_kind", "FULL_PRODUCT")
    .maybeSingle();

  if (!asset) {
    return { ok: false, error: "Fichier numérique introuvable pour ce produit." };
  }

  const token = signDownloadToken({
    userId: params.userId,
    entitlementId: entitlement.id,
    assetId: asset.id,
    exp: Date.now() + 10 * 60 * 1000,
  });

  return {
    ok: true,
    url: `/api/library/download?token=${encodeURIComponent(token)}`,
    expiresInSeconds: 600,
  };
}

export async function serveProtectedAsset(params: {
  token: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const decoded = verifyDownloadToken(params.token);
  if (!decoded) {
    return { ok: false, status: 403, error: "Lien de téléchargement invalide ou expiré." };
  }

  const supabase = requireSupabaseAdmin();

  const { data: entitlement } = await supabase
    .from("digital_entitlements")
    .select("*")
    .eq("id", decoded.entitlementId)
    .eq("user_id", decoded.userId)
    .eq("is_revoked", false)
    .maybeSingle();

  if (!entitlement || entitlement.download_count >= entitlement.max_downloads) {
    return { ok: false, status: 403, error: "Quota de téléchargements épuisé ou accès révoqué." };
  }

  const { data: asset } = await supabase
    .from("digital_assets")
    .select("*")
    .eq("id", decoded.assetId)
    .maybeSingle();

  if (!asset) {
    return { ok: false, status: 404, error: "Fichier introuvable." };
  }

  const privateRoot = path.resolve(process.cwd(), "storage", "private");
  const fileNameOnly = path.basename(asset.storage_path);
  const diskPath = path.resolve(privateRoot, fileNameOnly);

  let fileBuffer: Uint8Array | null = null;

  // 1. Lecture depuis Supabase Storage (recommandé sur Vercel)
  const bucket = process.env.SUPABASE_PRIVATE_BUCKET || "private-assets";
  const { data: blob, error: dlErr } = await supabase.storage
    .from(bucket)
    .download(fileNameOnly);
  if (!dlErr && blob) {
    fileBuffer = new Uint8Array(await blob.arrayBuffer());
  }

  // 2. Fallback stockage local
  if (!fileBuffer) {
    if (!diskPath.startsWith(privateRoot + path.sep) || !fs.existsSync(diskPath)) {
      return { ok: false, status: 404, error: "Fichier absent du stockage privé." };
    }
    fileBuffer = fs.readFileSync(diskPath);
  }

  const [{ data: product }, { data: user }] = await Promise.all([
    supabase
      .from("products")
      .select("watermark_enabled")
      .eq("id", entitlement.product_id)
      .maybeSingle(),
    supabase.from("users").select("email").eq("id", decoded.userId).maybeSingle(),
  ]);

  if (product?.watermark_enabled && asset.mime_type === "application/pdf") {
    try {
      const pdfDoc = await PDFDocument.load(fileBuffer);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const stamp = `Licence ${entitlement.license_key} - ${user?.email || ""}`;
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
      // Conserve le fichier original
    }
  }

  await Promise.all([
    supabase
      .from("digital_entitlements")
      .update({ download_count: entitlement.download_count + 1 })
      .eq("id", entitlement.id),
    supabase.from("downloads").insert({
      id: newId(),
      user_id: decoded.userId,
      entitlement_id: entitlement.id,
      asset_id: asset.id,
      ip_address: params.ipAddress ?? null,
      user_agent: params.userAgent ?? null,
      downloaded_at: new Date().toISOString(),
    }),
  ]);

  return {
    ok: true,
    buffer: Buffer.from(fileBuffer),
    fileName: asset.file_name,
    mimeType: asset.mime_type,
  };
}
