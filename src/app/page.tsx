import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { Brain, Key, Puzzle, Shield, ArrowRight, Sparkles } from "lucide-react";

export default async function HomePage() {
  const session = await auth();
  if (session) redirect("/chat");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2"><Brain className="h-7 w-7 text-primary" /><span className="font-bold text-lg">ElshalflowAI</span></div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">Connexion</Link>
            <Link href="/register" className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90">Essai gratuit</Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="relative max-w-6xl mx-auto px-4 py-24 md:py-32 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm mb-8">
            <Sparkles className="h-4 w-4" /> Plateforme d&apos;Agents IA nouvelle génération
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">Vos agents IA,<br /><span className="text-primary">vos clés, vos apps</span></h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">ElshalflowAI combine BYOK, Composio et MCP pour vous offrir une plateforme d&apos;agents IA complètement personnalisable.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-xl text-lg font-medium hover:bg-primary/90 shadow-lg shadow-primary/25">Commencer gratuitement <ArrowRight className="h-5 w-5" /></Link>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[{ icon: <Brain className="h-6 w-6" />, title: "Chat IA", desc: "Chatbot central avec streaming, sélection de modèle, et historique." },{ icon: <Key className="h-6 w-6" />, title: "BYOK", desc: "Apportez vos propres clés API — chiffrées avec AES-256-GCM." },{ icon: <Puzzle className="h-6 w-6" />, title: "Composio", desc: "Connectez Gmail, Slack, GitHub et 250+ apps." },{ icon: <Shield className="h-6 w-6" />, title: "MCP", desc: "Ajoutez des serveurs Model Context Protocol." }].map((f, i) => (
            <div key={i} className="p-6 rounded-2xl border border-border bg-card hover:border-primary/30 transition-all group">
              <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4 group-hover:bg-primary/20"><div className="text-primary">{f.icon}</div></div>
              <h3 className="font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8"><div className="max-w-6xl mx-auto px-4 text-center text-sm text-muted-foreground"><p>© 2026 ElshalflowAI. Tous droits réservés.</p></div></footer>
    </div>
  );
}
