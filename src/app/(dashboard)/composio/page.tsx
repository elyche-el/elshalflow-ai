"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Puzzle, Search, Plug, Unplug, CheckCircle, Loader2 } from "lucide-react";
import { Toaster, toast } from "sonner";

type App = { name: string; displayName: string; description: string; category: string; icon: string };
type Connection = { id: string; app_name: string; status: string; created_at: string };

const CATEGORIES = ["Tout","communication","development","productivity","storage","social","design","finance"];

export default function ComposioPage() {
  const [apps, setApps] = useState<App[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Tout");
  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => { fetch("/api/composio").then(r=>r.json()).then(setApps).finally(()=>setLoading(false)); const s = localStorage.getItem("elshalflow_composio"); if(s) setConnections(JSON.parse(s)); }, []);

  async function connect(appName: string) { setConnecting(appName); try { const r = await fetch("/api/composio",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({app_name:appName})}); const d = await r.json(); const nc: Connection = { id: d.connectionId||Date.now().toString(), app_name: appName, status: "connected", created_at: new Date().toISOString() }; const u = [...connections.filter(c=>c.app_name!==appName), nc]; setConnections(u); localStorage.setItem("elshalflow_composio", JSON.stringify(u)); toast.success(`Connecté à ${appName}!`); } catch { toast.error("Échec"); } finally { setConnecting(null); } }
  function disconnect(appName: string) { const u = connections.filter(c=>c.app_name!==appName); setConnections(u); localStorage.setItem("elshalflow_composio", JSON.stringify(u)); toast.success(`Déconnecté de ${appName}`); }

  const isConnected = (n: string) => connections.some(c=>c.app_name===n&&c.status==="connected");
  const filtered = apps.filter(a=>(category==="Tout"||a.category===category)&&(!search||a.name.includes(search.toLowerCase())||a.displayName.toLowerCase().includes(search.toLowerCase())));

  return (<div className="h-full overflow-y-auto"><Toaster richColors theme="dark" position="top-right"/><div className="max-w-5xl mx-auto p-6 space-y-6">
    <div><h1 className="text-2xl font-bold flex items-center gap-3"><Puzzle className="h-6 w-6 text-primary"/>Composio</h1><p className="text-muted-foreground mt-1">Connectez 250+ applications pour vos agents IA.</p></div>
    {connections.length>0&&(<><div><h2 className="text-lg font-semibold mb-3">Connectées ({connections.length})</h2><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{connections.map(c=>{const a=apps.find(x=>x.name===c.app_name);return(<Card key={c.id} className="border-primary/20 bg-primary/5"><CardContent className="p-4 flex items-center gap-3"><span className="text-2xl">{a?.icon||"🔌"}</span><div className="flex-1 min-w-0"><p className="font-medium text-sm truncate">{a?.displayName||c.app_name}</p><p className="text-xs text-green-400 flex items-center gap-1"><CheckCircle className="h-3 w-3"/>Connecté</p></div><Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={()=>disconnect(c.app_name)}><Unplug className="h-3.5 w-3.5"/></Button></CardContent></Card>)})}</div></div><Separator/></>)}
    <div className="flex gap-3 items-center flex-wrap"><div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input placeholder="Rechercher..." value={search} onChange={e=>setSearch(e.target.value)} className="pl-10"/></div><div className="flex gap-1.5 flex-wrap">{CATEGORIES.map(c=><Button key={c} variant={category===c?"secondary":"ghost"} size="sm" onClick={()=>setCategory(c)}>{c==="Tout"?"Tout":c}</Button>)}</div></div>
    {loading?(<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">{[1,2,3,4,5,6,7,8].map(i=><Skeleton key={i} className="h-28 rounded-xl"/>)}</div>):(<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">{filtered.map(app=>{const c=isConnected(app.name);return(<Card key={app.name} className={`hover:border-primary/30 transition-all ${c?"border-primary/30 bg-primary/5":""}`}><CardContent className="p-4 space-y-3"><div className="flex items-start justify-between"><span className="text-3xl">{app.icon}</span>{c&&<CheckCircle className="h-4 w-4 text-green-400"/>}</div><div><p className="font-semibold text-sm">{app.displayName}</p><p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{app.description}</p></div><Button variant={c?"outline":"default"} size="sm" className="w-full" disabled={connecting===app.name} onClick={()=>c?disconnect(app.name):connect(app.name)}>{connecting===app.name?<><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin"/>Connexion...</>:c?<><Unplug className="h-3.5 w-3.5 mr-1"/>Déconnecter</>:<><Plug className="h-3.5 w-3.5 mr-1"/>Connecter</>}</Button></CardContent></Card>)})}</div>)}
  </div></div>);
}
