"use client";
import { Sidebar } from "@/components/layout/sidebar";
import { useState, useEffect } from "react";
export default function DashboardLayout({ children }: { children: React.ReactNode }) { const [convId, setConvId] = useState<string>(""); useEffect(() => { const p = new URLSearchParams(window.location.search); const c = p.get("c"); if (c) setConvId(c); }, []); function hs(id: string) { setConvId(id); window.history.pushState({}, "", "/chat?c=" + id); } function hn() { setConvId(""); window.history.pushState({}, "", "/chat"); } return (<div className="flex h-screen overflow-hidden bg-background"><Sidebar activeConvId={convId} onSelect={hs} onNew={hn} onDelete={(id: string) => { if (convId === id) hn(); }} /><main className="flex-1 overflow-hidden">{children}</main></div>); }
