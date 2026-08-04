"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { Settings, User, Shield, Save } from "lucide-react";
import { Toaster, toast } from "sonner";

export default function SettingsPage() {
  const { data: session } = useSession();
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (session?.user?.name) setDisplayName(session.user.name); }, [session]);

  async function updateProfile(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("profiles").update({ display_name: displayName }).eq("id", session?.user?.id!);
      if (error) throw error;
      toast.success("Profil mis à jour");
    } catch (err: any) { toast.error(err.message || "Erreur"); }
    finally { setLoading(false); }
  }

  const initials = displayName?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "EA";

  return (
    <div className="flex flex-col h-full">
      <Toaster richColors theme="dark" position="top-center" />
      <header className="h-14 flex items-center px-6 border-b border-border shrink-0"><div className="flex items-center gap-3"><Settings className="h-5 w-5 text-primary" /><h2 className="font-semibold text-sm">Paramètres</h2></div></header>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />Profil</CardTitle><CardDescription>Gérez vos informations personnelles</CardDescription></CardHeader>
            <CardContent>
              <form onSubmit={updateProfile} className="space-y-4">
                <div className="flex items-center gap-4 mb-4"><Avatar className="h-16 w-16"><AvatarFallback className="bg-primary/10 text-primary text-lg">{initials}</AvatarFallback></Avatar><div><p className="font-medium">{session?.user?.email}</p><p className="text-sm text-muted-foreground">Membre</p></div></div>
                <div className="space-y-2"><Label>Nom d&apos;affichage</Label><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Votre nom" /></div>
                <Button type="submit" disabled={loading}><Save className="h-4 w-4 mr-2" />{loading ? "Enregistrement..." : "Enregistrer"}</Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />À propos</CardTitle><CardDescription>Informations sur la plateforme</CardDescription></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Version</span><span className="font-mono">1.0.0-alpha</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Stack</span><span>Next.js 14 + Supabase + Composio</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Chiffrement</span><span>AES-256-GCM</span></div>
              <Separator />
              <p className="text-xs text-muted-foreground">ElshalflowAI — Plateforme d&apos;agents IA avec BYOK, Composio et MCP.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
