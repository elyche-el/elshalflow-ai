"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Mail, Key, User } from "lucide-react";
import { Toaster, toast } from "sonner";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName }, emailRedirectTo: `${window.location.origin}/chat` } });
      if (error) toast.error(error.message);
      else { toast.success("Compte créé ! Vérifiez votre email."); router.push("/login"); }
    } catch { toast.error("Une erreur est survenue."); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Toaster richColors theme="dark" position="top-center" />
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-3"><div className="flex items-center justify-center gap-3"><div className="p-3 rounded-2xl bg-primary/10 ring-1 ring-primary/20"><Brain className="w-8 h-8 text-primary" /></div></div><h1 className="text-3xl font-bold tracking-tight">ElshalflowAI</h1><p className="text-muted-foreground">Créez votre compte pour commencer</p></div>
        <Card className="border-border/50">
          <CardHeader><CardTitle>Inscription</CardTitle><CardDescription>Rejoignez la plateforme d&apos;agents IA</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2"><Label htmlFor="name">Nom complet</Label><div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="name" type="text" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="pl-10" /></div></div>
              <div className="space-y-2"><Label htmlFor="email">Email</Label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="email" type="email" placeholder="vous@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-10" /></div></div>
              <div className="space-y-2"><Label htmlFor="password">Mot de passe</Label><div className="relative"><Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="password" type="password" placeholder="•••••••• (min. 8 caractères)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="pl-10" /></div></div>
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "Création..." : "Créer un compte"}</Button>
            </form>
            <p className="text-center text-sm text-muted-foreground">Déjà un compte ? <Link href="/login" className="text-primary hover:underline font-medium">Se connecter</Link></p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
