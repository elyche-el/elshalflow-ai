"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import type { McpServer, McpTransport } from "@/types";
import { Shield, Plus, Trash2, Server, Globe, Terminal, Wifi } from "lucide-react";
import { Toaster, toast } from "sonner";
import { cn } from "@/lib/utils";

const TRANSPORT_LABELS: Record<McpTransport, string> = { sse: "SSE", stdio: "STDIO", websocket: "WebSocket" };
const TRANSPORT_ICONS: Record<McpTransport, typeof Globe> = { sse: Globe, stdio: Terminal, websocket: Wifi };

export default function McpPage() {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [transport, setTransport] = useState<McpTransport>("sse");
  const [serverUrl, setServerUrl] = useState("");
  const [command, setCommand] = useState("");

  const loadServers = useCallback(async () => {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser(); if (!userData.user) return;
    const { data } = await supabase.from("mcp_servers").select("*").eq("user_id", userData.user.id).order("created_at", { ascending: false });
    if (data) setServers(data); setLoading(false);
  }, []);

  useEffect(() => { loadServers(); }, [loadServers]);

  async function addServer(e: React.FormEvent) {
    e.preventDefault(); setSubmitting(true);
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser(); if (!userData.user) throw new Error("Not authenticated");
      const { error } = await supabase.from("mcp_servers").insert({ user_id: userData.user.id, name, description: description || null, transport, server_url: transport === "sse" ? serverUrl : null, command: transport === "stdio" ? command : null, is_active: true });
      if (error) throw error;
      toast.success("Serveur MCP ajouté");
      setDialogOpen(false); setName(""); setDescription(""); setServerUrl(""); setCommand("");
      loadServers();
    } catch (err: any) { toast.error(err.message || "Erreur"); }
    finally { setSubmitting(false); }
  }

  async function toggleServer(serverId: string, currentActive: boolean) {
    const supabase = createClient();
    const { error } = await supabase.from("mcp_servers").update({ is_active: !currentActive }).eq("id", serverId);
    if (error) toast.error("Erreur"); else { toast.success(currentActive ? "Serveur désactivé" : "Serveur activé"); loadServers(); }
  }

  async function deleteServer(serverId: string) {
    if (!confirm("Supprimer ce serveur MCP ?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("mcp_servers").delete().eq("id", serverId);
    if (error) toast.error("Erreur"); else { toast.success("Serveur supprimé"); loadServers(); }
  }

  return (
    <div className="flex flex-col h-full">
      <Toaster richColors theme="dark" position="top-center" />
      <header className="h-14 flex items-center justify-between px-6 border-b border-border shrink-0"><div className="flex items-center gap-3"><Shield className="h-5 w-5 text-primary" /><h2 className="font-semibold text-sm">Serveurs MCP</h2></div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" />Ajouter un serveur</Button></DialogTrigger>
          <DialogContent>
            <form onSubmit={addServer}>
              <DialogHeader><DialogTitle>Ajouter un serveur MCP</DialogTitle><DialogDescription>Configurez un serveur Model Context Protocol.</DialogDescription></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2"><Label>Nom du serveur</Label><Input placeholder="Mon serveur MCP" value={name} onChange={(e) => setName(e.target.value)} required /></div>
                <div className="space-y-2"><Label>Description</Label><Input placeholder="Fournit des outils de recherche web..." value={description} onChange={(e) => setDescription(e.target.value)} /></div>
                <div className="space-y-2"><Label>Transport</Label><Select value={transport} onValueChange={(v) => setTransport(v as McpTransport)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sse">SSE (Server-Sent Events)</SelectItem><SelectItem value="stdio">STDIO (Process)</SelectItem><SelectItem value="websocket">WebSocket</SelectItem></SelectContent></Select></div>
                {transport === "sse" && <div className="space-y-2"><Label>URL du serveur</Label><Input placeholder="https://mcp.example.com/sse" value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} required /></div>}
                {transport === "stdio" && <div className="space-y-2"><Label>Commande</Label><Input placeholder="npx @anthropic/mcp-server-brave" value={command} onChange={(e) => setCommand(e.target.value)} required /></div>}
              </div>
              <DialogFooter><Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>Annuler</Button><Button type="submit" disabled={submitting}>{submitting ? "Ajout..." : "Ajouter"}</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </header>
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (<div className="grid gap-4 max-w-3xl">{[1,2].map((i) => (<Card key={i} className="animate-pulse"><CardContent className="h-24" /></Card>))}</div>) : servers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4"><div className="p-6 rounded-2xl bg-primary/5 ring-1 ring-primary/10"><Server className="h-12 w-12 text-primary/50" /></div><h3 className="text-lg font-semibold">Aucun serveur MCP</h3><p className="text-muted-foreground text-sm max-w-md">Ajoutez des serveurs MCP pour étendre les capacités du chatbot.</p><Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Ajouter votre premier serveur</Button></div>
        ) : (
          <div className="grid gap-4 max-w-3xl">{servers.map((server) => { const TransportIcon = TRANSPORT_ICONS[server.transport]; return (<Card key={server.id} className={cn("transition-all", server.is_active && "border-primary/20", !server.is_active && "opacity-60")}><CardContent className="p-4"><div className="flex items-start justify-between"><div className="flex items-start gap-3 flex-1"><div className={cn("p-2 rounded-lg shrink-0", server.is_active ? "bg-primary/10" : "bg-secondary")}><TransportIcon className={cn("h-5 w-5", server.is_active ? "text-primary" : "text-muted-foreground")} /></div><div className="flex-1 min-w-0"><div className="flex items-center gap-2"><h4 className="font-medium text-sm">{server.name}</h4><Badge variant={server.is_active ? "default" : "secondary"} className="text-[10px]">{server.is_active ? "Actif" : "Inactif"}</Badge></div>{server.description && <p className="text-xs text-muted-foreground mt-0.5">{server.description}</p>}<div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground"><span className="flex items-center gap-1"><Globe className="h-3 w-3" />{TRANSPORT_LABELS[server.transport]}</span>{server.server_url && <code className="bg-secondary px-1.5 py-0.5 rounded text-[10px] truncate max-w-[200px]">{server.server_url}</code>}</div></div></div><div className="flex items-center gap-1 shrink-0"><Switch checked={server.is_active} onCheckedChange={() => toggleServer(server.id, server.is_active)} /><Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteServer(server.id)}><Trash2 className="h-4 w-4" /></Button></div></div></CardContent></Card>); })}</div>
        )}
      </div>
    </div>
  );
}
