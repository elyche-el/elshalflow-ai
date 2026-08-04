"use client";
import { useState, useRef, useEffect, FormEvent } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Brain, User, Bot, X, Trash2, StopCircle, Sparkles, Paperclip, ArrowUp } from "lucide-react";
import { Toaster, toast } from "sonner";

type Message = { id: string; role: string; content: string; images?: string[] };

const MODELS = [
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", multi: true },
  { id: "openai/gpt-4o", name: "GPT-4o", multi: true },
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", multi: true },
  { id: "google/gemini-2.0-flash", name: "Gemini 2.0 Flash", multi: true },
  { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro", multi: true },
];
const MAX_IMAGES = 5;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result as string); r.onerror = reject; r.readAsDataURL(file); });
}

export function ChatInterface() {
  const params = useParams();
  const cid = params?.conversationId as string || "default";
  const [messages, setMessages] = useState<Message[]>(() => { try { const s = localStorage.getItem(`chat_${cid}`); return s ? JSON.parse(s) : []; } catch { return []; } });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState("openai/gpt-4o-mini");
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);
  useEffect(() => { localStorage.setItem(`chat_${cid}`, JSON.stringify(messages)); }, [messages, cid]);

  function removeImage(i: number) { setImages(p => p.filter((_, x) => x !== i)); }
  function handleFiles(files: FileList) {
    const n: { file: File; preview: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      if (!files[i].type.startsWith("image/")) { toast.error(`${files[i].name} n'est pas une image`); continue; }
      if (files[i].size > 10*1024*1024) { toast.error(`${files[i].name} > 10MB`); continue; }
      if (images.length + n.length >= MAX_IMAGES) { toast.error(`Max ${MAX_IMAGES} images`); break; }
      n.push({ file: files[i], preview: URL.createObjectURL(files[i]) });
    }
    setImages(p => [...p, ...n]);
  }

  function handlePaste(e: React.ClipboardEvent) {
    const fs: File[] = [];
    for (let i = 0; i < e.clipboardData.items.length; i++) { if (e.clipboardData.items[i].type.startsWith("image/")) { const f = e.clipboardData.items[i].getAsFile(); if (f) fs.push(f); } }
    if (fs.length) { const dt = new DataTransfer(); fs.forEach(f => dt.items.add(f)); handleFiles(dt.files); }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if ((!input.trim() && images.length === 0) || isLoading) return;
    const b64s = await Promise.all(images.map(img => fileToBase64(img.file)));
    const previews = images.map(img => img.preview);
    let content: any = input;
    if (b64s.length) { const parts: any[] = [{ type: "text", text: input || "Décris cette image." }]; b64s.forEach(b => parts.push({ type: "image_url", image_url: { url: b } })); content = parts; }
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input || "[Image]", images: previews };
    setMessages(p => [...p, userMsg]);
    setInput(""); setImages([]); setIsLoading(true);
    const apiMsgs = messages.map(m => ({ role: m.role, content: m.images?.length ? m.content || "[Image]" : m.content }));
    apiMsgs.push({ role: "user", content } as any);
    const aMsg: Message = { id: (Date.now()+1).toString(), role: "assistant", content: "" };
    setMessages(p => [...p, aMsg]);
    abortRef.current = new AbortController();
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: apiMsgs, model }), signal: abortRef.current.signal });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const reader = res.body?.getReader(); if (!reader) throw new Error("Pas de stream");
      const decoder = new TextDecoder(); let full = "";
      while (true) { const { done, value } = await reader.read(); if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) { if (line.startsWith("data: ")) { const d = line.slice(6); if (d === "[DONE]") continue;
          try { full += JSON.parse(d).choices?.[0]?.delta?.content || ""; setMessages(p => p.map(m => m.id === aMsg.id ? { ...m, content: full } : m)); } catch {} }
        }
      }
    } catch (err: any) { if (err.name !== "AbortError") { toast.error(err.message); setMessages(p => p.map(m => m.id === aMsg.id ? { ...m, content: "❌ " + (err.message||"Erreur") } : m)); } }
    finally { setIsLoading(false); abortRef.current = null; }
  }

  function clearChat() { if (confirm("Effacer ?")) { setMessages([]); localStorage.removeItem(`chat_${cid}`); } }
  const modelInfo = MODELS.find(m => m.id === model);

  return (<div className="flex flex-col h-full">
    <Toaster richColors theme="dark" position="top-center" />
    <header className="h-14 flex items-center justify-between px-4 border-b border-border shrink-0">
      <div className="flex items-center gap-3"><Brain className="h-5 w-5 text-primary" /><h2 className="font-semibold text-sm">Chat</h2></div>
      <div className="flex items-center gap-2">
        <Select value={model} onValueChange={setModel}><SelectTrigger className="w-[200px] h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{MODELS.map(m=><SelectItem key={m.id} value={m.id}><span className="flex items-center gap-2">{m.name}{m.multi&&<Sparkles className="h-3 w-3 text-primary"/>}</span></SelectItem>)}</SelectContent></Select>
        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearChat}><Trash2 className="h-4 w-4"/></Button></TooltipTrigger><TooltipContent>Vider</TooltipContent></Tooltip>
      </div>
    </header>
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
      {messages.length===0&&(<div className="flex flex-col items-center justify-center h-full text-center space-y-5"><div className="p-6 rounded-3xl bg-primary/5 ring-1 ring-primary/10"><Brain className="h-14 w-14 text-primary/40"/></div><div className="space-y-2"><h3 className="text-xl font-bold">ElshalflowAI</h3><p className="text-muted-foreground text-sm max-w-xs">Assistant IA multimodal. Texte, images, tout est supporté.</p></div><div className="flex flex-wrap gap-2 justify-center">{["Explique la relativité","Analyse une image","Écris du code","Résume un texte"].map((s,i)=><button key={i} onClick={()=>setInput(s)} className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-secondary transition-colors text-muted-foreground">{s}</button>)}</div></div>)}
      {messages.map(msg=>(<div key={msg.id} className={`flex gap-3 ${msg.role==="user"?"justify-end":""}`}>
        {msg.role!=="user"&&<Avatar className="h-8 w-8 shrink-0 mt-0.5"><AvatarFallback className="bg-primary/10 text-primary"><Bot className="h-4 w-4"/></AvatarFallback></Avatar>}
        <div className={`max-w-[80%] ${msg.role==="user"?"order-first":""}`}>
          <span className="text-xs font-medium text-muted-foreground ml-1">{msg.role==="user"?"Vous":"ElshalflowAI"}</span>
          <div className={`mt-1 rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${msg.role==="user"?"bg-primary/10":"bg-secondary/50"}`}>
            {msg.images&&msg.images.length>0&&(<div className="flex gap-2 mb-2 flex-wrap">{msg.images.map((img,i)=><img key={i} src={img} alt="Upload" className="max-w-[200px] max-h-[200px] rounded-lg object-cover"/>)}</div>)}
            {msg.content?<ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>:msg.images?.length?null:<Sparkles className="h-4 w-4 animate-pulse"/>}
          </div>
        </div>
        {msg.role==="user"&&<Avatar className="h-8 w-8 shrink-0 mt-0.5"><AvatarFallback className="bg-blue-500/20 text-blue-400"><User className="h-4 w-4"/></AvatarFallback></Avatar>}
      </div>))}
      {isLoading&&messages[messages.length-1]?.role==="user"&&(<div className="flex gap-3"><Avatar className="h-8 w-8"><AvatarFallback className="bg-primary/10"><Sparkles className="h-4 w-4 animate-pulse"/></AvatarFallback></Avatar><div className="bg-secondary/50 rounded-2xl px-4 py-3"><div className="flex gap-1.5"><span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce"/><span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{animationDelay:"0.15s"}}/><span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{animationDelay:"0.3s"}}/></div></div></div>)}
    </div>
    {images.length>0&&(<div className="px-4 pb-1 flex gap-2 flex-wrap">{images.map((img,i)=>(<div key={i} className="relative group"><img src={img.preview} alt="Preview" className="h-16 w-16 rounded-lg object-cover border border-border"/><button onClick={()=>removeImage(i)} className="absolute -top-1.5 -right-1.5 bg-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-3 w-3 text-white"/></button></div>))}</div>)}
    <div className={`p-4 border-t border-border ${dragOver?"bg-primary/5":""}`} onDragOver={e=>{e.preventDefault();setDragOver(true)}} onDragLeave={()=>setDragOver(false)} onDrop={e=>{e.preventDefault();setDragOver(false);if(e.dataTransfer.files.length)handleFiles(e.dataTransfer.files)}}>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1 relative">
          <Textarea value={input} onChange={e=>setInput(e.target.value)} onPaste={handlePaste} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleSubmit(e)}}} placeholder="Message... (Entrée = envoyer, Shift+Entrée = nouvelle ligne)" rows={1} className="min-h-[48px] max-h-[180px] resize-none pr-20 text-sm" disabled={isLoading}/>
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            <Tooltip><TooltipTrigger asChild><button type="button" onClick={()=>fileInputRef.current?.click()} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground transition-colors"><Paperclip className="h-4 w-4"/></button></TooltipTrigger><TooltipContent>Ajouter une image</TooltipContent></Tooltip>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e=>e.target.files&&handleFiles(e.target.files)}/>
            {isLoading&&<button type="button" onClick={()=>abortRef.current?.abort()} className="p-1.5 rounded-md hover:bg-red-500/20 text-red-400 transition-colors"><StopCircle className="h-4 w-4"/></button>}
          </div>
        </div>
        <Button type="submit" size="icon" disabled={(!input.trim()&&images.length===0)||isLoading} className="h-[48px] w-[48px] shrink-0 rounded-xl"><ArrowUp className="h-5 w-5"/></Button>
      </form>
      <p className="text-[11px] text-muted-foreground mt-1.5 text-center">Glissez-déposez des images • Collez depuis le presse-papier • {MAX_IMAGES} images max</p>
    </div>
  </div>);
}
