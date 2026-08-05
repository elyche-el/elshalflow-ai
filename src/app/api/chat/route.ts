import { NextRequest } from "next/server";
import { getDefaultKey, ensureAnonUser } from "@/lib/byok-anon";
import { getServiceClient } from "@/lib/supabase/anon-client";
import { ALL_TOOLS } from "@/lib/tools";
import { getComposioActions } from "@/lib/composio/client";
import { getMcpTools } from "@/lib/mcp/client";
function sse(d: string) { return new TextEncoder().encode(`data: ${d}\n\n`); }
function j(d: any, s: number) { return new Response(JSON.stringify(d), { status: s, headers: { "Content-Type": "application/json" } }); }
const P: Record<string, { baseUrl: string; extra: Record<string, string> }> = {
  openrouter: { baseUrl: "https://openrouter.ai/api/v1/chat/completions", extra: { "HTTP-Referer": "https://elshalflow-ai.vercel.app", "X-Title": "ElshalflowAI" } },
  mistral: { baseUrl: "https://api.mistral.ai/v1/chat/completions", extra: {} },
};
const STABLE = new Set(["mistral-large-latest","deepseek/deepseek-chat-v3-0324","openai/gpt-4o-mini","anthropic/claude-3.5-sonnet","google/gemini-2.5-pro-preview-06-05"]);
function resolveModel(mid: string): string { if (STABLE.has(mid)) return mid; if (mid.startsWith("mistral-")) { console.warn(`[ModelRouter] Unstable "${mid}" → mistral-large-latest`); return "mistral-large-latest"; } return mid; }
const VK = ["gemma","gpt-4o","claude","omni","vl","vision","qwen-vl","pixtral","llava","gemini","multimodal","mistral-large"];
function isV(id: string) { return VK.some(k => id.toLowerCase().includes(k)); }
async function rk(pv: string, u: string, d: string): Promise<string> { if (d) return d; if (u) { await ensureAnonUser(u); const k = await getDefaultKey(u); if (k) return k; } if (pv === "openrouter") return process.env.OPENROUTER_API_KEY || ""; if (pv === "mistral") return process.env.MISTRAL_API_KEY || "eF8PjxVog3VLU3FBHk2WMp4ZnVO8eeTG"; return ""; }

interface UT { name: string; source: "builtin"|"composio"|"mcp"; definition: any; execute: (p: Record<string, any>) => Promise<any>; simulate: (p: Record<string, any>) => string; }
async function buildTools(userId: string): Promise<UT[]> {
  const r: UT[] = [];
  for (const t of ALL_TOOLS) r.push({ name: t.name, source: "builtin", definition: t, execute: (p: Record<string, any>) => t.execute(p), simulate: (p: Record<string, any>) => t.simulate(p) });
  if (userId) { try { const ct = await getComposioActions(userId); for (const [n, d] of Object.entries(ct)) r.push({ name: n, source: "composio", definition: d, execute: (d as any).execute || (async () => ({ success: true })), simulate: () => `Composio: ${n}` }); } catch {} }
  if (userId) { try { const mt = await getMcpTools(userId); for (const [n, d] of Object.entries(mt)) r.push({ name: n, source: "mcp", definition: d, execute: (d as any).execute || (async () => ({ success: true })), simulate: () => `MCP: ${n}` }); } catch {} }
  return r;
}
function buildOAI(registry: UT[]) { return registry.map(t => ({ type: "function" as const, function: { name: t.name, description: t.definition.description || `${t.source}:${t.name}`, parameters: t.definition.parameters ? { type: "object", properties: Object.fromEntries(Object.entries(t.definition.parameters).map(([k, v]: [string, any]) => [k, { type: v.type, description: v.description }])), required: Object.entries(t.definition.parameters).filter(([, v]: [string, any]) => v.required).map(([k]) => k) } : { type: "object", properties: {} } } })); }

export async function POST(req: NextRequest) { try {
  const { messages, model, apiKey: dk, conversationId, provider = "openrouter", tools: reqTools } = await req.json();
  const anonId = req.headers.get("x-anon-user-id") || "";
  const c = P[provider]; if (!c) return j({ response: `Provider: ${provider}` }, 400);
  const key = await rk(provider, anonId, dk); if (!key) return j({ response: `Pas de cle pour ${provider}` }, 200);
  const rawModel = model || "mistral-large-latest";
  const mid = provider === "mistral" ? resolveModel(rawModel) : rawModel;
  const vis = isV(mid);
  const nm = messages.map((m: any) => { if (!Array.isArray(m.content)) return m; if (vis) return { ...m, content: m.content }; const t = m.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n"); return { ...m, content: t || "[Image]" }; });
  const registry = await buildTools(anonId);
  const lastMsg = nm[nm.length - 1];
  const hasTools = reqTools && Array.isArray(reqTools) && reqTools.length > 0;
  const shouldUseTools = hasTools && registry.length > 0 && typeof lastMsg?.content === "string" && /envoie|cr[ée]e|publie|connecte|cr[ée]e|envoie|publie/i.test(lastMsg.content);
  const payload: any = { model: mid, messages: nm, max_tokens: 2048, stream: true };
  if (shouldUseTools && registry.length > 0) payload.tools = buildOAI(registry);
  const h: Record<string, string> = { "Content-Type": "application/json", Authorization: `Bearer ${key}`, ...c.extra };
  const up = await fetch(c.baseUrl, { method: "POST", headers: h, body: JSON.stringify(payload) });
  if (!up.ok) { const t = await up.text(); let msg = `Erreur ${up.status}`; try { msg = JSON.parse(t).error?.message || JSON.parse(t).detail || msg; } catch {} return j({ response: msg }, 500); }
  const stream = new ReadableStream({ async start(ctrl) {
    const r = up.body?.getReader(); if (!r) { ctrl.enqueue(sse(JSON.stringify({ error: "Stream off" }))); ctrl.close(); return; }
    ctrl.enqueue(sse(":connected\n")); const d = new TextDecoder(); let fc = ""; let b = ""; let tcs: any[] = [];
    try { while (true) { const { done, value } = await r.read(); if (done) break; b += d.decode(value, { stream: true }); const ls = b.split("\n"); b = ls.pop() || "";
      for (const l of ls) { const t = l.trim(); if (!t || !t.startsWith("data: ")) continue; const dd = t.slice(6);
        if (dd === "[DONE]") {
          for (const tc of tcs) { const tool = registry.find(x => x.name === tc.function.name); if (tool) { try { const args = JSON.parse(tc.function.arguments || "{}"); ctrl.enqueue(sse(JSON.stringify({ type: "tool_call", tool: tc.function.name, status: "executing", args }))); const res = tool.simulate(args); ctrl.enqueue(sse(JSON.stringify({ type: "tool_result", tool: tc.function.name, result: res }))); } catch (e: any) { ctrl.enqueue(sse(JSON.stringify({ type: "tool_error", tool: tc.function.name, error: e.message }))); } } }
          if (conversationId && anonId && fc) { try { const sb = getServiceClient(); const ut = typeof messages?.[messages.length - 1]?.content === "string" ? messages[messages.length - 1].content : "[Message]"; await sb.from("anon_messages").insert([{ conversation_id: conversationId, role: "user", content: ut, model: mid, provider }, { conversation_id: conversationId, role: "assistant", content: fc, model: mid, provider }]); } catch {} }
          ctrl.enqueue(sse(JSON.stringify({ done: true, model: mid }))); continue;
        }
        try { const p = JSON.parse(dd); const delta = p.choices?.[0]?.delta;
          if (delta?.content) { fc += delta.content; ctrl.enqueue(sse(JSON.stringify({ type: "text", delta: delta.content, model: mid }))); }
          if (delta?.tool_calls) { for (const tc of delta.tool_calls) { const idx = tc.index || 0; if (!tcs[idx]) tcs[idx] = { ...tc }; else { tcs[idx].function.name += tc.function?.name || ""; tcs[idx].function.arguments += tc.function?.arguments || ""; } ctrl.enqueue(sse(JSON.stringify({ type: "tool_call", tool: tc.function?.name, index: idx }))); } }
        } catch {} }
      } } catch (err: any) { ctrl.enqueue(sse(JSON.stringify({ error: err.message }))); }
    ctrl.enqueue(sse(JSON.stringify({ done: true, full: fc, model: mid }))); ctrl.close();
  } });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" } });
} catch (e: any) { return j({ response: `Erreur: ${e.message}` }, 500); } }
