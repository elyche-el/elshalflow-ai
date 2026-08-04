import { auth } from "@/lib/auth";
import { streamChatResponse, AVAILABLE_MODELS } from "@/lib/llm/client";
import { createClient } from "@/lib/supabase/server";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { messages, conversationId, model } = body;
    if (!messages || !Array.isArray(messages)) return Response.json({ error: "Messages required" }, { status: 400 });
    if (conversationId && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === "user") {
        const supabase = await createClient();
        await supabase.from("messages").insert({ conversation_id: conversationId, role: "user", content: lastMsg.content });
      }
    }
    return streamChatResponse({ userId: session.user.id, modelId: model || AVAILABLE_MODELS[0].id, messages });
  } catch (error: any) {
    return Response.json({ error: error.message || "Stream failed" }, { status: 500 });
  }
}
