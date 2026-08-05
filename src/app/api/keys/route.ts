import { NextRequest, NextResponse } from "next/server";
import { saveApiKey, getApiKeys, deleteApiKey, ensureAnonUser } from "@/lib/byok-anon";

export async function GET(req: NextRequest) {
  const anonId = req.headers.get("x-anon-user-id") || "";
  if (!anonId) return NextResponse.json({ error: "Missing anon user ID" }, { status: 400 });
  await ensureAnonUser(anonId);
  const keys = await getApiKeys(anonId);
  // If no user keys but server has OPENROUTER_API_KEY, return a virtual key so frontend works
  if ((!keys || keys.length === 0) && process.env.OPENROUTER_API_KEY) {
    return NextResponse.json({ keys: [{ id: "server", provider: "openrouter", label: "Server Key", is_default: true, virtual: true }] });
  }
  return NextResponse.json({ keys });
}

export async function POST(req: NextRequest) {
  const anonId = req.headers.get("x-anon-user-id") || "";
  if (!anonId) return NextResponse.json({ error: "Missing anon user ID" }, { status: 400 });
  await ensureAnonUser(anonId);
  const { provider, label, key, is_default } = await req.json();
  if (!provider || !key) return NextResponse.json({ error: "provider and key required" }, { status: 400 });
  const data = await saveApiKey(anonId, provider, label || "OpenRouter", key, !!is_default);
  return NextResponse.json({ ok: true, id: data.id });
}

export async function DELETE(req: NextRequest) {
  const anonId = req.headers.get("x-anon-user-id") || "";
  if (!anonId) return NextResponse.json({ error: "Missing anon user ID" }, { status: 400 });
  const { keyId } = await req.json();
  if (!keyId) return NextResponse.json({ error: "keyId required" }, { status: 400 });
  await deleteApiKey(anonId, keyId);
  return NextResponse.json({ ok: true });
}
