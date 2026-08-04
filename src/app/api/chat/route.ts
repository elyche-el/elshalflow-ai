import type { NextRequest } from "next/server";
const DEMO_KEY = process.env.OPENROUTER_API_KEY || "";
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, model } = body;
    const requestBody: any = { model: model || "openai/gpt-4o-mini", messages: messages || [], stream: true };
    const isVision = (model || "").includes("vision") || (model || "").includes("gpt-4o") || (model || "").includes("claude-3") || (model || "").includes("gemini");
    if (!isVision) requestBody.messages = requestBody.messages.map((m: any) => Array.isArray(m.content) ? { ...m, content: m.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n") } : m);
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${DEMO_KEY}`, "HTTP-Referer": "https://elshalflow-ai.vercel.app", "X-Title": "ElshalflowAI" }, body: JSON.stringify(requestBody) });
    return new Response(response.body, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } });
  } catch (error: any) { return Response.json({ error: error.message }, { status: 500 }); }
}
