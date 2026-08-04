import { auth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { name, description, transport, server_url, command, args, env_vars } = body;
    if (!name || !transport) return Response.json({ error: "name and transport are required" }, { status: 400 });
    const supabase = await createClient();
    const { data, error } = await supabase.from("mcp_servers").insert({ user_id: session.user.id, name, description: description || null, transport, server_url: server_url || null, command: command || null, args: args || null, env_vars: env_vars || null, is_active: true }).select("id").single();
    if (error) throw error;
    return Response.json({ id: data.id }, { status: 201 });
  } catch (error: any) { return Response.json({ error: error.message }, { status: 500 }); }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const supabase = await createClient();
    const { data, error } = await supabase.from("mcp_servers").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false });
    if (error) throw error;
    return Response.json(data || []);
  } catch (error: any) { return Response.json({ error: error.message }, { status: 500 }); }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { id, is_active } = body;
    if (!id) return Response.json({ error: "id is required" }, { status: 400 });
    const supabase = await createClient();
    const { error } = await supabase.from("mcp_servers").update({ is_active }).eq("id", id).eq("user_id", session.user.id);
    if (error) throw error;
    return Response.json({ message: "Updated" });
  } catch (error: any) { return Response.json({ error: error.message }, { status: 500 }); }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return Response.json({ error: "id parameter required" }, { status: 400 });
    const supabase = await createClient();
    const { error } = await supabase.from("mcp_servers").delete().eq("id", id).eq("user_id", session.user.id);
    if (error) throw error;
    return Response.json({ message: "Deleted" });
  } catch (error: any) { return Response.json({ error: error.message }, { status: 500 }); }
}
