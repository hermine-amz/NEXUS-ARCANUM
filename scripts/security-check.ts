import assert from "assert";
import {
  encryptSecrets,
  decryptSecrets,
  signDownloadToken,
  verifyDownloadToken,
  hashPassword,
  verifyPassword,
} from "../src/lib/security/crypto";
import { checkRateLimit } from "../src/lib/security/rate-limit";
import { createSessionToken, verifySessionToken } from "../src/lib/security/auth";

async function run() {
  console.log("Running NEXUSARCANUM SHOP security verification suite...");

  // 1. AES-256-GCM secrets encryption & tamper detection
  const original = { apiKey: "sk_live_test_12345", webhookSecret: "whsec_abc" };
  const encrypted = encryptSecrets(original);
  assert(encrypted.split(":").length === 3, "AES-256-GCM format iv:tag:data expected");
  const decrypted = decryptSecrets(encrypted);
  assert.strictEqual(decrypted.apiKey, original.apiKey, "Decrypted apiKey must match");
  assert.strictEqual(decrypted.webhookSecret, original.webhookSecret, "Decrypted webhookSecret must match");

  let tamperedFailed = false;
  try {
    const parts = encrypted.split(":");
    parts[2] = parts[2].slice(0, -2) + (parts[2].endsWith("00") ? "ff" : "00");
    decryptSecrets(parts.join(":"));
  } catch {
    tamperedFailed = true;
  }
  assert(tamperedFailed, "Tampered AES-256-GCM ciphertext must throw");

  // 2. Download token HMAC-SHA256 signing, expiry, tamper
  const token = signDownloadToken({
    userId: "u1",
    entitlementId: "e1",
    assetId: "a1",
    exp: Date.now() + 60_000,
  });
  const decoded = verifyDownloadToken(token);
  assert(decoded && decoded.userId === "u1" && decoded.assetId === "a1", "Valid download token must verify");

  const expiredToken = signDownloadToken({
    userId: "u1",
    entitlementId: "e1",
    assetId: "a1",
    exp: Date.now() - 1000,
  });
  assert.strictEqual(verifyDownloadToken(expiredToken), null, "Expired download token must be rejected");
  assert.strictEqual(verifyDownloadToken(token + "x"), null, "Tampered download token must be rejected");

  // 3. Rate limiter
  const key = "test_ip_1";
  assert.strictEqual(checkRateLimit({ key, maxRequests: 2, windowMs: 10_000 }).allowed, true);
  assert.strictEqual(checkRateLimit({ key, maxRequests: 2, windowMs: 10_000 }).allowed, true);
  assert.strictEqual(checkRateLimit({ key, maxRequests: 2, windowMs: 10_000 }).allowed, false);

  // 4. JWT Session
  const jwt = await createSessionToken({
    userId: "u1",
    email: "admin@nexusarcanum.shop",
    firstName: "Admin",
    lastName: "Test",
    roles: ["SUPER_ADMIN"],
  });
  const session = await verifySessionToken(jwt);
  assert(session && session.email === "admin@nexusarcanum.shop", "Valid JWT must verify");
  assert.strictEqual(await verifySessionToken(jwt + "tamper"), null, "Tampered JWT must be rejected");

  // 5. Password hashing
  const hash = await hashPassword("NexusTest2026!");
  assert.strictEqual(await verifyPassword("NexusTest2026!", hash), true);
  assert.strictEqual(await verifyPassword("WrongPass", hash), false);

  console.log("ALL 5 SECURITY CHECKS PASSED.");
}

run().catch((err) => {
  console.error("Security check failed:", err);
  process.exit(1);
});

