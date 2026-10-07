import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { getServiceClient } from "@/lib/supabase/anon-client";

const PREFIX = "v2:";

function secret(): string {
  const value = process.env.BYOK_ENCRYPTION_KEY;
  if (!value || value.length < 32) throw new Error("BYOK_ENCRYPTION_KEY must be configured with at least 32 characters");
  return value;
}

function key(): Buffer {
  return createHash("sha256").update(secret(), "utf8").digest();
}

function enc(value: string): string {
  if (!value) return "";
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return PREFIX + iv.toString("hex") + ":" + cipher.getAuthTag().toString("hex") + ":" + encrypted.toString("hex");
}

function dec(value: string): string {
  if (!value) return "";
  if (value.startsWith(PREFIX)) {
    const parts = value.slice(PREFIX.length).split(":");
    if (parts.length !== 3) throw new Error("Invalid encrypted API key format");
    const [iv, tag, encrypted] = parts;
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "hex"));
    decipher.setAuthTag(Buffer.from(tag, "hex"));
    return Buffer.concat([decipher.update(Buffer.from(encrypted, "hex")), decipher.final()]).toString("utf8");
  }

  // Keep legacy reads for existing rows; all new values use authenticated AES-GCM.
  const legacyKey = Buffer.from(secret(), "utf8");
  const encrypted = Buffer.from(value, "base64");
  const decrypted = Buffer.alloc(encrypted.length);
  for (let i = 0; i < encrypted.length; i++) decrypted[i] = encrypted[i] ^ legacyKey[i % legacyKey.length];
  return decrypted.toString("utf8");
}

export async function saveApiKey(uid: string, pv: string, lb: string, rawKey: string, df: boolean) {
  const sb = getServiceClient();
  if (df) await sb.from("anon_api_keys").update({ is_default: false }).eq("anon_user_id", uid).eq("provider", pv);
  const { data, error } = await sb.from("anon_api_keys").upsert({
    anon_user_id: uid, provider: pv, label: lb, encrypted_key: enc(rawKey),
    is_default: df, updated_at: new Date().toISOString(),
  }, { onConflict: "anon_user_id,provider,label" }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getApiKeys(uid: string) {
  const sb = getServiceClient();
  const { data, error } = await sb.from("anon_api_keys").select("*").eq("anon_user_id", uid).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map((row: any) => ({ ...row, decrypted_key: dec(row.encrypted_key) }));
}

export async function deleteApiKey(uid: string, kid: string) {
  const sb = getServiceClient();
  const { error } = await sb.from("anon_api_keys").delete().eq("id", kid).eq("anon_user_id", uid);
  if (error) throw new Error(error.message);
}

export async function getDefaultKey(uid: string): Promise<string> {
  const sb = getServiceClient();
  const { data, error } = await sb.from("anon_api_keys").select("encrypted_key").eq("anon_user_id", uid).eq("is_default", true).maybeSingle();
  if (error) throw new Error(error.message);
  if (data?.encrypted_key) return dec(data.encrypted_key);
  const { data: fallback, error: fallbackError } = await sb.from("anon_api_keys").select("encrypted_key").eq("anon_user_id", uid).limit(1).maybeSingle();
  if (fallbackError) throw new Error(fallbackError.message);
  return fallback?.encrypted_key ? dec(fallback.encrypted_key) : "";
}

export async function ensureAnonUser(uid: string) {
  if (!uid || uid.length > 128) throw new Error("Invalid anonymous user ID");
  const sb = getServiceClient();
  const { data, error } = await sb.from("anon_users").select("id").eq("id", uid).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    const { error: insertError } = await sb.from("anon_users").insert({ id: uid, last_seen_at: new Date().toISOString() });
    if (insertError) throw new Error(insertError.message);
    return;
  }
  const { error: updateError } = await sb.from("anon_users").update({ last_seen_at: new Date().toISOString() }).eq("id", uid);
  if (updateError) throw new Error(updateError.message);
}
