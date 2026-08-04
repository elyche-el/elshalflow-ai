import { auth } from "@/lib/auth";
import { streamChat, AVAILABLE_MODELS } from "@/lib/llm/client";
import { createClient } from "@/lib/supabase/server";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { messages, conversationId, model } = body;
    if (!messages || !Array.isArray(messages)) return Response.json({ error: "Messages array required" }, { status: 400 });
    if (conversationId && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === "user") {
        const supabase = await createClient();
        await supabase.from("messages").insert({ conversation_id: conversationId, role: "user", content: lastMsg.content });
      }
    }
    const result = await streamChat({ userId: session.user.id, modelId: model || AVAILABLE_MODELS[0].id, messages });
    return result.toDataStreamResponse({
      onFinish: async ({ text, usage }) => {
        if (conversationId) {
          const supabase = await createClient();
          await supabase.from("messages").insert({ conversation_id: conversationId, role: "assistant", content: text, model: model || AVAILABLE_MODELS[0].id, tokens_used: usage?.totalTokens || null });
          const { data: msgCount } = await supabase.from("messages").select("id", { count: "exact", head: true }).eq("conversation_id", conversationId);
          if (msgCount && (msgCount as any).count <= 2) {
            const title = text.slice(0, 80) + (text.length > 80 ? "..." : "");
            await supabase.from("conversations").update({ title, model: model || null }).eq("id", conversationId);
          }
        }
      },
    });
  } catch (error: any) {
    return Response.json({ error: error.message || "Stream failed" }, { status: 500 });
  }
}
