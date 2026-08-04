"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Shield, Plus, Trash2, Server, Globe, Terminal, Wifi, WifiOff } from "lucide-react";
import { Toaster, toast } from "sonner";

type McpServer = { id: string; name: string; description: string; transport: string; server_url: string; command: string; is_active: boolean; created_at: string };

export default function McpPage() {
  const [servers, setServers] = useState<McpServer[]>([
    { id:"1", name:"Brave Search", description:"Recherche web via Brave Search API", transport:"sse", server_url:"https://mcp.brave.dev/search", command:"", is_active:true, created_at:new Date().toISOString() },
    { id:"2", name:"Filesystem", description:"Accès au système de fichiers local", transport:"sse", server_url:"http://localhost:3001/mcp", command:"", is_active:false, created_at:new Date().toISOString() },
    { id:"3", name:"PostgreSQL", description:"Requêtes SQL sur base de données", transport:"sse", server_url:"https://mcp.example.com/postgres", command:"", is_active:true, created_at:new Date().toISOString() },
  ]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name:"", description:"", transport:"sse", server_url:"", command:"" });

  useEffect(() => { const s = localStorage.getItem("elshalflow_mcp"); if (s) setServers(JSON.parse(s)); }, []);
  function saveServers(s: McpServer[]) { setServers(s); localStorage.setItem("elshalflow_mcp", JSON.stringify(s)); }

  function addServer() {
    if (!form.name || (!form.server_url && !form.command)) return toast.error("Nom et URL/Commande requis");
    const s: McpServer = { id: Date.now().toString(), ...form, is_active: true, created_at: new Date().toISOString() };
    saveServers([...servers, s]); setForm({ name:"", description:"", transport:"sse", server_url:"", command:"" }); setOpen(false); toast.success("Serveur ajouté !");
  }

  function toggleServer(id: string) { saveServers(servers.map(s=>s.id===id?{...s,is_active:!s.is_active}:s)); }
  function deleteServer(id: string) { saveServers(servers.filter(s=>s.id!==id)); toast.success("Serveur supprimé"); }

  return (<div className="h-full overflow-y-auto"><Toaster richColors theme="dark" position="top-right"/><div className="max-w-4xl mx-auto p-6 space-y-6">
    <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold flex items-center gap-3"><Shield className="h-6 w-6 text-primary"/>MCP</h1><p className="text-muted-foreground mt-1">Ajoutez des serveurs MCP pour étendre le contexte de vos agents.</p></div>
      <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4"/>Ajouter un serveur</Button></DialogTrigger><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Nouveau serveur MCP</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-4">
          <div><Label>Nom</Label><Input placeholder="Brave Search" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
          <div><Label>Description</Label><Input placeholder="Recherche web..." value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></div>
          <div><Label>Transport</Label><Select value={form.transport} onValueChange={v=>setForm({...form,transport:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="sse">SSE (HTTP)</SelectItem><SelectItem value="stdio">stdio (Command)</SelectItem></SelectContent></Select></div>
          {form.transport==="sse"?<div><Label>URL</Label><Input placeholder="https://..." value={form.server_url} onChange={e=>setForm({...form,server_url:e.target.value})}/></div>:<div><Label>Commande</Label><Input placeholder="npx @anthropic/mcp-server" value={form.command} onChange={e=>setForm({...form,command:e.target.value})}/></div>}
          <Button onClick={addServer} className="w-full gap-2"><Shield className="h-4 w-4"/>Ajouter</Button>
        </div></DialogContent></Dialog>
    </div><Separator/>
    <div><h2 className="text-lg font-semibold mb-3">Actifs ({servers.filter(s=>s.is_active).length})</h2><div className="grid gap-3">{servers.filter(s=>s.is_active).map(s=>(<Card key={s.id} className="border-primary/20 bg-primary/5"><CardContent className="p-4 flex items-center justify-between"><div className="flex items-center gap-4"><div className="p-2.5 rounded-xl bg-primary/10"><Server className="h-5 w-5 text-primary"/></div><div><div className="flex items-center gap-2"><h3 className="font-semibold">{s.name}</h3><Badge variant="secondary" className="text-xs"><Wifi className="h-3 w-3 mr-1"/>SSE</Badge></div><p className="text-sm text-muted-foreground">{s.description}</p><p className="text-xs text-muted-foreground font-mono mt-1 truncate max-w-[300px]">{s.server_url||s.command}</p></div></div><div className="flex items-center gap-2"><Switch checked={s.is_active} onCheckedChange={()=>toggleServer(s.id)}/><Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-400" onClick={()=>deleteServer(s.id)}><Trash2 className="h-4 w-4"/></Button></div></CardContent></Card>))}</div></div>
    {servers.filter(s=>!s.is_active).length>0&&(<div><h2 className="text-lg font-semibold mb-3 text-muted-foreground">Inactifs</h2><div className="grid gap-3 opacity-60">{servers.filter(s=>!s.is_active).map(s=>(<Card key={s.id}><CardContent className="p-4 flex items-center justify-between"><div className="flex items-center gap-4"><div className="p-2.5 rounded-xl bg-secondary"><WifiOff className="h-5 w-5 text-muted-foreground"/></div><div><h3 className="font-semibold">{s.name}</h3><p className="text-sm text-muted-foreground">{s.description}</p></div></div><div className="flex items-center gap-2"><Switch checked={s.is_active} onCheckedChange={()=>toggleServer(s.id)}/><Button variant="ghost" size="icon" className="h-8 w-8" onClick={()=>deleteServer(s.id)}><Trash2 className="h-4 w-4"/></Button></div></CardContent></Card>))}</div></div>)}
    <Card><CardHeader><CardTitle className="text-base">À propos du MCP</CardTitle></CardHeader><CardContent className="space-y-3 text-sm text-muted-foreground"><p>Le <strong>Model Context Protocol</strong> permet à vos agents IA d'accéder à des contextes externes.</p><div className="grid grid-cols-2 gap-2"><div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30"><Globe className="h-4 w-4 text-primary"/><span>SSE : HTTP persistant</span></div><div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30"><Terminal className="h-4 w-4 text-primary"/><span>stdio : processus local</span></div></div></CardContent></Card>
  </div></div>);
}
