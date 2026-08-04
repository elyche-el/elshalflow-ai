"use client";
import { useState, useRef, useEffect, FormEvent } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Brain, User, Bot, X, Trash2, StopCircle, Sparkles, Paperclip, Puzzle, Plug, Wand } from "lucide-react";
import { Toaster, toast } from "sonner";

type Message = { id: string; role: string; content: string; images?: string[]; toolCalls?: { name: string; icon: string; simulation: string }[] };
type Connection = { id: string; app_name: string; status: string };

const MODELS = [{ id: "openai/gpt-4o-mini", name: "GPT-4o Mini", multi: true },{ id: "openai/gpt-4o", name: "GPT-4o", multi: true },{ id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", multi: true },{ id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro", multi: true }];
const MAX_IMAGES = 5;
const APP_ICONS: Record<string, string> = { gmail: "📧", slack: "💬", github: "🐙", notion: "📝", google_calendar: "📅", google_drive: "📁", twitter: "🐦", linear: "📋" };

function fileToBase64(f: File): Promise<string> { return new Promise((rs,rj)=>{const r=new FileReader();r.onload=()=>rs(r.result as string);r.onerror=rj;r.readAsDataURL(f)}); }

function getConnections(): string[] { try { const v = localStorage.getItem("elshalflow_composio"); return v ? (JSON.parse(v) as Connection[]).filter((c: Connection) => c.status === "connected").map((c: Connection) => c.app_name) : []; } catch { return []; } }

export function ChatInterface() {
  const cid = (useParams()?.conversationId as string) || "default";
  const [messages, setMessages] = useState<Message[]>(() => { try { return JSON.parse(localStorage.getItem(`chat_${cid}`) || "[]"); } catch { return []; } });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState("openai/gpt-4o-mini");
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [connectedApps, setConnectedApps] = useState<string[]>(getConnections);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);
  useEffect(() => { localStorage.setItem(`chat_${cid}`, JSON.stringify(messages)); }, [messages, cid]);
  useEffect(() => { const h = () => setConnectedApps(getConnections()); window.addEventListener("storage", h); window.addEventListener("composio_update", h); return () => { window.removeEventListener("storage", h); window.removeEventListener("composio_update", h); }; }, []);

  function removeImage(i: number) { setImages(p => p.filter((_, x) => x !== i)); }
  function handleFiles(files: FileList) { const n: { file: File; preview: string }[] = []; for (let i = 0; i < files.length; i++) { if (!files[i].type.startsWith("image/")) { toast.error(`${files[i].name} non image`); continue; } if (files[i].size > 10*1024*1024) { toast.error(`${files[i].name} > 10MB`); continue; } if (images.length + n.length >= MAX_IMAGES) { toast.error(`Max ${MAX_IMAGES}`); break; } n.push({ file: files[i], preview: URL.createObjectURL(files[i]) }); } setImages(p => [...p, ...n]); }
  function handlePaste(e: React.ClipboardEvent) { const fs: File[] = []; for (let i = 0; i < e.clipboardData.items.length; i++) { if (e.clipboardData.items[i].type.startsWith("image/")) { const f = e.clipboardData.items[i].getAsFile(); if (f) fs.push(f); } } if (fs.length) { const dt = new DataTransfer(); fs.forEach(f => dt.items.add(f)); handleFiles(dt.files); } }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if ((!input.trim() && images.length === 0) || isLoading) return;
    const b64s = await Promise.all(images.map(img => fileToBase64(img.file)));
    const previews = images.map(img => img.preview);
    let content: any = input;
    if (b64s.length) { const parts: any[] = [{ type: "text", text: input || "Décris cette image." }]; b64s.forEach(b => parts.push({ type: "image_url", image_url: { url: b } })); content = parts; }
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input || "[Image]", images: previews };
    setMessages(p => [...p, userMsg]); setInput(""); setImages([]); setIsLoading(true);
    const apiMsgs = messages.map(m => ({ role: m.role, content: m.images?.length ? m.content || "[Image]" : m.content }));
    apiMsgs.push({ role: "user", content } as any);
    const apps = getConnections();
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: apiMsgs, model, connectedApps: apps }) });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessages(p => [...p, { id: (Date.now() + 1).toString(), role: "assistant", content: data.response || "", toolCalls: data.toolCalls }]);
    } catch (err: any) { toast.error(err.message); setMessages(p => [...p, { id: (Date.now() + 1).toString(), role: "assistant", content: "❌ " + (err.message || "Erreur") }]); }
    finally { setIsLoading(false); }
  }

  function clearChat() { if (confirm("Effacer ?")) { setMessages([]); localStorage.removeItem(`chat_${cid}`); } }

  const toolSuggestions = connectedApps.length > 0 ? [
    connectedApps.includes("gmail") && "Envoie un email à alice@example.com pour confirmer la réunion de demain",
    connectedApps.includes("slack") && "Envoie un message sur #général pour dire bonjour à l'équipe",
    connectedApps.includes("github") && "Crée une issue 'Bug: login cassé' sur elyche-el/elshalflow-ai",
    connectedApps.includes("notion") && "Crée une page Notion avec le compte-rendu de réunion",
    connectedApps.includes("google_calendar") && "Crée un événement 'Revue de code' demain à 14h",
    connectedApps.includes("twitter") && "Publie un tweet annonçant la nouvelle feature",
    connectedApps.includes("linear") && "Crée une tâche Linear 'CI/CD' priorité haute",
  ].filter(Boolean).slice(0, 6) : [];

  return (<div className="flex flex-col h-full">
    <Toaster richColors theme="dark" position="top-center" />
    <header className="h-14 flex items-center justify-between px-4 border-b border-border shrink-0">
      <div className="flex items-center gap-3"><Brain className="h-5 w-5 text-primary" /><h2 className="font-semibold text-sm">Chat</h2>{connectedApps.length > 0 && <Badge variant="secondary" className="text-xs gap-1"><Plug className="h-3 w-3" />{connectedApps.length}</Badge>}</div>
      <div className="flex items-center gap-2">
        {connectedApps.length > 0 && (<Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className={`h-8 w-8 ${showTools ? "bg-primary/10 text-primary" : ""}`} onClick={() => setShowTools(!showTools)}><Wand className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Actions</TooltipContent></Tooltip>)}
        <Select value={model} onValueChange={setModel}><SelectTrigger className="w-[200px] h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{MODELS.map(m => <SelectItem key={m.id} value={m.id}><span className="flex items-center gap-2">{m.name}{m.multi && <Sparkles className="h-3 w-3 text-primary" />}</span></SelectItem>)}</SelectContent></Select>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearChat}><Trash2 className="h-4 w-4" /></Button>
      </div>
    </header>

    {showTools && connectedApps.length > 0 && (<div className="border-b border-border bg-card/50 p-4 space-y-3"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold flex items-center gap-2"><Wand className="h-4 w-4 text-primary" />Actions disponibles</h3><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowTools(false)}><X className="h-3.5 w-3.5" /></Button></div><div className="grid grid-cols-2 md:grid-cols-4 gap-2">{connectedApps.map(app => { const prompts: Record<string, string> = { gmail: "Envoie un email à contact@example.com avec le sujet 'Test'", slack: "Envoie un message sur #général : 'Hello !'", github: "Crée une issue 'Améliorer la doc' sur elyche-el/elshalflow-ai", notion: "Crée une page Notion 'Notes'", google_calendar: "Crée un événement 'Standup' demain 9h", twitter: "Publie un tweet : 'ElshalflowAI 🚀 !'", linear: "Crée une tâche Linear 'Bug login'", }; return (<button key={app} onClick={() => { setInput(prompts[app] || `Utilise ${app}...`); setShowTools(false); }} className="flex items-center gap-2 p-2.5 rounded-lg border border-border hover:border-primary/30 bg-secondary/30 hover:bg-secondary/50 transition-all group"><span className="text-lg">{APP_ICONS[app] || "🔌"}</span><span className="text-xs font-medium group-hover:text-primary">{app.replace(/_/g, " ")}</span></button>); })}</div></div>)}

    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
      {messages.length === 0 && (<div className="flex flex-col items-center justify-center h-full text-center space-y-5"><div className="p-6 rounded-3xl bg-primary/5 ring-1 ring-primary/10"><Brain className="h-14 w-14 text-primary/40" /></div><div className="space-y-2"><h3 className="text-xl font-bold">ElshalflowAI</h3><p className="text-muted-foreground text-sm max-w-sm">{connectedApps.length > 0 ? `${connectedApps.length} app${connectedApps.length > 1 ? "s" : ""} connectée${connectedApps.length > 1 ? "s" : ""}. Envoyez des emails, messages Slack, créez des issues...` : "Connectez des apps dans Composio pour débloquer les actions !"}</p></div><div className="flex flex-wrap gap-2 justify-center max-w-md">{toolSuggestions.length > 0 ? (<div className="space-y-1.5 w-full"><p className="text-xs text-muted-foreground uppercase tracking-wide">Suggestions d'actions</p>{toolSuggestions.map((s, i) => (<button key={i} onClick={() => setInput(s as string)} className="block w-full text-left text-xs px-3 py-2 rounded-lg border border-border hover:bg-secondary transition-colors text-muted-foreground truncate">{s as string}</button>))}</div>) : (<button onClick={() => window.dispatchEvent(new CustomEvent("navigate", { detail: "/composio" }))} className="text-xs px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 flex items-center gap-1.5"><Puzzle className="h-3.5 w-3.5" />Connecter des apps</button>)}</div></div>)}
      {messages.map(msg => (<div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
        {msg.role !== "user" && <Avatar className="h-8 w-8 shrink-0 mt-0.5"><AvatarFallback className="bg-primary/10 text-primary"><Bot className="h-4 w-4" /></AvatarFallback></Avatar>}
        <div className={`max-w-[80%] ${msg.role === "user" ? "order-first" : ""}`}>
          <span className="text-xs font-medium text-muted-foreground ml-1">{msg.role === "user" ? "Vous" : "ElshalflowAI"}</span>
          {msg.toolCalls && msg.toolCalls.length > 0 && (<div className="my-2 space-y-2">{msg.toolCalls.map((tc, i) => (<div key={i} className="flex items-start gap-2 p-2.5 rounded-xl bg-primary/5 border border-primary/20"><span className="text-lg shrink-0">{tc.icon}</span><div className="flex-1 min-w-0"><p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">{tc.name.replace(/_/g, " ")}</p><div className="text-xs text-muted-foreground whitespace-pre-wrap">{tc.simulation}</div></div><div className="shrink-0"><div className="w-2 h-2 rounded-full bg-green-400 mt-1.5" /></div></div>))}</div>)}
          <div className={`mt-1 rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${msg.role === "user" ? "bg-primary/10" : "bg-secondary/50"}`}>
            {msg.images && msg.images.length > 0 && (<div className="flex gap-2 mb-2 flex-wrap">{msg.images.map((img, i) => <img key={i} src={img} alt="Upload" className="max-w-[200px] max-h-[200px] rounded-lg object-cover" />)}</div>)}
            {msg.content ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown> : msg.toolCalls?.length ? <span className="text-muted-foreground italic">Actions exécutées</span> : <Sparkles className="h-4 w-4 animate-pulse" />}
          </div>
        </div>
        {msg.role === "user" && <Avatar className="h-8 w-8 shrink-0 mt-0.5"><AvatarFallback className="bg-blue-500/20 text-blue-400"><User className="h-4 w-4" /></AvatarFallback></Avatar>}
      </div>))}
      {isLoading && (<div className="flex gap-3"><Avatar className="h-8 w-8"><AvatarFallback className="bg-primary/10"><Sparkles className="h-4 w-4 animate-pulse" /></AvatarFallback></Avatar><div className="bg-secondary/50 rounded-2xl px-4 py-3"><div className="flex gap-1.5"><span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" /><span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0.15s" }} /><span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0.3s" }} /></div></div></div>)}
    </div>

    {images.length > 0 && (<div className="px-4 pb-1 flex gap-2 flex-wrap">{images.map((img, i) => (<div key={i} className="relative group"><img src={img.preview} alt="Preview" className="h-16 w-16 rounded-lg object-cover border border-border" /><button onClick={() => removeImage(i)} className="absolute -top-1.5 -right-1.5 bg-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100"><X className="h-3 w-3 text-white" /></button></div>))}</div>)}

    <div className={`p-4 border-t border-border ${dragOver ? "bg-primary/5" : ""}`} onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); }}>
      <form onSubmit={handleSubmit} className="flex gap-2"><div className="flex-1 relative"><Textarea value={input} onChange={e => setInput(e.target.value)} onPaste={handlePaste} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }} placeholder="Message... (Entrée = envoyer)" rows={1} className="min-h-[48px] max-h-[180px] resize-none pr-20 text-sm" disabled={isLoading} /><div className="absolute right-2 bottom-2 flex items-center gap-1"><Tooltip><TooltipTrigger asChild><button type="button" onClick={() => fileRef.current?.click()} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground"><Paperclip className="h-4 w-4" /></button></TooltipTrigger><TooltipContent>Image</TooltipContent></Tooltip><input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => e.target.files && handleFiles(e.target.files)} />{isLoading && <button type="button" onClick={() => abortRef.current?.abort()} className="p-1.5 text-red-400"><StopCircle className="h-4 w-4" /></button>}</div></div><Button type="submit" size="icon" disabled={(!input.trim() && images.length === 0) || isLoading} className="h-[48px] w-[48px] shrink-0 rounded-xl"><Send className="h-5 w-5" /></Button></form>
      <p className="text-[11px] text-muted-foreground mt-1.5 text-center">{connectedApps.length > 0 ? `${connectedApps.length} app${connectedApps.length > 1 ? "s" : ""} connectée${connectedApps.length > 1 ? "s" : ""} — ` : "Connectez des apps dans Composio — "}Glissez-déposez • Coller • {MAX_IMAGES} images max</p>
    </div>
  </div>);
}
