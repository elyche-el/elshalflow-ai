import { NextRequest, NextResponse } from "next/server";
import { saveApiKey, getApiKeys, deleteApiKey, ensureAnonUser, PROVIDERS, ProviderId } from "@/lib/byok-anon";

export async function GET(req: NextRequest) {
  const anonId = req.headers.get("x-anon-user-id") || "";
  if (!anonId) return NextResponse.json({ error: "Missing anon user ID" }, { status: 400 });
  await ensureAnonUser(anonId);
  const keys = await getApiKeys(anonId);
  const virtualKeys: any[] = [];
  if ((!keys || keys.length === 0) || !keys.some((k: any) => k.provider === "openrouter")) {
    if (process.env.OPENROUTER_API_KEY) virtualKeys.push({ id: "server-or", provider: "openrouter", label: "OpenRouter (Server)", is_default: !keys?.length, virtual: true });
  }
  if ((!keys || keys.length === 0) || !keys.some((k: any) => k.provider === "agentrouter")) {
    if (process.env.AGENTROUTER_API_KEY) virtualKeys.push({ id: "server-ar", provider: "agentrouter", label: "AgentRouter (Server)", is_default: false, virtual: true });
  }
  return NextResponse.json({ keys: [...(keys || []), ...virtualKeys], providers: Object.values(PROVIDERS).map((p: any) => ({ id: p.id, name: p.name })) });
}

export async function POST(req: NextRequest) {
  const anonId = req.headers.get("x-anon-user-id") || "";
  if (!anonId) return NextResponse.json({ error: "Missing anon user ID" }, { status: 400 });
  await ensureAnonUser(anonId);
  const { provider, label, key, is_default } = await req.json();
  if (!provider || !key) return NextResponse.json({ error: "provider and key required" }, { status: 400 });
  if (!PROVIDERS[provider as ProviderId]) return NextResponse.json({ error: `Unknown provider: ${provider}` }, { status: 400 });
  const data = await saveApiKey(anonId, provider, label || PROVIDERS[provider as ProviderId].name, key, !!is_default);
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
