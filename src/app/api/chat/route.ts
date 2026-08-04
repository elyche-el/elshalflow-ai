import { auth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { messages, conversationId } = body;
    if (conversationId && messages?.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === "user") {
        const supabase = await createClient();
        await supabase.from("messages").insert({ conversation_id: conversationId, role: "user", content: lastMsg.content });
      }
    }
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENROUTER_API_KEY || "demo"}` },
      body: JSON.stringify({ model: "openai/gpt-4o-mini", messages, stream: true }),
    });
    return new Response(response.body, { headers: { "Content-Type": "text/event-stream" } });
  } catch (error: any) {
    return Response.json({ error: error.message || "Stream failed" }, { status: 500 });
  }
}
