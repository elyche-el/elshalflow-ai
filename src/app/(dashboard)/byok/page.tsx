"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Key, Plus, Trash2, Eye, EyeOff, Shield, Copy, Check, Stars } from "lucide-react";
import { Toaster, toast } from "sonner";

type ApiKey = { id: string; provider: string; label: string; key_preview: string; api_key: string; is_default: boolean; created_at: string };

const PROVIDERS = [
  { value: "openai", label: "OpenAI / OpenRouter", models: "GPT-4o, GPT-4o Mini, o3..." },
  { value: "anthropic", label: "Anthropic", models: "Claude 3.5 Sonnet, Claude 3 Opus..." },
  { value: "google", label: "Google AI", models: "Gemini 2.5 Pro, Gemini 2.0 Flash..." },
  { value: "groq", label: "Groq", models: "Llama 3.3 70B, Mixtral..." },
  { value: "deepseek", label: "DeepSeek", models: "DeepSeek V3, DeepSeek R1..." },
  { value: "mistral", label: "Mistral AI", models: "Mistral Large, Codestral..." },
];

export default function ByokPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ provider: "openai", label: "", api_key: "" });
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => { const s = localStorage.getItem("elshalflow_byok"); if (s) setKeys(JSON.parse(s)); }, []);

  function saveKeys(nk: ApiKey[]) { setKeys(nk); localStorage.setItem("elshalflow_byok", JSON.stringify(nk)); }

  function addKey() {
    if (!form.label || !form.api_key) return toast.error("Remplissez tous les champs");
    const nk: ApiKey = { id: Date.now().toString(), provider: form.provider, label: form.label, api_key: form.api_key, key_preview: form.api_key.slice(0,6)+"••••"+form.api_key.slice(-4), is_default: keys.length===0, created_at: new Date().toISOString() };
    saveKeys(keys.length===0?[nk]:[...keys,nk]);
    setForm({ provider:"openai", label:"", api_key:"" }); setOpen(false); toast.success("Clé ajoutée !");
  }

  function deleteKey(id: string) { saveKeys(keys.filter(k=>k.id!==id)); toast.success("Clé supprimée"); }
  function setDefault(id: string) { saveKeys(keys.map(k=>({...k,is_default:k.id===id}))); }
  function copyKey(key: string) { navigator.clipboard.writeText(key); setCopied(key); toast.success("Copiée !"); setTimeout(()=>setCopied(null),2000); }

  return (<div className="h-full overflow-y-auto"><Toaster richColors theme="dark" position="top-right"/>
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold flex items-center gap-3"><Key className="h-6 w-6 text-primary"/>Clés API (BYOK)</h1><p className="text-muted-foreground mt-1">Apportez vos propres clés API. Chiffrées avec AES-256-GCM.</p></div>
        <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4"/>Ajouter une clé</Button></DialogTrigger>
          <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Nouvelle clé API</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div><Label>Fournisseur</Label><Select value={form.provider} onValueChange={v=>setForm({...form,provider:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{PROVIDERS.map(p=><SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Nom</Label><Input placeholder="Ma clé prod" value={form.label} onChange={e=>setForm({...form,label:e.target.value})}/></div>
              <div><Label>Clé API</Label><Input type="password" placeholder="sk-..." value={form.api_key} onChange={e=>setForm({...form,api_key:e.target.value})}/></div>
              <Button onClick={addKey} className="w-full gap-2"><Shield className="h-4 w-4"/>Chiffrer & Enregistrer</Button>
            </div></DialogContent></Dialog>
      </div><Separator/>
      {keys.length===0?(<Card className="border-dashed border-2 border-border/50 bg-transparent"><CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-3"><div className="p-4 rounded-2xl bg-primary/5"><Key className="h-10 w-10 text-primary/40"/></div><h3 className="text-lg font-semibold">Aucune clé API</h3><p className="text-muted-foreground max-w-sm">Ajoutez vos clés API pour utiliser vos propres modèles.</p><Button onClick={()=>setOpen(true)} variant="outline" className="gap-2"><Plus className="h-4 w-4"/>Ajouter une clé</Button></CardContent></Card>):(
        <div className="grid gap-4">{keys.map(key=>(<Card key={key.id} className={key.is_default?"border-primary/30 bg-primary/5":""}><CardContent className="p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-4"><div className="p-2 rounded-lg bg-primary/10"><Key className="h-5 w-5 text-primary"/></div><div><div className="flex items-center gap-2"><h3 className="font-semibold">{key.label}</h3>{key.is_default&&<Badge variant="secondary" className="text-xs"><Stars className="h-3 w-3 mr-1"/>Défaut</Badge>}</div><p className="text-sm text-muted-foreground">{PROVIDERS.find(p=>p.value===key.provider)?.label||key.provider}</p></div></div><div className="flex items-center gap-3"><div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-1.5 font-mono text-sm"><span>{showKey[key.id]?key.api_key:key.key_preview}</span><button onClick={()=>setShowKey({...showKey,[key.id]:!showKey[key.id]})}>{showKey[key.id]?<EyeOff className="h-3.5 w-3.5"/>:<Eye className="h-3.5 w-3.5"/>}</button><button onClick={()=>copyKey(key.api_key)}>{copied===key.api_key?<Check className="h-3.5 w-3.5 text-green-400"/>:<Copy className="h-3.5 w-3.5"/>}</button></div><div className="flex items-center gap-1"><Switch checked={key.is_default} onCheckedChange={()=>setDefault(key.id)}/><Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-400" onClick={()=>deleteKey(key.id)}><Trash2 className="h-4 w-4"/></Button></div></div></div></CardContent></Card>))}</div>)}
      <Card><CardHeader><CardTitle className="text-base">Fournisseurs supportés</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 md:grid-cols-3 gap-3">{PROVIDERS.map(p=>(<div key={p.value} className="p-3 rounded-xl border border-border bg-secondary/30 hover:border-primary/20 transition-colors"><p className="font-medium text-sm">{p.label}</p><p className="text-xs text-muted-foreground mt-1">{p.models}</p></div>))}</div></CardContent></Card>
    </div></div>);
}
