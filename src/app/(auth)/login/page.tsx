"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Mail, Key } from "lucide-react";
import { Toaster, toast } from "sonner";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    try {
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) toast.error("Identifiants invalides.");
      else router.push("/chat");
    } catch { toast.error("Erreur."); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Toaster richColors theme="dark" position="top-center" />
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-3">
          <div className="flex justify-center"><div className="p-3 rounded-2xl bg-primary/10 ring-1 ring-primary/20"><Brain className="w-8 h-8 text-primary" /></div></div>
          <h1 className="text-3xl font-bold">ElshalflowAI</h1>
          <p className="text-muted-foreground">Plateforme d&apos;agents IA</p>
        </div>
        <Card className="border-border/50">
          <CardHeader><CardTitle>Connexion</CardTitle><CardDescription>Connectez-vous à votre espace</CardDescription></CardHeader>
          <CardContent>
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-2"><Label htmlFor="email">Email</Label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="email" type="email" placeholder="vous@example.com" value={email} onChange={e=>setEmail(e.target.value)} required className="pl-10" /></div></div>
              <div className="space-y-2"><Label htmlFor="password">Mot de passe</Label><div className="relative"><Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="password" type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} required className="pl-10" /></div></div>
              <Button type="submit" className="w-full" disabled={loading}>{loading?"Connexion...":"Se connecter"}</Button>
            </form>
            <p className="text-center text-sm text-muted-foreground mt-4">Pas encore de compte ? <Link href="/register" className="text-primary hover:underline font-medium">Créer un compte</Link></p>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground">Sécurisé avec Supabase Auth & NextAuth.js</p>
      </div>
    </div>
  );
}
