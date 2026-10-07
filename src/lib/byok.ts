import crypto from "crypto";

const PREFIX = "v2:";

function secret(): string {
  const value = process.env.BYOK_ENCRYPTION_KEY;
  if (!value || value.length < 32) throw new Error("BYOK_ENCRYPTION_KEY must be configured with at least 32 characters");
  return value;
}

function getKey(): Buffer {
  return crypto.createHash("sha256").update(secret(), "utf8").digest();
}

export function encryptApiKey(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return PREFIX + iv.toString("hex") + ":" + cipher.getAuthTag().toString("hex") + ":" + encrypted.toString("hex");
}

export function decryptApiKey(value: string): string {
  if (value.startsWith(PREFIX)) {
    const parts = value.slice(PREFIX.length).split(":");
    if (parts.length !== 3) throw new Error("Invalid encrypted API key format");
    const [ivHex, tagHex, ciphertextHex] = parts;
    const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    return Buffer.concat([decipher.update(Buffer.from(ciphertextHex, "hex")), decipher.final()]).toString("utf8");
  }

  const oldKey = secret();
  if (!/^[0-9a-f]{64}$/i.test(oldKey)) throw new Error("Legacy keys require the original 64-character hexadecimal key");
  const [ivHex, tagHex, ciphertextHex] = value.split(":");
  if (!ivHex || !tagHex || ciphertextHex === undefined) throw new Error("Invalid encrypted API key format");
  const decipher = crypto.createDecipheriv("aes-256-gcm", Buffer.from(oldKey, "hex"), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextHex, "hex")), decipher.final()]).toString("utf8");
}

export function maskApiKey(key: string): string {
  if (key.length <= 8) return "****";
  return key.slice(0, 3) + "*".repeat(Math.min(8, key.length - 7)) + key.slice(-4);
}
