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
import { createClient } from "@/lib/supabase/client";
import type { Conversation } from "@/types";
import {
  MessageSquare,
  Plus,
  Settings,
  Key,
  Puzzle,
  LogOut,
  ChevronLeft,
  Bot,
  Cpu,
} from "lucide-react";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchConversations() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("conversations")
          .select("*")
          .order("updated_at", { ascending: false });
        if (data) setConversations(data);
      } catch (err) {
        console.error("Failed to fetch conversations:", err);
      } finally {
        setLoading(false);
      }
    }
    if (session) fetchConversations();
  }, [session]);

  const navItems = [
    { href: "/chat", label: "Chat", icon: MessageSquare },
    { href: "/byok", label: "BYOK", icon: Key },
    { href: "/composio", label: "Composio", icon: Puzzle },
    { href: "/mcp", label: "MCP", icon: Cpu },
    { href: "/settings", label: "Paramètres", icon: Settings },
  ];

  return (
    <aside
      className={cn(
        "h-full bg-card border-r border-border flex flex-col transition-all duration-300",
        collapsed ? "w-[70px]" : "w-[280px]"
      )}
    >
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-border shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm">ElshalflowAI</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onToggle}
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 transition-transform",
              collapsed && "rotate-180"
            )}
          />
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3">
        {!collapsed && (
          <div className="py-3">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => router.push("/chat")}
            >
              <Plus className="h-4 w-4" />
              Nouvelle conversation
            </Button>
          </div>
        )}

        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-3",
                      collapsed && "justify-center px-0"
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

        {!collapsed && (
          <>
            <Separator className="my-3" />

            {/* Conversations */}
            <div className="space-y-1">
              {loading ? (
                <div className="space-y-2 px-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-8 bg-secondary rounded animate-pulse" />
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <p className="text-xs text-muted-foreground px-2 py-2">
                  Aucune conversation
                </p>
              ) : (
                conversations.slice(0, 10).map((conv) => (
                  <Button
                    key={conv.id}
                    variant="ghost"
                    className="w-full justify-start text-xs truncate"
                    onClick={() => router.push(`/chat/${conv.id}`)}
                  >
                    <MessageSquare className="h-3 w-3 mr-2 shrink-0" />
                    <span className="truncate">{conv.title || "Nouveau chat"}</span>
                  </Button>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border p-3">
        {!collapsed && session?.user ? (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                {session.user.name?.charAt(0) || session.user.email?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {session.user.name || "Utilisateur"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {session.user.email}
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
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8",
              collapsed || "mx-auto"
            )}
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </div>
    </aside>
  );
}
