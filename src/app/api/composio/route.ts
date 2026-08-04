import { auth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { NextRequest } from "next/server";

const COMPOSIO_API_KEY = process.env.COMPOSIO_API_KEY!;
const COMPOSIO_BASE_URL = "https://backend.composio.dev/api/v1";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { app_name } = body;
    if (!app_name) return Response.json({ error: "app_name is required" }, { status: 400 });
    const res = await fetch(`${COMPOSIO_BASE_URL}/connectedAccounts`, {
      method: "POST",
      headers: { "X-API-Key": COMPOSIO_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ integrationId: app_name, entityId: session.user.id, redirectUri: `${process.env.AUTH_URL}/composio/callback` }),
    });
    if (!res.ok) { const err = await res.json(); throw new Error(err.message || "Composio API error"); }
    const data = await res.json();
    const supabase = await createClient();
    await supabase.from("composio_configs").upsert({ user_id: session.user.id, app_name, integration_id: data.integrationId || null, connection_id: data.connectionId || null, is_connected: false }, { onConflict: "user_id,app_name" });
    return Response.json({ connectionId: data.connectionId, redirectUrl: data.redirectUrl });
  } catch (error: any) { return Response.json({ error: error.message }, { status: 500 }); }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const supabase = await createClient();
    const { data, error } = await supabase.from("composio_configs").select("*").eq("user_id", session.user.id).eq("is_connected", true).order("created_at", { ascending: false });
    if (error) throw error;
    return Response.json(data || []);
  } catch (error: any) { return Response.json({ error: error.message }, { status: 500 }); }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { app_name } = body;
    if (!app_name) return Response.json({ error: "app_name is required" }, { status: 400 });
    const supabase = await createClient();
    const { data: config } = await supabase.from("composio_configs").select("connection_id").eq("user_id", session.user.id).eq("app_name", app_name).single();
    if (config?.connection_id) {
      await fetch(`${COMPOSIO_BASE_URL}/connectedAccounts/${config.connection_id}`, { method: "DELETE", headers: { "X-API-Key": COMPOSIO_API_KEY } });
    }
    await supabase.from("composio_configs").delete().eq("user_id", session.user.id).eq("app_name", app_name);
    return Response.json({ message: "Disconnected" });
  } catch (error: any) { return Response.json({ error: error.message }, { status: 500 }); }
}
