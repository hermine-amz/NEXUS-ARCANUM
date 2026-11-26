import crypto from "crypto";
import bcrypt from "bcryptjs";

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const rawKey = process.env.PAYMENT_ENCRYPTION_KEY;
  if (!rawKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("PAYMENT_ENCRYPTION_KEY manquant en production.");
    }
    return Buffer.from(
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      "hex"
    );
  }
  if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
    return Buffer.from(rawKey, "hex");
  }
  return crypto.createHash("sha256").update(rawKey).digest();
}

function getDownloadSigningSecret(): string {
  const secret = process.env.DOWNLOAD_SIGNING_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("DOWNLOAD_SIGNING_SECRET manquant en production.");
    }
    return "dev-download-hmac-signing-secret-2026";
  }
  return secret;
}

/**
 * Chiffre un objet de configuration sensible (clés API, secrets webhooks) via AES-256-GCM.
 */
export function encryptSecrets(payload: Record<string, string | undefined>): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const json = JSON.stringify(payload);
  const encrypted = Buffer.concat([cipher.update(json, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Déchiffre les secrets d'un agrégateur stockés en base.
 * Retourne un objet vide si le chiffrement est absent ou issu d'une ancienne clé,
 * afin de ne jamais bloquer l'affichage des agrégateurs dans l'administration.
 */
export function decryptSecrets(cipherText: string | null | undefined): Record<string, string> {
  if (!cipherText) return {};
  const parts = cipherText.split(":");
  if (parts.length !== 3) return {};
  try {
    const [ivHex, tagHex, dataHex] = parts;
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataHex, "hex")),
      decipher.final(),
    ]);
    return JSON.parse(decrypted.toString("utf8")) as Record<string, string>;
  } catch {
    return {};
  }
}

/**
 * Signe un jeton temporaire HMAC-SHA256 pour le téléchargement sécurisé d'un fichier privé.
 */
export function signDownloadToken(payload: {
  userId: string;
  entitlementId: string;
  assetId: string;
  exp: number;
}): string {
  const secret = getDownloadSigningSecret();
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

/**
 * Vérifie et décode un jeton de téléchargement temporaire.
 */
export function verifyDownloadToken(token: string): {
  userId: string;
  entitlementId: string;
  assetId: string;
  exp: number;
} | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const secret = getDownloadSigningSecret();
  const expectedSig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
    if (typeof parsed.exp !== "number" || Date.now() > parsed.exp) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

