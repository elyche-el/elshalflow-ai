"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import type { ComposioConfig } from "@/types";
import { Puzzle, Plug, CheckCircle, RefreshCw, Trash2, Mail, Calendar, MessageCircle, FileText, Database, Cloud, Bot } from "lucide-react";
import { Toaster, toast } from "sonner";
import { cn } from "@/lib/utils";

const POPULAR_APPS = [
  { name: "gmail", label: "Gmail", icon: Mail, description: "Envoyer et lire des emails" },
  { name: "googlecalendar", label: "Google Calendar", icon: Calendar, description: "Gérer les événements" },
  { name: "slack", label: "Slack", icon: MessageCircle, description: "Messages et canaux" },
  { name: "github", label: "GitHub", icon: Cloud, description: "Issues, PR, repos" },
  { name: "notion", label: "Notion", icon: FileText, description: "Pages et bases de données" },
  { name: "googlesheets", label: "Google Sheets", icon: FileText, description: "Lire et écrire des feuilles" },
  { name: "supabase", label: "Supabase", icon: Database, description: "Requêtes et données" },
  { name: "jira", label: "Jira", icon: Cloud, description: "Tickets et sprints" },
  { name: "hubspot", label: "HubSpot", icon: Bot, description: "CRM et contacts" },
];

export default function ComposioPage() {
  const [configs, setConfigs] = useState<ComposioConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);

  const loadConfigs = async () => {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { data } = await supabase.from("composio_configs").select("*").eq("user_id", userData.user.id).order("created_at", { ascending: false });
    if (data) setConfigs(data);
    setLoading(false);
  };

  useEffect(() => { loadConfigs(); }, []);

  async function connectApp(appName: string) {
    setConnecting(appName);
    try {
      const res = await fetch("/api/composio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ app_name: appName }) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Erreur"); }
      const { redirectUrl } = await res.json();
      if (redirectUrl) { window.open(redirectUrl, "_blank"); toast.success("Redirection vers l'authentification..."); }
      setTimeout(() => loadConfigs(), 3000);
    } catch (err: any) { toast.error(err.message); }
    finally { setConnecting(null); }
  }

  async function disconnectApp(appName: string) {
    if (!confirm(`Déconnecter ${appName} ?`)) return;
    const res = await fetch("/api/composio", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ app_name: appName }) });
    if (res.ok) { toast.success(`${appName} déconnecté`); loadConfigs(); } else toast.error("Erreur");
  }

  const isConnected = (appName: string) => configs.some((c) => c.app_name === appName && c.is_connected);

  return (
    <div className="flex flex-col h-full">
      <Toaster richColors theme="dark" position="top-center" />
      <header className="h-14 flex items-center px-6 border-b border-border shrink-0"><div className="flex items-center gap-3"><Puzzle className="h-5 w-5 text-primary" /><h2 className="font-semibold text-sm">Intégrations Composio</h2></div></header>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl space-y-6">
          <div className="flex items-start gap-4 p-4 rounded-xl bg-primary/5 border border-primary/10"><Plug className="h-5 w-5 text-primary shrink-0 mt-0.5" /><div><h3 className="font-medium text-sm">Connectez vos applications</h3><p className="text-sm text-muted-foreground mt-1">Composio permet à ElshalflowAI d&apos;exécuter des actions sur vos apps tierces directement via le chatbot.</p></div></div>
          {configs.filter((c) => c.is_connected).length > 0 && (
            <div className="space-y-3"><h3 className="text-sm font-medium">Connectées</h3><div className="grid gap-3 sm:grid-cols-2">{configs.filter((c) => c.is_connected).map((cfg) => { const app = POPULAR_APPS.find((a) => a.name === cfg.app_name); const Icon = app?.icon || Plug; return (<Card key={cfg.id} className="border-primary/20 bg-primary/5"><CardContent className="p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Icon className="h-5 w-5 text-primary" /></div><div><p className="font-medium text-sm">{app?.label || cfg.app_name}</p><p className="text-xs text-primary/70 flex items-center gap-1"><CheckCircle className="h-3 w-3" />Connecté</p></div></div><Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => disconnectApp(cfg.app_name)}><Trash2 className="h-4 w-4" /></Button></div></CardContent></Card>); })}</div></div>
          )}
          <div className="space-y-3"><h3 className="text-sm font-medium">Applications disponibles</h3>
            {loading ? (<div className="grid gap-3 sm:grid-cols-2">{[1,2,3,4].map((i) => (<Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>))}</div>) : (
              <div className="grid gap-3 sm:grid-cols-2">{POPULAR_APPS.map((app) => { const Icon = app.icon; const connected = isConnected(app.name); return (<Card key={app.name} className={cn("transition-all hover:border-primary/30", connected && "opacity-60")}><CardContent className="p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-secondary"><Icon className="h-5 w-5 text-muted-foreground" /></div><div><p className="font-medium text-sm">{app.label}</p><p className="text-xs text-muted-foreground">{app.description}</p></div></div><Button size="sm" variant={connected ? "secondary" : "outline"} disabled={connected || connecting === app.name} onClick={() => connectApp(app.name)}>{connecting === app.name ? <RefreshCw className="h-4 w-4 animate-spin" /> : connected ? <CheckCircle className="h-4 w-4" /> : <><Plug className="h-4 w-4 mr-1.5" />Connecter</>}</Button></div></CardContent></Card>); })}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
