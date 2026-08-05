import { NextRequest } from "next/server";
import { getDefaultKeyForProvider, ensureAnonUser, PROVIDERS, ProviderId } from "@/lib/byok-anon";
import { getServiceClient } from "@/lib/supabase/anon-client";

function sse(data: string) { return new TextEncoder().encode(`data: ${data}\n\n`); }
function jsonResponse(d: any, status: number) { return new Response(JSON.stringify(d), { status, headers: { "Content-Type": "application/json" } }); }

const VISION_MODEL_KEYWORDS = ["gemma","gpt-4o","claude","omni","vl","vision","qwen-vl","pixtral","llava","gemini","multimodal"];
function isVisionModel(modelId: string): boolean { const lower = modelId.toLowerCase(); return VISION_MODEL_KEYWORDS.some(kw => lower.includes(kw)); }

async function streamToSSE(upstream: Response, controller: ReadableStreamDefaultController, modelId: string, meta?: { conversationId?: string; anonId?: string; messages?: any[] }) {
  const reader = upstream.body?.getReader();
  if (!reader) { controller.enqueue(sse(JSON.stringify({ error: "Stream non disponible" }))); controller.close(); return; }
  controller.enqueue(sse(":connected\n"));
  const decoder = new TextDecoder();
  let fullContent = ""; let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n"); buffer = lines.pop() || "";
      for (const line of lines) {
        const t = line.trim(); if (!t || !t.startsWith("data: ")) continue;
        const data = t.slice(6);
        if (data === "[DONE]") {
          if (meta?.conversationId && meta?.anonId && fullContent) {
            try { const sb = getServiceClient(); const userText = typeof meta.messages?.[meta.messages.length - 1]?.content === "string" ? meta.messages[meta.messages.length - 1].content : "[Message]"; await sb.from("anon_messages").insert([{ conversation_id: meta.conversationId, role: "user", content: userText, model: modelId },{ conversation_id: meta.conversationId, role: "assistant", content: fullContent, model: modelId }]); } catch {}
          }
          controller.enqueue(sse(JSON.stringify({ done: true }))); continue;
        }
        try { const parsed = JSON.parse(data); const delta = parsed.choices?.[0]?.delta?.content; if (delta) { fullContent += delta; controller.enqueue(sse(JSON.stringify({ delta, model: modelId }))); } } catch {}
      }
    }
    if (buffer.trim().startsWith("data: ")) { const d = buffer.trim().slice(6); if (d !== "[DONE]") { try { const parsed = JSON.parse(d); const delta = parsed.choices?.[0]?.delta?.content; if (delta) { fullContent += delta; controller.enqueue(sse(JSON.stringify({ delta, model: modelId }))); } } catch {} } }
  } catch (err: any) { controller.enqueue(sse(JSON.stringify({ error: err.message }))); }
  controller.enqueue(sse(JSON.stringify({ done: true, full: fullContent, model: modelId })));
  controller.close();
}

export async function POST(req: NextRequest) {
  try {
    const { messages, model, provider, apiKey: dk, conversationId } = await req.json();
    const anonId = req.headers.get("x-anon-user-id") || "";
    const resolvedProvider: ProviderId = provider && PROVIDERS[provider as ProviderId] ? (provider as ProviderId) : "openrouter";
    const providerConfig = PROVIDERS[resolvedProvider];
    const modelId = model || "nvidia/nemotron-3-super-120b-a12b:free";
    let key = dk || "";
    if (!key && anonId) { await ensureAnonUser(anonId); key = await getDefaultKeyForProvider(anonId, resolvedProvider); }
    if (!key) { if (resolvedProvider === "openrouter") key = process.env.OPENROUTER_API_KEY || ""; else if (resolvedProvider === "agentrouter") key = process.env.AGENTROUTER_API_KEY || ""; }
    if (!key) return jsonResponse({ response: `Aucune cle API ${providerConfig.name}.` }, 200);

    const supportsVision = isVisionModel(modelId);
    const normalizedMessages = messages.map((m: any) => {
      if (!Array.isArray(m.content)) return m;
      if (supportsVision) return { ...m, content: m.content };
      const text = m.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n");
      return { ...m, content: text || "[Image non analysable]" };
    });

    const payload = { model: modelId, messages: normalizedMessages, max_tokens: 2048, stream: true };

    const fetchHeaders: Record<string, string> = { "Content-Type": "application/json", Authorization: `Bearer ${key}` };
    if (resolvedProvider === "openrouter") { fetchHeaders["HTTP-Referer"] = "https://elshalflow-ai.vercel.app"; fetchHeaders["X-Title"] = "ElshalflowAI"; }
    if (resolvedProvider === "agentrouter") { fetchHeaders["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ElshalflowAI/2.0"; }

    const upstream = await fetch(providerConfig.baseUrl, { method: "POST", headers: fetchHeaders, body: JSON.stringify(payload) });

    if (!upstream.ok) {
      const text = await upstream.text();
      let message = `${providerConfig.name} erreur ${upstream.status}`;
      if (resolvedProvider === "agentrouter" && text.includes("<!doctype html")) message = `${providerConfig.name}: WAF/CAPTCHA detecte. L'API AgentRouter necessite un navigateur.`;
      else { try { const err = JSON.parse(text); message = err.error?.message || err.msg || err.message || message; } catch {} }
      return jsonResponse({ response: message }, 500);
    }

    const stream = new ReadableStream({ async start(controller) { await streamToSSE(upstream, controller, modelId, { conversationId, anonId, messages }); } });
    return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no", "Transfer-Encoding": "chunked" } });
  } catch (e: any) { return jsonResponse({ response: `Erreur: ${e.message || "?"}` }, 500); }
}
