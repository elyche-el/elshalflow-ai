"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Brain, MessageSquare, Key, Puzzle, Shield, Settings, LogOut, Plus, Menu, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Conversation } from "@/types";

const NAV_ITEMS = [
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/byok", label: "Clés API", icon: Key },
  { href: "/composio", label: "Composio", icon: Puzzle },
  { href: "/mcp", label: "MCP", icon: Shield },
  { href: "/settings", label: "Paramètres", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    async function loadConversations() {
      const supabase = createClient();
      const { data } = await supabase.from("conversations").select("id, title, updated_at").eq("archived", false).order("updated_at", { ascending: false }).limit(50);
      if (data) setConversations(data);
    }
    loadConversations();
  }, [pathname]);

  async function createNewChat() {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { data } = await supabase.from("conversations").insert({ user_id: userData.user.id, title: "Nouveau chat" }).select("id").single();
    if (data) router.push(`/chat/${data.id}`);
  }

  const initials = session?.user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "EA";

  return (
    <>
      <button onClick={() => setMobileOpen(!mobileOpen)} className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-card border border-border lg:hidden">{mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
      <aside className={cn("fixed inset-y-0 left-0 z-40 flex flex-col bg-card border-r border-border transition-all duration-300", collapsed ? "w-[70px]" : "w-[280px]", "lg:relative", mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0")}>
        <div className="flex items-center justify-between p-4 h-16">
          <div className={cn("flex items-center gap-3", collapsed && "justify-center w-full")}><Brain className="h-8 w-8 text-primary shrink-0" />{!collapsed && <span className="font-bold text-lg tracking-tight">ElshalflowAI</span>}</div>
          {!collapsed && <button onClick={() => setCollapsed(true)} className="p-1 rounded hover:bg-secondary hidden lg:block"><Menu className="h-4 w-4 text-muted-foreground" /></button>}
        </div>
        <Separator />
        <div className={cn("p-3", collapsed && "px-2")}>
          <Button onClick={createNewChat} className={cn("w-full", collapsed && "p-2 h-10 w-10 mx-auto")} variant="outline" size={collapsed ? "icon" : "default"}><Plus className="h-4 w-4" />{!collapsed && <span className="ml-2">Nouveau chat</span>}</Button>
        </div>
        {!collapsed && (
          <div className="flex-1 overflow-y-auto px-3">
            <div className="space-y-1">{conversations.map((conv) => (<Tooltip key={conv.id}><TooltipTrigger asChild><button onClick={() => { router.push(`/chat/${conv.id}`); setMobileOpen(false); }} className={cn("w-full text-left px-3 py-2 rounded-lg text-sm transition-colors truncate", pathname === `/chat/${conv.id}` ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground")}><MessageSquare className="inline h-3.5 w-3.5 mr-2 shrink-0" /><span className="truncate">{conv.title}</span></button></TooltipTrigger><TooltipContent side="right">{conv.title}</TooltipContent></Tooltip>))}</div>
          </div>
        )}
        <Separator />
        <nav className="p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            if (collapsed) return (<Tooltip key={item.href}><TooltipTrigger asChild><button onClick={() => { router.push(item.href); setMobileOpen(false); }} className={cn("w-full flex items-center justify-center p-2 rounded-lg transition-colors", isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground")}><Icon className="h-5 w-5" /></button></TooltipTrigger><TooltipContent side="right">{item.label}</TooltipContent></Tooltip>);
            return (<button key={item.href} onClick={() => { router.push(item.href); setMobileOpen(false); }} className={cn("w-full flex items-center px-3 py-2 rounded-lg text-sm transition-colors", isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground")}><Icon className="h-4 w-4 mr-3" />{item.label}</button>);
          })}
        </nav>
        <Separator />
        <div className={cn("p-3", collapsed && "px-2")}>
          {collapsed ? (
            <Tooltip><TooltipTrigger asChild><button onClick={() => signOut({ callbackUrl: "/login" })} className="w-full flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"><LogOut className="h-5 w-5" /></button></TooltipTrigger><TooltipContent side="right">Déconnexion</TooltipContent></Tooltip>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3"><Avatar className="h-8 w-8"><AvatarFallback className="bg-primary/10 text-primary text-xs">{initials}</AvatarFallback></Avatar><div className="text-sm truncate max-w-[120px]">{session?.user?.name || "Utilisateur"}</div></div>
              <button onClick={() => signOut({ callbackUrl: "/login" })} className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"><LogOut className="h-4 w-4" /></button>
            </div>
          )}
        </div>
        {collapsed && <><Separator /><div className="p-3 px-2 flex justify-center"><button onClick={() => setCollapsed(false)} className="p-2 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"><Menu className="h-4 w-4" /></button></div></>}
      </aside>
      {mobileOpen && <div onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-black/50 lg:hidden" />}
    </>
  );
}
