import { NextRequest } from "next/server";
import { getDefaultKey, ensureAnonUser } from "@/lib/byok-anon";
import { getServiceClient } from "@/lib/supabase/anon-client";

function sse(data: string) {
  return new TextEncoder().encode(`data: ${data}\n\n`);
}

function jsonResponse(d: any, status: number) {
  return new Response(JSON.stringify(d), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const OPENROUTER = "https://openrouter.ai/api/v1/chat/completions";

const VISION_MODEL_KEYWORDS = [
  "gemma", "gpt-4o", "claude", "omni", "vl", "vision",
  "qwen-vl", "pixtral", "llava", "gemini", "multimodal",
];

function isVisionModel(modelId: string): boolean {
  const lower = modelId.toLowerCase();
  return VISION_MODEL_KEYWORDS.some(kw => lower.includes(kw));
}

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
    if (!key) return jsonResponse({ response: "Aucune cle API." }, 200);

    const modelId = model || "nvidia/nemotron-3-super-120b-a12b:free";
    const supportsVision = isVisionModel(modelId);

    const normalizedMessages = messages.map((m: any) => {
      if (!Array.isArray(m.content)) return m;
      if (supportsVision) return { ...m, content: m.content };
      const text = m.content
        .filter((c: any) => c.type === "text")
        .map((c: any) => c.text)
        .join("\n");
      return { ...m, content: text || "[Image non analysable — utilisez un modele Vision]" };
    });

    const payload = {
      model: modelId,
      messages: normalizedMessages,
      max_tokens: 2048,
      stream: true,
    };

    const upstream = await fetch(OPENROUTER, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "HTTP-Referer": "https://elshalflow-ai.vercel.app",
        "X-Title": "ElshalflowAI",
      },
      body: JSON.stringify(payload),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      let message = `Erreur ${upstream.status}`;
      try { message = JSON.parse(text).error?.message || message; } catch {}
      return jsonResponse({ response: message }, 500);
    }

    const stream = new ReadableStream({
      async start(controller) {
        const reader = upstream.body?.getReader();
        if (!reader) {
          controller.enqueue(sse(JSON.stringify({ error: "Stream non disponible" })));
          controller.close();
          return;
        }

        controller.enqueue(sse(":connected\n"));

        const decoder = new TextDecoder();
        let fullContent = "";
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data: ")) continue;
              const data = trimmed.slice(6);

              if (data === "[DONE]") {
                if (conversationId && anonId && fullContent) {
                  try {
                    const sb = getServiceClient();
                    const userText =
                      typeof messages?.[messages.length - 1]?.content === "string"
                        ? messages[messages.length - 1].content
                        : "[Message]";
                    await sb.from("anon_messages").insert([
                      { conversation_id: conversationId, role: "user", content: userText, model: modelId },
                      { conversation_id: conversationId, role: "assistant", content: fullContent, model: modelId },
                    ]);
                  } catch {}
                }
                controller.enqueue(sse(JSON.stringify({ done: true })));
                continue;
              }

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  fullContent += delta;
                  controller.enqueue(sse(JSON.stringify({ delta, model: modelId })));
                }
              } catch {}
            }
          }

          if (buffer.trim().startsWith("data: ")) {
            const remaining = buffer.trim().slice(6);
            if (remaining !== "[DONE]") {
              try {
                const parsed = JSON.parse(remaining);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  fullContent += delta;
                  controller.enqueue(sse(JSON.stringify({ delta, model: modelId })));
                }
              } catch {}
            }
          }
        } catch (err: any) {
          controller.enqueue(sse(JSON.stringify({ error: err.message })));
        }

        controller.enqueue(sse(JSON.stringify({ done: true, full: fullContent, model: modelId })));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (e: any) {
    return jsonResponse({ response: `Erreur: ${e.message || "?"}` }, 500);
  }
}
