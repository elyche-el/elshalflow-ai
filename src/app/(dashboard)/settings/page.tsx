"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Settings, User, Moon, Sun, Monitor, Globe, Key, BellRing, Trash2, Save, Info } from "lucide-react";
import { Toaster, toast } from "sonner";

export default function SettingsPage() {
  const [s, setS] = useState({ theme:"dark", name:"", email:"", notifications:true, sound:true, language:"fr", maxTokens:"4096", temperature:"0.7" });
  useEffect(() => { const v = localStorage.getItem("elshalflow_settings"); if (v) setS(p=>({...p,...JSON.parse(v)})); }, []);
  function update(k: string, v: any) { const n = { ...s, [k]: v }; setS(n); localStorage.setItem("elshalflow_settings", JSON.stringify(n)); }
  function saveAll() { localStorage.setItem("elshalflow_settings", JSON.stringify(s)); toast.success("Sauvegardé !"); }
  function clearData() { if (confirm("Supprimer toutes les données locales ?")) { localStorage.clear(); toast.success("Données effacées"); } }

  return (<div className="h-full overflow-y-auto"><Toaster richColors theme="dark" position="top-right"/><div className="max-w-3xl mx-auto p-6 space-y-6">
    <div><h1 className="text-2xl font-bold flex items-center gap-3"><Settings className="h-6 w-6 text-primary"/>Paramètres</h1><p className="text-muted-foreground mt-1">Personnalisez votre expérience.</p></div><Separator/>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5"/>Profil</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex items-center gap-4"><Avatar className="h-16 w-16"><AvatarFallback className="text-xl bg-primary/20 text-primary">{s.name?.charAt(0)||"E"}</AvatarFallback></Avatar><div className="flex-1 space-y-3"><div><Label>Nom</Label><Input value={s.name} onChange={e=>update("name",e.target.value)} placeholder="Votre nom"/></div><div><Label>Email</Label><Input value={s.email} onChange={e=>update("email",e.target.value)} placeholder="vous@example.com"/></div></div></div></CardContent></Card>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Monitor className="h-5 w-5"/>Apparence</CardTitle></CardHeader><CardContent><div className="flex items-center justify-between"><div><Label>Thème</Label><p className="text-sm text-muted-foreground">Mode sombre ou clair</p></div><div className="flex gap-1 bg-secondary rounded-lg p-1">{[{v:"dark",i:<Moon className="h-4 w-4"/>},{v:"light",i:<Sun className="h-4 w-4"/>},{v:"system",i:<Monitor className="h-4 w-4"/>}].map(t=><button key={t.v} onClick={()=>update("theme",t.v)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${s.theme===t.v?"bg-primary text-primary-foreground":"text-muted-foreground hover:text-foreground"}`}>{t.i}{t.v==="dark"?"Sombre":t.v==="light"?"Clair":"Système"}</button>)}</div></div></CardContent></Card>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Key className="h-5 w-5"/>Modèle par défaut</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex items-center justify-between"><div><Label>Max tokens</Label></div><Select value={s.maxTokens} onValueChange={v=>update("maxTokens",v)}><SelectTrigger className="w-32"><SelectValue/></SelectTrigger><SelectContent>{["1024","2048","4096","8192","16384"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div><div className="flex items-center justify-between"><div><Label>Température</Label></div><Select value={s.temperature} onValueChange={v=>update("temperature",v)}><SelectTrigger className="w-32"><SelectValue/></SelectTrigger><SelectContent>{["0.1","0.3","0.5","0.7","0.9","1.0"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div></CardContent></Card>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><BellRing className="h-5 w-5"/>Notifications</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex items-center justify-between"><div><Label>Notifications</Label></div><Switch checked={s.notifications} onCheckedChange={v=>update("notifications",v)}/></div><div className="flex items-center justify-between"><div><Label>Sons</Label></div><Switch checked={s.sound} onCheckedChange={v=>update("sound",v)}/></div></CardContent></Card>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5"/>Langue</CardTitle></CardHeader><CardContent><Select value={s.language} onValueChange={v=>update("language",v)}><SelectTrigger className="w-48"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="fr">Français</SelectItem><SelectItem value="en">English</SelectItem></SelectContent></Select></CardContent></Card>
    <div className="flex gap-3 justify-between"><Button variant="destructive" size="sm" className="gap-2" onClick={clearData}><Trash2 className="h-4 w-4"/>Effacer les données</Button><Button size="sm" className="gap-2" onClick={saveAll}><Save className="h-4 w-4"/>Sauvegarder</Button></div>
    <div className="text-center text-xs text-muted-foreground py-4"><Info className="h-3 w-3 inline mr-1"/>ElshalflowAI v1.0 — Paramètres sauvegardés localement.</div>
  </div></div>);
}
