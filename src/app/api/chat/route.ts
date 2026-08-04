// ============================================================
// ElshalflowAI — Chat API Route (Streaming)
// ============================================================

import { auth } from "@/lib/auth";
import { streamChatResponse, AVAILABLE_MODELS } from "@/lib/llm/client";
import { createClient } from "@/lib/supabase/server";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages, conversationId, model } = await req.json();

  if (!messages || !messages.length) {
    return new Response("Messages required", { status: 400 });
  }

  const supabase = createClient();

  // Verify conversation belongs to user
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", session.user.id)
    .single();

  if (!conversation) {
    return new Response("Conversation not found", { status: 404 });
  }

  // Store user message
  await supabase.from("messages").insert({
    conversation_id: conversationId,
    role: "user",
    content: messages[messages.length - 1].content,
  });

  try {
    const result = await streamChatResponse({
      model: model || "openai/gpt-4o-mini",
      messages,
      userId: session.user.id,
      conversationId,
    });

    // Stream the response
    return result.toDataStreamResponse();
  } catch (error: any) {
    console.error("Chat error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
