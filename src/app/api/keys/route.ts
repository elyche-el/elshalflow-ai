import { NextRequest, NextResponse } from "next/server";
import { saveApiKey, getApiKeys, deleteApiKey, ensureAnonUser } from "@/lib/byok-anon";

export async function GET(req: NextRequest) {
  const anonId = req.headers.get("x-anon-user-id") || "";
  if (!anonId) return NextResponse.json({ error: "Missing anon user ID" }, { status: 400 });
  await ensureAnonUser(anonId);
  const keys = (await getApiKeys(anonId)) || [];
  if (!keys.length) {
    const v: any[] = [];
    if (process.env.OPENROUTER_API_KEY) v.push({ id: "server-or", provider: "openrouter", label: "Server Key (OR)", is_default: true, virtual: true });
    if (process.env.MISTRAL_API_KEY) v.push({ id: "server-m", provider: "mistral", label: "Server Key (Mistral)", is_default: false, virtual: true });
    if (v.length) return NextResponse.json({ keys: v });
  }
  return NextResponse.json({ keys });
}

export async function POST(req: NextRequest) {
  const anonId = req.headers.get("x-anon-user-id") || "";
  if (!anonId) return NextResponse.json({ error: "Missing anon user ID" }, { status: 400 });
  await ensureAnonUser(anonId);
  const { provider, label, key, is_default } = await req.json();
  if (!provider || !key) return NextResponse.json({ error: "provider and key required" }, { status: 400 });
  const pv = provider === "mistral" ? "mistral" : "openrouter";
  const data = await saveApiKey(anonId, pv, label || pv, key, !!is_default);
  return NextResponse.json({ ok: true, id: data.id, provider: pv });
}

export async function DELETE(req: NextRequest) {
  const anonId = req.headers.get("x-anon-user-id") || "";
  if (!anonId) return NextResponse.json({ error: "Missing anon user ID" }, { status: 400 });
  const { keyId } = await req.json();
  if (!keyId) return NextResponse.json({ error: "keyId required" }, { status: 400 });
  await deleteApiKey(anonId, keyId);
  return NextResponse.json({ ok: true });
}
