"use client";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Brain, MessageSquare, Key, Puzzle, Shield, Settings, Plus, Menu, X } from "lucide-react";

const NAV = [
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/byok", label: "Cles API", icon: Key },
  { href: "/composio", label: "Composio", icon: Puzzle },
  { href: "/mcp", label: "MCP", icon: Shield },
  { href: "/settings", label: "Parametres", icon: Settings },
];

export function Sidebar() {
  const pn = usePathname();
  const r = useRouter();
  const [c, setC] = useState(true);
  function go(h: string) { r.push(h); }

  return (<>
    <button onClick={() => setC(!c)} className="fixed top-3 left-3 z-50 p-2 rounded-lg bg-card border border-border md:hidden">{c ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}</button>
    {!c && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setC(true)} />}
    <aside className={cn("h-full bg-card border-r border-border flex flex-col transition-all duration-200 z-40", c ? "-translate-x-full md:translate-x-0 md:w-[56px]" : "translate-x-0 w-[250px]", "fixed md:relative left-0 top-0 bottom-0")}>
      <div className="h-11 flex items-center justify-between px-2.5 border-b border-border">
        {!c && <div className="flex items-center gap-2"><div className="p-1 rounded-md bg-primary/10"><Brain className="h-3.5 w-3.5 text-primary" /></div><span className="font-semibold text-xs">ElshalflowAI</span></div>}
        <Button variant="ghost" size="icon" className="h-7 w-7 hidden md:flex" onClick={() => setC(!c)}>{c ? <Menu className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}</Button>
        {!c && <Button variant="ghost" size="icon" className="h-7 w-7 md:hidden" onClick={() => setC(true)}><X className="h-3.5 w-3.5" /></Button>}
      </div>
      {!c && <div className="p-1.5"><Button size="sm" className="w-full justify-start gap-2 text-xs h-7" onClick={() => go("/chat")}><Plus className="h-3 w-3" />Nouveau chat</Button></div>}
      <nav className={cn("px-1 space-y-0.5", c && "md:px-0.5")}>{NAV.map((item) => {
        const a = pn.startsWith(item.href);
        const btn = <Button key={item.href} variant={a ? "secondary" : "ghost"} size="sm" className={cn("w-full h-8", c ? "md:justify-center md:px-0" : "justify-start gap-2")} onClick={() => go(item.href)}><item.icon className="h-3.5 w-3.5 shrink-0" />{!c && <span className="text-[11px]">{item.label}</span>}</Button>;
        return c ? <Tooltip key={item.href}><TooltipTrigger asChild>{btn}</TooltipTrigger><TooltipContent side="right" className="md:block hidden">{item.label}</TooltipContent></Tooltip> : btn;
      })}</nav>
      <div className="flex-1" />
      <div className="border-t border-border p-1.5"><p className="text-[9px] text-muted-foreground text-center">v1.0</p></div>
    </aside>
  </>);
}
