"use client";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Brain, MessageSquare, Key, Puzzle, Shield, Settings, Plus, Menu, X } from "lucide-react";

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
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={cn("h-full bg-card border-r border-border flex flex-col transition-all duration-300", collapsed ? "w-[68px]" : "w-[260px]")}>
      <div className="h-14 flex items-center justify-between px-4 border-b border-border">
        {!collapsed && (<div className="flex items-center gap-2.5"><div className="p-1.5 rounded-lg bg-primary/10"><Brain className="h-4 w-4 text-primary" /></div><span className="font-semibold text-sm">ElshalflowAI</span></div>)}
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCollapsed(!collapsed)}>{collapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}</Button>
      </div>
      {!collapsed && (<div className="p-3"><Button className="w-full justify-start gap-2" onClick={() => router.push("/chat")}><Plus className="h-4 w-4" />Nouveau chat</Button></div>)}
      <nav className={cn("px-2 space-y-1", collapsed && "px-1.5")}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (<Tooltip key={item.href}><TooltipTrigger asChild><Button variant={isActive ? "secondary" : "ghost"} className={cn("w-full", collapsed ? "justify-center px-0" : "justify-start gap-3")} onClick={() => router.push(item.href)}><item.icon className="h-4 w-4 shrink-0" />{!collapsed && <span className="text-sm">{item.label}</span>}</Button></TooltipTrigger>{collapsed && <TooltipContent side="right">{item.label}</TooltipContent>}</Tooltip>);
        })}
      </nav>
      <Separator className="mx-3 my-3" />
      <div className="flex-1" />
      <div className="border-t border-border p-3"><p className="text-xs text-muted-foreground text-center">ElshalflowAI v1.0</p></div>
    </aside>
  );
}
