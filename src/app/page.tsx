"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ users: 0, conversations: 0, agents: 0 });

  useEffect(() => {
    async function fetchStats() {
      try {
        const { count: users } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true });
        const { count: conversations } = await supabase
          .from("conversations")
          .select("*", { count: "exact", head: true });
        setStats({ users: users || 0, conversations: conversations || 0, agents: 0 });
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-12 text-center">
        {/* Logo & Title */}
        <div className="space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" className="w-10 h-10 text-primary">
              <rect x="4" y="4" width="32" height="32" rx="8" fill="currentColor" opacity="0.15" />
              <circle cx="20" cy="18" r="8" fill="currentColor" />
              <path d="M12 28 Q20 36 28 28" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>
          <div className="space-y-2">
            <h1 className="text-5xl font-bold tracking-tight">
              Elshalflow<span className="text-primary">AI</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              Build and run AI agents with your own keys, MCP servers, and Composio integrations.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="flex gap-3 justify-center">
          <a
            href="/chat"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
          >
            Start Chatting
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
            </svg>
          </a>
          <a
            href="/settings"
            className="inline-flex items-center gap-2 border border-border px-6 py-3 rounded-xl font-medium hover:bg-secondary transition-colors"
          >
            Settings
          </a>
        </div>

        {/* Stats */}
        {loading ? (
          <div className="flex gap-8 justify-center animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-8 w-12 bg-secondary rounded mx-auto" />
                <div className="h-4 w-16 bg-secondary rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-card border border-border">
              <div className="text-2xl font-bold text-primary">{stats.users}</div>
              <div className="text-sm text-muted-foreground">Users</div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border">
              <div className="text-2xl font-bold">{stats.conversations}</div>
              <div className="text-sm text-muted-foreground">Conversations</div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border">
              <div className="text-2xl font-bold">{stats.agents}</div>
              <div className="text-sm text-muted-foreground">Agents</div>
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-sm text-muted-foreground">
          Powered by Next.js • Supabase • Composio • Vercel
        </p>
      </div>
    </main>
  );
}
