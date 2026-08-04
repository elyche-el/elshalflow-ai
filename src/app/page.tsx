import Link from "next/link";
import { Brain, Key, Puzzle, Shield, ArrowRight, Sparkles } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2"><Brain className="h-7 w-7 text-primary" /><span className="font-bold text-lg">ElshalflowAI</span></div>
          <div className="flex items-center gap-3"><Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">Connexion</Link><Link href="/register" className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90">Essai gratuit</Link></div>
        </div>
      </header>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="relative max-w-6xl mx-auto px-4 py-24 md:py-32 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm mb-8"><Sparkles className="h-4 w-4" />Plateforme d&apos;Agents IA</div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">Vos agents IA,<br /><span className="text-primary">vos clés, vos apps</span></h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">BYOK, Composio et MCP — plateforme d&apos;agents IA personnalisable.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-xl text-lg font-medium hover:bg-primary/90 shadow-lg shadow-primary/25">Commencer gratuitement<ArrowRight className="h-5 w-5" /></Link>
            <Link href="https://github.com/elyche-el/elshalflow-ai" target="_blank" className="inline-flex items-center gap-2 border border-border px-8 py-3 rounded-xl text-lg font-medium hover:bg-secondary">Voir sur GitHub</Link>
          </div>
        </div>
      </section>
      <section className="max-w-6xl mx-auto px-4 py-20"><div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">{[{icon:<Brain className="h-6 w-6"/>,t:"Chat IA",d:"Streaming, historique, multi-modèles."},{icon:<Key className="h-6 w-6"/>,t:"BYOK",d:"Vos propres clés API, chiffrées."},{icon:<Puzzle className="h-6 w-6"/>,t:"Composio",d:"250+ apps: Gmail, Slack, GitHub."},{icon:<Shield className="h-6 w-6"/>,t:"MCP",d:"Contexte illimité via MCP."}].map((f,i)=>(<div key={i} className="p-6 rounded-2xl border border-border bg-card hover:border-primary/30 transition-all"><div className="p-3 rounded-xl bg-primary/10 w-fit mb-4"><div className="text-primary">{f.icon}</div></div><h3 className="font-semibold mb-2">{f.t}</h3><p className="text-sm text-muted-foreground">{f.d}</p></div>))}</div></section>
      <section className="border-t border-border py-16"><div className="max-w-6xl mx-auto px-4 text-center"><p className="text-sm text-muted-foreground mb-6">Construit avec</p><div className="flex flex-wrap justify-center gap-8 text-sm text-muted-foreground font-mono"><span>Next.js 16</span><span>TypeScript</span><span>Supabase</span><span>Composio</span><span>Tailwind v4</span><span>Vercel</span></div></div></section>
      <footer className="border-t border-border py-8"><div className="text-center text-sm text-muted-foreground">© 2026 ElshalflowAI</div></footer>
    </div>
  );
}
