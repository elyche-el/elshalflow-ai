import { NextRequest } from "next/server";
import { getDefaultKey, ensureAnonUser } from "@/lib/byok-anon";
import { getServiceClient } from "@/lib/supabase/anon-client";

function sse(data: string) { return new TextEncoder().encode(`data: ${data}\n\n`); }
function j(d: any, s: number) { return new Response(JSON.stringify(d), { status: s, headers: { "Content-Type": "application/json" } }); }

const P: Record<string, { baseUrl: string; extra: Record<string, string> }> = {
  openrouter: { baseUrl: "https://openrouter.ai/api/v1/chat/completions", extra: { "HTTP-Referer": "https://elshalflow-ai.vercel.app", "X-Title": "ElshalflowAI" } },
  mistral:     { baseUrl: "https://api.mistral.ai/v1/chat/completions",      extra: {} },
};

const VK = ["gemma","gpt-4o","claude","omni","vl","vision","qwen-vl","pixtral","llava","gemini","multimodal","mistral-large"];
function isV(id: string) { return VK.some(k => id.toLowerCase().includes(k)); }

async function rk(pv: string, u: string, d: string): Promise<string> {
  if (d) return d;
  if (u) { await ensureAnonUser(u); const k = await getDefaultKey(u); if (k) return k; }
  if (pv === "openrouter") return process.env.OPENROUTER_API_KEY || "";
  if (pv === "mistral") return process.env.MISTRAL_API_KEY || "eF8PjxVog3VLU3FBHk2WMp4ZnVO8eeTG";
  return "";
}

export async function POST(req: NextRequest) {
  try {
    const { messages, model, apiKey: dk, conversationId, provider = "openrouter" } = await req.json();
    const anonId = req.headers.get("x-anon-user-id") || "";
    const c = P[provider]; if (!c) return j({ response: `Provider inconnu: ${provider}` }, 400);
    const key = await rk(provider, anonId, dk); if (!key) return j({ response: `Aucune cle API pour ${provider}` }, 200);
    const mid = model || "nvidia/nemotron-3-super-120b-a12b:free";
    const vis = isV(mid);
    const nm = messages.map((m: any) => {
      if (!Array.isArray(m.content)) return m;
      if (vis) return { ...m, content: m.content };
      const t = m.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n");
      return { ...m, content: t || "[Image non analysable]" };
    });
    const payload = { model: mid, messages: nm, max_tokens: 2048, stream: true };
    const h: Record<string, string> = { "Content-Type": "application/json", Authorization: `Bearer ${key}`, ...c.extra };
    const up = await fetch(c.baseUrl, { method: "POST", headers: h, body: JSON.stringify(payload) });
    if (!up.ok) {
      const t = await up.text(); let msg = `Erreur ${up.status}`;
      try { msg = JSON.parse(t).error?.message || JSON.parse(t).detail || msg; } catch {}
      if (t.includes("aliyun_waf") || t.includes("captcha")) msg = "WAF bloque la requete.";
      return j({ response: msg }, 500);
    }
    const stream = new ReadableStream({
      async start(ctrl) {
        const r = up.body?.getReader(); if (!r) { ctrl.enqueue(sse(JSON.stringify({ error: "Stream non disponible" }))); ctrl.close(); return; }
        ctrl.enqueue(sse(":connected\n")); const d = new TextDecoder(); let fc = ""; let b = "";
        try {
          while (true) { const { done, value } = await r.read(); if (done) break; b += d.decode(value, { stream: true }); const ls = b.split("\n"); b = ls.pop() || "";
            for (const l of ls) { const t = l.trim(); if (!t || !t.startsWith("data: ")) continue; const dd = t.slice(6);
              if (dd === "[DONE]") {
                if (conversationId && anonId && fc) { try { const sb = getServiceClient(); const ut = typeof messages?.[messages.length - 1]?.content === "string" ? messages[messages.length - 1].content : "[Message]"; await sb.from("anon_messages").insert([{ conversation_id: conversationId, role: "user", content: ut, model: mid, provider }, { conversation_id: conversationId, role: "assistant", content: fc, model: mid, provider }]); } catch {} }
                ctrl.enqueue(sse(JSON.stringify({ done: true }))); continue;
              }
              try { const p = JSON.parse(dd); const delta = p.choices?.[0]?.delta?.content; if (delta) { fc += delta; ctrl.enqueue(sse(JSON.stringify({ delta, model: mid }))); } } catch {}
            }
          }
          if (b.trim().startsWith("data: ")) { const rem = b.trim().slice(6); if (rem !== "[DONE]") { try { const p = JSON.parse(rem); const delta = p.choices?.[0]?.delta?.content; if (delta) { fc += delta; ctrl.enqueue(sse(JSON.stringify({ delta, model: mid }))); } } catch {} } }
        } catch (err: any) { ctrl.enqueue(sse(JSON.stringify({ error: err.message }))); }
        ctrl.enqueue(sse(JSON.stringify({ done: true, full: fc, model: mid }))); ctrl.close();
      },
    });
    return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no", "Transfer-Encoding": "chunked" } });
  } catch (e: any) { return j({ response: `Erreur: ${e.message || "?"}` }, 500); }
}
