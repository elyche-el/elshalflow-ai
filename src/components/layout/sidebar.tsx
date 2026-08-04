// ============================================================
// ElshalflowAI — Sidebar Component
// ============================================================

"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Brain,
  MessageSquare,
  Key,
  Puzzle,
  Shield,
  Settings,
  LogOut,
  Plus,
  Menu,
  X,
} from "lucide-react";
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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    async function loadConversations() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("conversations")
          .select("*")
          .order("updated_at", { ascending: false })
          .limit(20);
        if (data) setConversations(data);
      } catch {}
    }
    if (session?.user) loadConversations();
  }, [session]);

  return (
    <aside
      className={cn(
        "h-full bg-card border-r border-border flex flex-col transition-all duration-300",
        collapsed ? "w-[68px]" : "w-[260px]"
      )}
    >
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-border">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold text-sm">ElshalflowAI</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </Button>
      </div>

      {/* New Chat */}
      {!collapsed && (
        <div className="p-3">
          <Button
            className="w-full justify-start gap-2"
            onClick={() => router.push("/chat")}
          >
            <Plus className="h-4 w-4" />
            Nouveau chat
          </Button>
        </div>
      )}

      {/* Nav Items */}
      <nav className={cn("px-2 space-y-1", collapsed && "px-1.5")}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full",
                    collapsed ? "justify-center px-0" : "justify-start gap-3"
                  )}
                  onClick={() => router.push(item.href)}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="text-sm">{item.label}</span>}
                </Button>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right">{item.label}</TooltipContent>
              )}
            </Tooltip>
          );
        })}
      </nav>

      <Separator className="mx-3 my-3" />

      {/* Conversations */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
          {conversations.length === 0 ? (
            <p className="text-xs text-muted-foreground px-2 py-3">
              Aucune conversation
            </p>
          ) : (
            conversations.map((conv) => (
              <Button
                key={conv.id}
                variant="ghost"
                className="w-full justify-start text-xs h-8 px-2"
                onClick={() => router.push(`/chat/${conv.id}`)}
              >
                <MessageSquare className="h-3 w-3 mr-2 shrink-0" />
                <span className="truncate">{conv.title || "Nouveau chat"}</span>
              </Button>
            ))
          )}
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="text-xs bg-primary/20 text-primary">
              {session?.user?.name?.charAt(0) ||
                session?.user?.email?.charAt(0) ||
                "?"}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {session?.user?.name || "Utilisateur"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {session?.user?.email}
                </p>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => signOut()}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Déconnexion</TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
