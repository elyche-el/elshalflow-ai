import { auth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { encryptApiKey } from "@/lib/byok";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { provider, label, api_key, is_default } = body;
    if (!provider || !label || !api_key) return Response.json({ error: "provider, label, and api_key are required" }, { status: 400 });
    const encrypted = encryptApiKey(api_key);
    const supabase = await createClient();
    if (is_default) {
      await supabase.from("api_keys").update({ is_default: false }).eq("user_id", session.user.id).eq("provider", provider);
    }
    const { data, error } = await supabase.from("api_keys").insert({ user_id: session.user.id, provider, label, encrypted_key: encrypted, is_default: is_default || false }).select("id").single();
    if (error) throw error;
    return Response.json({ id: data.id, message: "API key added" }, { status: 201 });
  } catch (error: any) { return Response.json({ error: error.message }, { status: 500 }); }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const supabase = await createClient();
    const { data, error } = await supabase.from("api_keys").select("id, provider, label, is_default, created_at, last_used_at").eq("user_id", session.user.id).order("created_at", { ascending: false });
    if (error) throw error;
    const masked = (data || []).map((k) => ({ ...k, key_preview: "••••••••••••" }));
    return Response.json(masked);
  } catch (error: any) { return Response.json({ error: error.message }, { status: 500 }); }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { id, is_default } = body;
    if (!id || is_default === undefined) return Response.json({ error: "id and is_default required" }, { status: 400 });
    const supabase = await createClient();
    const { data: keyData } = await supabase.from("api_keys").select("provider").eq("id", id).eq("user_id", session.user.id).single();
    if (!keyData) return Response.json({ error: "API key not found" }, { status: 404 });
    await supabase.from("api_keys").update({ is_default: false }).eq("user_id", session.user.id).eq("provider", keyData.provider);
    const { error } = await supabase.from("api_keys").update({ is_default: true }).eq("id", id).eq("user_id", session.user.id);
    if (error) throw error;
    return Response.json({ message: "Default key updated" });
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
    const { error } = await supabase.from("api_keys").delete().eq("id", id).eq("user_id", session.user.id);
    if (error) throw error;
    return Response.json({ message: "API key deleted" });
  } catch (error: any) { return Response.json({ error: error.message }, { status: 500 }); }
}
