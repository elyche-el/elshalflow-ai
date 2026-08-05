"use client";
import { useState, useRef, useEffect, FormEvent } from "react";
import { Send, StopCircle, Paperclip, X, Brain, ChevronDown } from "lucide-react";
import { Toaster, toast } from "sonner";
import { getAnonUserId } from "@/lib/auth-anon";

function fileToDataURL(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("File read error"));
    reader.readAsDataURL(f);
  });
}

type Provider = "openrouter" | "agentrouter";

const PROVIDERS: { id: Provider; name: string; color: string }[] = [
  { id: "openrouter", name: "OpenRouter", color: "border-blue-500/30 text-blue-400 bg-blue-500/10" },
  { id: "agentrouter", name: "AgentRouter", color: "border-purple-500/30 text-purple-400 bg-purple-500/10" },
];

const AGENTROUTER_URL = "https://agentrouter.org/v1/chat/completions";
const AR_KEY = "Sk-CXBlcOzzMoBkLd6zkgqwUKeTZ5wl8HCb9tbu6vOBtIxLIXYn";

interface ModelInfo { id: string; name: string; f: boolean; provider: Provider; p: string; d: string; }

const MODELS: ModelInfo[] = [
  { id: "nvidia/nemotron-3-super-120b-a12b:free", name: "Nemotron 3 Super", f: true, provider: "openrouter", p: "NVIDIA", d: "120B gratuit" },
  { id: "nvidia/nemotron-3-ultra-550b-a55b:free", name: "Nemotron 3 Ultra", f: true, provider: "openrouter", p: "NVIDIA", d: "550B gratuit" },
  { id: "nvidia/nemotron-nano-9b-v2:free", name: "Nemotron Nano 9B", f: true, provider: "openrouter", p: "NVIDIA", d: "9B gratuit" },
  { id: "poolside/laguna-s-2.1:free", name: "Laguna S 2.1", f: true, provider: "openrouter", p: "Poolside", d: "Coding gratuit" },
  { id: "cohere/north-mini-code:free", name: "North Mini Code", f: true, provider: "openrouter", p: "Cohere", d: "Code gratuit" },
  { id: "inclusionai/ling-3.0-flash:free", name: "Ling 3.0 Flash", f: true, provider: "openrouter", p: "InclusionAI", d: "Rapide gratuit" },
  { id: "google/gemma-4-31b-it:free", name: "Gemma 4 31B", f: true, provider: "openrouter", p: "Google", d: "Vision gratuit" },
  { id: "google/gemma-4-26b-a4b-it:free", name: "Gemma 4 26B", f: true, provider: "openrouter", p: "Google", d: "Vision gratuit" },
  { id: "nvidia/nemotron-nano-12b-v2-vl:free", name: "Nemotron Nano VL", f: true, provider: "openrouter", p: "NVIDIA", d: "Vision gratuit" },
  { id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", name: "Nemotron Omni", f: true, provider: "openrouter", p: "NVIDIA", d: "Omni gratuit" },
  { id: "openai/gpt-oss-20b:free", name: "GPT-OSS 20B", f: true, provider: "openrouter", p: "OpenAI", d: "Open source" },
  { id: "deepseek/deepseek-chat-v3-0324", name: "DeepSeek V3", f: false, provider: "openrouter", p: "DeepSeek", d: "$0.27/$1.1" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", f: false, provider: "openrouter", p: "OpenAI", d: "$0.15/$0.6" },
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", f: false, provider: "openrouter", p: "Anthropic", d: "$3/$15" },
  { id: "meta-llama/llama-4-maverick", name: "Llama 4 Maverick", f: false, provider: "openrouter", p: "Meta", d: "$0.2/$0.9" },
  { id: "google/gemini-2.5-pro-preview-06-05", name: "Gemini 2.5 Pro", f: false, provider: "openrouter", p: "Google", d: "$1.25/$10" },
  { id: "mistralai/mistral-large-2411", name: "Mistral Large", f: false, provider: "openrouter", p: "Mistral", d: "$2/$6" },
  { id: "claude-sonnet-4-5-20250929", name: "Claude Sonnet 4.5", f: false, provider: "agentrouter", p: "Anthropic", d: "via AgentRouter" },
  { id: "claude-haiku-3-5-20241022", name: "Claude Haiku 3.5", f: false, provider: "agentrouter", p: "Anthropic", d: "via AgentRouter" },
  { id: "gpt-4o", name: "GPT-4o", f: false, provider: "agentrouter", p: "OpenAI", d: "via AgentRouter" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini (AR)", f: false, provider: "agentrouter", p: "OpenAI", d: "via AgentRouter" },
  { id: "deepseek-r1", name: "DeepSeek R1 (AR)", f: false, provider: "agentrouter", p: "DeepSeek", d: "via AgentRouter" },
  { id: "gemini-2.0-flash-001", name: "Gemini 2.0 Flash", f: false, provider: "agentrouter", p: "Google", d: "via AgentRouter" },
  { id: "glm-4.5-air", name: "GLM-4.5 Air", f: false, provider: "agentrouter", p: "Z.ai", d: "via AgentRouter" },
];

export function ChatInterface({ convId: initialConvId }: { convId?: string }) {
  const [convId, setConvId] = useState(initialConvId || "");
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState("nvidia/nemotron-3-super-120b-a12b:free");
  const [provider, setProvider] = useState<Provider>("openrouter");
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showProviderPicker, setShowProviderPicker] = useState(false);
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "free" | "paid">("all");
  const [hasKey, setHasKey] = useState(false);
  const [providerKeys, setProviderKeys] = useState<Record<Provider, boolean>>({ openrouter: false, agentrouter: false });
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const providerPickerRef = useRef<HTMLDivElement>(null);
  const anonId = typeof window !== "undefined" ? getAnonUserId() : "";

  useEffect(() => { if (!convId || !anonId) { setMessages([]); return; } fetch(`/api/messages?conversationId=${convId}`, { headers: { "x-anon-user-id": anonId } }).then(r => r.json()).then(d => { if (d.messages) setMessages(d.messages.map((m: any) => ({ id: m.id, role: m.role, content: m.content, model: m.model }))); }).catch(() => {}); }, [convId, anonId]);
  useEffect(() => { if (!anonId) return; fetch("/api/keys", { headers: { "x-anon-user-id": anonId } }).then(r => r.json()).then(d => { const keys = d.keys || []; setHasKey(keys.length > 0); const pk: Record<Provider, boolean> = { openrouter: false, agentrouter: !!AR_KEY }; keys.forEach((k: any) => { if (k.provider === "openrouter" || k.provider === "agentrouter") pk[k.provider] = true; }); setProviderKeys(pk); }).catch(() => setHasKey(false)); }, [anonId]);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);
  useEffect(() => { const h = (e: MouseEvent) => { if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowModelPicker(false); if (providerPickerRef.current && !providerPickerRef.current.contains(e.target as Node)) setShowProviderPicker(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);

  function switchProvider(p: Provider) { setProvider(p); setShowProviderPicker(false); const fm = MODELS.find(m => m.provider === p); if (fm) setModel(fm.id); }
  const currentProvider = PROVIDERS.find(p => p.id === provider)!;
  const providerModels = MODELS.filter(m => m.provider === provider);
  const freeModels = providerModels.filter(m => m.f);
  const paidModels = providerModels.filter(m => !m.f);
  const filteredModels = providerModels.filter(m => { if (filterTab === "free" && !m.f) return false; if (filterTab === "paid" && m.f) return false; if (search && !m.name.toLowerCase().includes(search.toLowerCase()) && !m.p.toLowerCase().includes(search.toLowerCase())) return false; return true; });

  function selectModel(id: string) { setModel(id); setShowModelPicker(false); setSearch(""); }
  function removeImage(i: number) { setImages(prev => prev.filter((_, idx) => idx !== i)); }
  function handleFiles(files: FileList) { const ni: { file: File; preview: string }[] = []; for (let i = 0; i < files.length; i++) { const f = files[i]; if (!f.type.startsWith("image/")) { toast.error("Images uniquement"); continue; } if (f.size > 10485760) { toast.error(">10 MB"); continue; } if (images.length + ni.length >= 5) { toast.error("Max 5 images"); break; } ni.push({ file: f, preview: URL.createObjectURL(f) }); } setImages(prev => [...prev, ...ni]); }
  function handlePaste(e: React.ClipboardEvent) { const fs: File[] = []; for (let i = 0; i < e.clipboardData.items.length; i++) { if (e.clipboardData.items[i].type.startsWith("image/")) { const f = e.clipboardData.items[i].getAsFile(); if (f) fs.push(f); } } if (fs.length) { const dt = new DataTransfer(); fs.forEach(f => dt.items.add(f)); handleFiles(dt.files); } }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if ((!input.trim() && images.length === 0) || loading) return;
    if (!hasKey) { toast.error("Ajoutez une cle API dans Cles API"); return; }
    if (!providerKeys[provider]) { toast.error(`Aucune cle ${PROVIDERS.find(p => p.id === provider)?.name} configuree`); return; }
    let cid = convId;
    if (!cid) { try { const res = await fetch("/api/conversations", { method: "POST", headers: { "Content-Type": "application/json", "x-anon-user-id": anonId }, body: JSON.stringify({ title: input.trim().slice(0, 60) || "Nouveau chat", model, provider }) }); const data = await res.json(); if (data.conversation) { cid = data.conversation.id; setConvId(cid); window.dispatchEvent(new CustomEvent("elshalflow_refresh_convs")); window.history.pushState({}, "", `/chat?c=${cid}`); } } catch {} }
    let userContent: any;
    if (images.length > 0) { const parts: any[] = []; if (input.trim()) parts.push({ type: "text", text: input.trim() }); const dataUrls = await Promise.all(images.map(img => fileToDataURL(img.file))); for (const url of dataUrls) parts.push({ type: "image_url", image_url: { url } }); userContent = parts; }
    else { userContent = input.trim(); }
    setMessages(prev => [...prev, { id: "u" + Date.now(), role: "user", content: input.trim() || "[Image]", images: images.map(i => i.preview), model, provider }]);
    setInput(""); setImages([]); setLoading(true);
    const apiMessages = messages.map((m: any) => { if (m.images?.length) { const parts: any[] = []; if (typeof m.content === "string" && m.content !== "[Image]") parts.push({ type: "text", text: m.content }); for (const url of m.images) parts.push({ type: "image_url", image_url: { url } }); return { role: m.role, content: parts }; } return { role: m.role, content: m.content }; });
    apiMessages.push({ role: "user", content: userContent });
    const assistantId = "a" + Date.now();
    setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "", model, provider }]);
    abortRef.current = new AbortController();
    try {
      let resp: Response;
      // AgentRouter: call directly from browser to bypass Alibaba WAF
      if (provider === "agentrouter") {
        resp = await fetch(AGENTROUTER_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + AR_KEY },
          body: JSON.stringify({ model, messages: apiMessages, max_tokens: 2048, stream: true }),
          signal: abortRef.current.signal,
        });
      } else {
        resp = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json", "x-anon-user-id": anonId }, body: JSON.stringify({ messages: apiMessages, model, provider, conversationId: cid }), signal: abortRef.current.signal });
      }
      if (!resp.ok) { const err = await resp.json().catch(() => ({})); throw new Error(err.response || err.error || `HTTP ${resp.status}`); }
      const reader = resp.body?.getReader(); if (!reader) throw new Error("Stream non disponible");
      const decoder = new TextDecoder(); let buffer = ""; let streamedContent = ""; let streamedModel = model; let lastUIUpdate = 0;
      function flushUI() { const now = Date.now(); if (now - lastUIUpdate >= 30) { setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: streamedContent, model: streamedModel } : m)); lastUIUpdate = now; } }
      while (true) { const { done, value } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true }); let boundary: number; while ((boundary = buffer.indexOf("\n\n")) !== -1) { const frame = buffer.slice(0, boundary); buffer = buffer.slice(boundary + 2); const dataIdx = frame.lastIndexOf("data: "); if (dataIdx === -1) continue; try { const parsed = JSON.parse(frame.slice(dataIdx + 6)); if (parsed.delta) { streamedContent += parsed.delta; if (parsed.model) streamedModel = parsed.model; flushUI(); } if (parsed.done && parsed.full) streamedContent = parsed.full; if (parsed.error) toast.error(parsed.error); } catch {} } flushUI(); }
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: streamedContent || "(vide)", model: streamedModel } : m));
      window.dispatchEvent(new CustomEvent("elshalflow_refresh_convs"));
    } catch (err: any) { if (err.name !== "AbortError") { toast.error(err.message); setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: `Erreur: ${err.message}` } : m)); } }
    finally { setLoading(false); abortRef.current = null; }
  }

  function renderMarkdown(text: string) { let html = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre class="bg-secondary/50 rounded-lg p-2.5 my-1.5 overflow-x-auto text-[11px]"><code>$2</code></pre>'); html = html.replace(/`([^`]+)`/g, '<code class="bg-secondary/50 px-1 py-0.5 rounded text-[11px]">$1</code>'); html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"); html = html.replace(/\n/g, "<br/>"); return <div dangerouslySetInnerHTML={{ __html: html }} />; }

  const currentModel = MODELS.find(m => m.id === model) || MODELS[0];

  return (<div className="flex flex-col h-full bg-background"><Toaster richColors theme="dark" position="top-center" />
    <div ref={scrollRef} className="flex-1 overflow-y-auto pb-4">
      {messages.length === 0 ? (<div className="flex flex-col items-center justify-center h-full px-6 text-center py-12"><div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6"><Brain className="w-8 h-8 text-primary/40" /></div><h1 className="text-2xl font-bold mb-2">ElshalflowAI</h1><p className="text-muted-foreground text-sm max-w-xs mb-6">Assistant IA avec OpenRouter + AgentRouter</p>{!hasKey ? (<div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 max-w-xs"><p className="text-amber-400 text-sm font-medium mb-1">Ajoutez votre cle API</p><p className="text-muted-foreground text-xs">Menu lateral → Cles API</p></div>) : (<div className="space-y-1"><p className="text-green-400 text-xs">Cle detectee — Pret !</p><p className="text-[10px] text-muted-foreground">{providerKeys.openrouter && "🔵 OpenRouter "}{providerKeys.agentrouter && "🟣 AgentRouter"}</p></div>)}</div>) : (<div className="max-w-3xl mx-auto px-4 py-6 space-y-6">{messages.map((msg) => (<div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] break-words ${msg.role === "user" ? "flex flex-col items-end" : ""}`}>{msg.role === "assistant" && (<div className="flex items-center gap-1.5 mb-1 ml-1">{msg.provider && (<span className={`text-[9px] px-1 py-0 rounded ${PROVIDERS.find(p=>p.id===msg.provider)?.color||""}`}>{PROVIDERS.find(p=>p.id===msg.provider)?.name}</span>)}<span className="text-[10px] text-muted-foreground font-medium">{MODELS.find(x=>x.id===msg.model)?.name||msg.model}</span></div>)}{msg.images?.length>0&&(<div className="flex gap-1 mb-1 flex-wrap justify-end">{msg.images.map((url:string,i:number)=><img key={i} src={url} alt="" className="max-w-[120px] max-h-[120px] rounded-lg object-cover"/>)}</div>)}<div className={`px-4 py-3 text-[14px] leading-relaxed rounded-2xl ${msg.role==="user"?"bg-primary/15 text-foreground rounded-br-md":"text-foreground"}`}>{msg.content?renderMarkdown(msg.content):<span className="flex gap-1.5 py-1"><span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"/><span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{animationDelay:"0.15s"}}/><span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{animationDelay:"0.3s"}}/></span>}</div></div></div>))}</div>)}
    </div>
    {images.length > 0 && (<div className="px-4 pb-1 flex gap-1.5 flex-wrap max-w-3xl mx-auto w-full">{images.map((img,i)=>(<div key={i} className="relative group"><img src={img.preview} alt="" className="h-14 w-14 rounded-lg object-cover border border-border"/><button type="button" onClick={()=>removeImage(i)} className="absolute -top-1.5 -right-1.5 bg-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-2.5 w-2.5 text-white"/></button></div>))}</div>)}
    <div className="border-t border-border px-3 py-3"><div className="max-w-3xl mx-auto relative" ref={pickerRef}>
      <div className="flex items-center gap-2 mb-2" ref={providerPickerRef}>
        <button type="button" onClick={()=>setShowProviderPicker(!showProviderPicker)} className={`text-[11px] px-2.5 py-1 rounded-full border flex items-center gap-1 shrink-0 ${currentProvider.color}`}><span className="font-medium">{currentProvider.name}</span><ChevronDown className="w-3 h-3"/></button>
        {providerKeys[provider]?(<span className="text-[10px] text-green-400">✓ Cle OK</span>):(<span className="text-[10px] text-amber-400">⚠ Pas de cle</span>)}
        {showProviderPicker&&(<div className="absolute top-full mt-1 left-0 bg-card border border-border rounded-lg shadow-xl z-50 py-1 min-w-[160px]">{PROVIDERS.map(p=>(<button key={p.id} type="button" onClick={()=>switchProvider(p.id)} className={`w-full text-left px-3 py-2 text-xs hover:bg-secondary/50 flex items-center justify-between ${p.id===provider?"bg-primary/5":""}`}><span className={`font-medium ${p.id===provider?"text-foreground":"text-muted-foreground"}`}>{p.name}</span>{providerKeys[p.id]?<span className="text-[10px] text-green-400">✓</span>:<span className="text-[10px] text-muted-foreground">—</span>}</button>))}</div>)}
      </div>
      <form onSubmit={handleSubmit} className="flex items-end gap-2 bg-secondary/40 rounded-2xl border border-border focus-within:border-primary/30 transition-colors px-3 py-2">
        <button type="button" onClick={()=>fileInputRef.current?.click()} className="p-1 text-muted-foreground hover:text-foreground shrink-0"><Paperclip className="h-4 w-4"/></button>
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e=>e.target.files&&handleFiles(e.target.files)}/>
        <textarea value={input} onChange={e=>setInput(e.target.value)} onPaste={handlePaste} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleSubmit(e as any)}}} placeholder="Message ElshalflowAI..." rows={1} className="flex-1 bg-transparent resize-none text-[14px] outline-none placeholder:text-muted-foreground min-h-[24px] max-h-[120px] py-0.5" disabled={loading}/>
        <div className="flex items-center gap-1 shrink-0">{loading?(<button type="button" onClick={()=>abortRef.current?.abort()} className="p-1 text-red-400" title="Arreter"><StopCircle className="h-4 w-4"/></button>):(<button type="submit" disabled={!input.trim()&&images.length===0} className="p-1.5 bg-primary rounded-full text-primary-foreground hover:bg-primary/80 disabled:opacity-30 transition-all"><Send className="h-3.5 w-3.5"/></button>)}</div>
      </form>
      <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1">
        <button type="button" onClick={()=>{setShowModelPicker(!showModelPicker);setSearch("");setFilterTab("all")}} className={`text-[12px] px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1.5 shrink-0 ${currentModel.f?"border-green-500/30 text-green-400 bg-green-500/10":"border-border text-muted-foreground"}`}><span className="font-medium">{currentModel.name}</span>{currentModel.f&&<span className="text-[10px] opacity-60">Gratuit</span>}<svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg></button>
        {providerModels.filter(m=>m.f).slice(0,6).map(m=>(<button key={m.id} type="button" onClick={()=>selectModel(m.id)} className={`text-[11px] px-2.5 py-1.5 rounded-full border whitespace-nowrap shrink-0 ${m.id===model?"border-primary/30 bg-primary/10 text-primary":"border-border text-muted-foreground hover:border-primary/20"}`}>{m.name}</button>))}
        {providerModels.filter(m=>!m.f).length>0&&(<button type="button" onClick={()=>{setShowModelPicker(true);setFilterTab("paid")}} className="text-[11px] px-2.5 py-1.5 rounded-full border border-border text-muted-foreground whitespace-nowrap shrink-0">+{paidModels.length} payants</button>)}
      </div>
      {showModelPicker&&(<div className="absolute bottom-full mb-2 left-0 right-0 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50" style={{maxHeight:"60vh"}}><div className="p-3 border-b border-border space-y-2"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher..." className="w-full bg-secondary/50 rounded-lg px-3 py-2 text-xs outline-none" autoFocus/><div className="flex gap-1">{(["all","free","paid"]as const).map(tab=>{const cnt=tab==="all"?providerModels.length:tab==="free"?freeModels.length:paidModels.length;return(<button key={tab} type="button" onClick={()=>setFilterTab(tab)} className={`text-[11px] px-2.5 py-1 rounded-md ${filterTab===tab?tab==="free"?"bg-green-500/20 text-green-400":tab==="paid"?"bg-amber-500/20 text-amber-400":"bg-primary/20 text-primary":"text-muted-foreground"}`}>{tab==="all"?"Tous":tab==="free"?"Gratuits":"Payants"} ({cnt})</button>)})}</div></div><div className="overflow-y-auto" style={{maxHeight:"50vh"}}>{filteredModels.slice(0,30).map(m=>(<button key={m.id} type="button" onClick={()=>selectModel(m.id)} className={`w-full text-left px-3 py-2.5 hover:bg-secondary/50 flex items-center justify-between gap-2 border-b border-border/20 ${m.id===model?"bg-primary/5 border-l-2 border-l-primary":""}`}><div className="min-w-0"><div className="text-xs font-medium flex items-center gap-1.5">{m.name}{m.f?<span className="text-[10px] bg-green-500/15 text-green-400 px-1 py-0 rounded">Gratuit</span>:<span className="text-[10px] bg-amber-500/15 text-amber-400 px-1 py-0 rounded">Payant</span>}</div><div className="text-[10px] text-muted-foreground truncate">{m.provider==="agentrouter"?"🟣 AR":"🔵 OR"} · {m.p} · {m.d}</div></div>{m.id===model&&<div className="w-2 h-2 rounded-full bg-primary shrink-0"/>}</button>))}</div></div>)}
      <p className="text-[10px] text-muted-foreground text-center mt-1.5">{hasKey?"Cle OK · ":"Ajoutez cle dans Cles API · "}{provider==="openrouter"?`${freeModels.length} gratuits`: ""} · {paidModels.length} modeles · {currentProvider.name}</p>
    </div></div>
  </div>);
}
