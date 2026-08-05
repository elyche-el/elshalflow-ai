import { NextRequest } from "next/server";
import { getDefaultKey, ensureAnonUser } from "@/lib/byok-anon";
import { getServiceClient } from "@/lib/supabase/anon-client";

function sse(data: string) {
  return new TextEncoder().encode(`data: ${data}\n\n`);
}

function j(d: any, s: number) {
  return new Response(JSON.stringify(d), { status: s, headers: { "Content-Type": "application/json" } });
}

const OPENROUTER = "https://openrouter.ai/api/v1/chat/completions";

const VISION_MODELS = [
  "gemma", "gpt-4o", "claude", "omni", "vl", "vision",
  "qwen-vl", "pixtral", "llava", "gemini-2.5"
];

export async function POST(req: NextRequest) {
  try {
    const { messages, model, apiKey: dk, conversationId } = await req.json();
    const anonId = req.headers.get("x-anon-user-id") || "";

    let key = dk || "";
    if (!key && anonId) {
      await ensureAnonUser(anonId);
      key = await getDefaultKey(anonId);
    }
    if (!key) key = process.env.OPENROUTER_API_KEY || "";
    if (!key) return j({ response: "Aucune cle API." }, 200);

    const modelId = model || "nvidia/nemotron-3-super-120b-a12b:free";
    const isVision = VISION_MODELS.some(v => modelId.toLowerCase().includes(v));

    const body: any = {
      model: modelId,
      messages: messages.map((m: any) => {
        if (Array.isArray(m.content)) {
          if (isVision) return { ...m, content: m.content };
          return { ...m, content: m.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n") };
        }
        return m;
      }),
      max_tokens: 2048,
      stream: true,
    };

    const resp = await fetch(OPENROUTER, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, "HTTP-Referer": "https://elshalflow-ai.vercel.app", "X-Title": "ElshalflowAI" },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const e = await resp.text();
      let msg = `Erreur ${resp.status}`;
      try { msg = JSON.parse(e).error?.message || msg; } catch {}
      return j({ response: msg }, 500);
    }

    const stream = new ReadableStream({
      async start(controller) {
        const reader = resp.body?.getReader();
        if (!reader) { controller.enqueue(sse(JSON.stringify({ error: "No stream" }))); controller.close(); return; }
        controller.enqueue(sse(":ok\n"));
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
                if (conversationId && anonId && fullContent) {
                  try { const sb = getServiceClient(); await sb.from("anon_messages").insert([{ conversation_id: conversationId, role: "user", content: typeof messages?.[messages.length - 1]?.content === "string" ? messages[messages.length - 1].content : "[Message]", model: modelId },{ conversation_id: conversationId, role: "assistant", content: fullContent, model: modelId }]); } catch {}
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
      },
    });

    return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", "Connection": "keep-alive", "X-Accel-Buffering": "no" } });
  } catch (e: any) {
    return j({ response: "Erreur: " + (e.message || "?") }, 500);
  }
}
