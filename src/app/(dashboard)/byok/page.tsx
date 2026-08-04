"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/lib/supabase/client";
import type { ApiKeyProvider, ApiKeyDisplay } from "@/types";
import { Key, Plus, Trash2, Shield } from "lucide-react";
import { Toaster, toast } from "sonner";
import { cn } from "@/lib/utils";

const PROVIDERS: { value: ApiKeyProvider; label: string; description: string }[] = [
  { value: "openrouter", label: "OpenRouter", description: "Accès unifié à 200+ modèles LLM" },
  { value: "openai", label: "OpenAI", description: "GPT-4o, GPT-4o-mini, o1, o3" },
  { value: "anthropic", label: "Anthropic", description: "Claude Sonnet, Opus, Haiku" },
  { value: "google", label: "Google AI", description: "Gemini 2.5 Pro, Flash" },
  { value: "groq", label: "Groq", description: "Inférence ultra-rapide LPU" },
  { value: "omnirouter", label: "Omnirouter", description: "Routeur multi-fournisseurs" },
  { value: "custom", label: "Custom", description: "Endpoint OpenAI-compatible personnalisé" },
];

export default function ByokPage() {
  const [keys, setKeys] = useState<ApiKeyDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [provider, setProvider] = useState<ApiKeyProvider>("openrouter");
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadKeys = useCallback(async () => {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { data } = await supabase.from("api_keys").select("id, provider, label, encrypted_key, is_default, created_at, last_used_at").eq("user_id", userData.user.id).order("created_at", { ascending: false });
    if (data) setKeys(data.map((k) => ({ ...k, key_preview: "••••••••••••" })));
    setLoading(false);
  }, []);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  async function addKey(e: React.FormEvent) {
    e.preventDefault(); setSubmitting(true);
    try {
      const res = await fetch("/api/byok", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, label, api_key: apiKey, is_default: isDefault }) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Erreur"); }
      toast.success("Clé API ajoutée");
      setDialogOpen(false); setApiKey(""); setLabel("");
      loadKeys();
    } catch (err: any) { toast.error(err.message); }
    finally { setSubmitting(false); }
  }

  async function deleteKey(keyId: string) {
    if (!confirm("Supprimer cette clé API ?")) return;
    const res = await fetch(`/api/byok?id=${keyId}`, { method: "DELETE" });
    if (res.ok) { toast.success("Clé supprimée"); loadKeys(); } else toast.error("Erreur");
  }

  async function setDefault(keyId: string) {
    const res = await fetch("/api/byok", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: keyId, is_default: true }) });
    if (res.ok) loadKeys();
  }

  return (
    <div className="flex flex-col h-full">
      <Toaster richColors theme="dark" position="top-center" />
      <header className="h-14 flex items-center justify-between px-6 border-b border-border shrink-0">
        <div className="flex items-center gap-3"><Key className="h-5 w-5 text-primary" /><h2 className="font-semibold text-sm">Clés API (BYOK)</h2></div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" />Ajouter une clé</Button></DialogTrigger>
          <DialogContent>
            <form onSubmit={addKey}>
              <DialogHeader><DialogTitle>Ajouter une clé API</DialogTitle><DialogDescription>Votre clé est chiffrée avant stockage.</DialogDescription></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2"><Label>Fournisseur</Label><Select value={provider} onValueChange={(v) => setProvider(v as ApiKeyProvider)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PROVIDERS.map((p) => (<SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>))}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Label</Label><Input placeholder="Ma clé production" value={label} onChange={(e) => setLabel(e.target.value)} required /></div>
                <div className="space-y-2"><Label>Clé API</Label><Input type="password" placeholder="sk-..." value={apiKey} onChange={(e) => setApiKey(e.target.value)} required /></div>
                <div className="flex items-center justify-between"><Label className="text-sm">Définir comme clé par défaut</Label><Switch checked={isDefault} onCheckedChange={setIsDefault} /></div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 text-xs text-muted-foreground"><Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" /><span>Les clés API sont chiffrées avec AES-256-GCM avant stockage.</span></div>
              </div>
              <DialogFooter><Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>Annuler</Button><Button type="submit" disabled={submitting}>{submitting ? "Ajout..." : "Ajouter"}</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </header>
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (<div className="space-y-3">{[1,2,3].map((i) => (<Card key={i} className="animate-pulse"><CardContent className="h-20" /></Card>))}</div>) : keys.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4"><div className="p-6 rounded-2xl bg-primary/5 ring-1 ring-primary/10"><Key className="h-12 w-12 text-primary/50" /></div><div className="space-y-1"><h3 className="text-lg font-semibold">Aucune clé API</h3><p className="text-muted-foreground text-sm max-w-md">Ajoutez vos clés API pour alimenter le chatbot.</p></div><Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Ajouter votre première clé</Button></div>
        ) : (
          <div className="grid gap-4 max-w-2xl">{keys.map((key) => (<Card key={key.id} className={cn(key.is_default && "ring-1 ring-primary/30")}><CardContent className="p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className={cn("p-2 rounded-lg", key.is_default ? "bg-primary/10" : "bg-secondary")}><Key className={cn("h-4 w-4", key.is_default ? "text-primary" : "text-muted-foreground")} /></div><div><div className="flex items-center gap-2"><span className="font-medium text-sm">{key.label}</span>{key.is_default && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">DÉFAUT</span>}</div><div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground"><span>{key.provider}</span><span>•</span><code className="bg-secondary px-1 rounded text-[10px]">{key.key_preview}</code></div></div></div><div className="flex items-center gap-1">{!key.is_default && <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setDefault(key.id)}>Définir par défaut</Button>}<Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteKey(key.id)}><Trash2 className="h-4 w-4" /></Button></div></div></CardContent></Card>))}</div>
        )}
      </div>
    </div>
  );
}
