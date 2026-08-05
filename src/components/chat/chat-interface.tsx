"use client";
import { useState, useRef, useEffect, FormEvent } from "react";
import { Send, StopCircle, Paperclip, X, Brain } from "lucide-react";
import { Toaster, toast } from "sonner";
import { getAnonUserId } from "@/lib/auth-anon";

function fileToDataURL(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(reader.result as string); reader.onerror = () => reject(new Error("File read error")); reader.readAsDataURL(f);
  });
}

const PROVIDERS = [
  { id: "openrouter", name: "OpenRouter", desc: "30+ modeles gratuits & payants", icon: "🔷" },
  { id: "mistral",     name: "Mistral AI",  desc: "Large, Small, Codestral, Devstral — 20 modeles", icon: "🔴" },
] as const;
type ProviderId = typeof PROVIDERS[number]["id"];

interface ModelDef { id: string; name: string; free: boolean; vendor: string; desc: string; provider: ProviderId; }

const MODELS: ModelDef[] = [
  // ── OpenRouter (free) ──
  { id: "nvidia/nemotron-3-super-120b-a12b:free", name: "Nemotron 3 Super", free: true, vendor: "NVIDIA", desc: "120B gratuit", provider: "openrouter" },
  { id: "nvidia/nemotron-nano-9b-v2:free", name: "Nemotron Nano 9B", free: true, vendor: "NVIDIA", desc: "9B gratuit", provider: "openrouter" },
  { id: "poolside/laguna-s-2.1:free", name: "Laguna S 2.1", free: true, vendor: "Poolside", desc: "Code gratuit", provider: "openrouter" },
  { id: "cohere/north-mini-code:free", name: "North Mini Code", free: true, vendor: "Cohere", desc: "Code gratuit", provider: "openrouter" },
  { id: "inclusionai/ling-3.0-flash:free", name: "Ling 3.0 Flash", free: true, vendor: "InclusionAI", desc: "Rapide gratuit", provider: "openrouter" },
  { id: "google/gemma-4-31b-it:free", name: "Gemma 4 31B", free: true, vendor: "Google", desc: "Vision gratuit", provider: "openrouter" },
  { id: "google/gemma-4-26b-a4b-it:free", name: "Gemma 4 26B", free: true, vendor: "Google", desc: "Vision gratuit", provider: "openrouter" },
  { id: "nvidia/nemotron-nano-12b-v2-vl:free", name: "Nemotron Nano VL", free: true, vendor: "NVIDIA", desc: "Vision gratuit", provider: "openrouter" },
  // ── OpenRouter (paid) ──
  { id: "deepseek/deepseek-chat-v3-0324", name: "DeepSeek V3", free: false, vendor: "DeepSeek", desc: "$0.27/$1.1", provider: "openrouter" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", free: false, vendor: "OpenAI", desc: "$0.15/$0.6", provider: "openrouter" },
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", free: false, vendor: "Anthropic", desc: "$3/$15", provider: "openrouter" },
  { id: "google/gemini-2.5-pro-preview-06-05", name: "Gemini 2.5 Pro", free: false, vendor: "Google", desc: "$1.25/$10", provider: "openrouter" },
  // ── Mistral AI — Flagships ──
  { id: "mistral-large-latest",     name: "Mistral Large",      free: false, vendor: "Mistral", desc: "⚡ Flagship · 128K ctx · Multimodal", provider: "mistral" },
  { id: "mistral-medium-latest",    name: "Mistral Medium",     free: false, vendor: "Mistral", desc: "Équilibré puissance/coût", provider: "mistral" },
  { id: "mistral-small-latest",     name: "Mistral Small",      free: false, vendor: "Mistral", desc: "Rapide · Léger · Pas cher", provider: "mistral" },
  // ── Mistral AI — Code ──
  { id: "codestral-latest",         name: "Codestral",          free: false, vendor: "Mistral", desc: "🖥️ Code spécialisé · FIM", provider: "mistral" },
  { id: "mistral-code-latest",      name: "Mistral Code",       free: false, vendor: "Mistral", desc: "🖥️ Code généraliste", provider: "mistral" },
  { id: "devstral-latest",          name: "Devstral",           free: false, vendor: "Mistral", desc: "🖥️ Dev · Optimisé code", provider: "mistral" },
  { id: "devstral-medium-latest",   name: "Devstral Medium",    free: false, vendor: "Mistral", desc: "🖥️ Dev · Milieu de gamme", provider: "mistral" },
  { id: "mistral-code-agent-latest",name: "Code Agent",         free: false, vendor: "Mistral", desc: "🖥️ Agent autonome · Code", provider: "mistral" },
  // ── Mistral AI — Ministral (léger) ──
  { id: "ministral-3b-latest",      name: "Ministral 3B",       free: false, vendor: "Mistral", desc: "🪶 Ultra-léger · Edge", provider: "mistral" },
  { id: "ministral-8b-latest",      name: "Ministral 8B",       free: false, vendor: "Mistral", desc: "🪶 Léger · Embarqué", provider: "mistral" },
  { id: "ministral-14b-latest",     name: "Ministral 14B",      free: false, vendor: "Mistral", desc: "🪶 Léger+ · Qualité", provider: "mistral" },
  // ── Mistral AI — Spécialisés ──
  { id: "magistral-small-latest",   name: "Magistral Small",    free: false, vendor: "Mistral", desc: "Optimisé · Rapide", provider: "mistral" },
  { id: "labs-leanstral-1-5",       name: "Leanstral 1.5",      free: false, vendor: "Mistral", desc: "🔬 Labs · Expérimental", provider: "mistral" },
  { id: "mistral-vibe-cli-latest",  name: "Vibe CLI",           free: false, vendor: "Mistral", desc: "🎨 Vibe coding · Terminal", provider: "mistral" },
];

export function ChatInterface({ convId: initialConvId }: { convId?: string }) {
  const [convId, setConvId] = useState(initialConvId || "");
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState("nvidia/nemotron-3-super-120b-a12b:free");
  const [provider, setProvider] = useState<ProviderId>("openrouter");
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showProviderPicker, setShowProviderPicker] = useState(false);
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"all"|"free"|"paid">("all");
  const [hasKey, setHasKey] = useState(false);
  const [hasProviderKeys, setHasProviderKeys] = useState<Record<ProviderId,boolean>>({ openrouter: false, mistral: false });
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController|null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const anonId = typeof window !== "undefined" ? getAnonUserId() : "";

  useEffect(() => { if (!convId || !anonId) { setMessages([]); return; } fetch(`/api/messages?conversationId=${convId}`, { headers: { "x-anon-user-id": anonId } }).then(r => r.json()).then(d => { if (d.messages) setMessages(d.messages.map((m: any) => ({ id: m.id, role: m.role, content: m.content, model: m.model }))); }).catch(() => {}); }, [convId, anonId]);
  useEffect(() => { if (!anonId) return; fetch("/api/keys", { headers: { "x-anon-user-id": anonId } }).then(r => r.json()).then(d => { const keys = d.keys || []; setHasKey(keys.length > 0); const pp: Record<string,boolean> = { openrouter: false, mistral: false }; for (const k of keys) { if (k.provider === "openrouter" || k.provider === "mistral") pp[k.provider] = true; } setHasProviderKeys(pp as Record<ProviderId,boolean>); }).catch(() => { setHasKey(false); setHasProviderKeys({ openrouter: false, mistral: false }); }); }, [anonId]);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);
  useEffect(() => { const h = (e: MouseEvent) => { if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) { setShowModelPicker(false); setShowProviderPicker(false); } }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);

  function selectModel(m: ModelDef) { setModel(m.id); setProvider(m.provider); setShowModelPicker(false); setSearch(""); }
  function removeImage(i: number) { setImages(prev => prev.filter((_, idx) => idx !== i)); }
  function handleFiles(files: FileList) { const n: {file:File;preview:string}[] = []; for (let i=0;i<files.length;i++){ const f=files[i]; if(!f.type.startsWith("image/")){toast.error("Images uniquement");continue;} if(f.size>10485760){toast.error(">10 MB");continue;} if(images.length+n.length>=5){toast.error("Max 5");break;} n.push({file:f,preview:URL.createObjectURL(f)}); } setImages(prev=>[...prev,...n]); }
  function handlePaste(e: React.ClipboardEvent) { const fs:File[]=[]; for(let i=0;i<e.clipboardData.items.length;i++){ if(e.clipboardData.items[i].type.startsWith("image/")){ const f=e.clipboardData.items[i].getAsFile(); if(f) fs.push(f); } } if(fs.length){ const dt=new DataTransfer(); fs.forEach(f=>dt.items.add(f)); handleFiles(dt.files); } }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if((!input.trim() && images.length===0) || loading) return;
    if(!hasKey){ toast.error("Ajoutez une cle API dans Cles API"); return; }
    let cid=convId;
    if(!cid){ try{ const res=await fetch("/api/conversations",{method:"POST",headers:{"Content-Type":"application/json","x-anon-user-id":anonId},body:JSON.stringify({title:input.trim().slice(0,60)||"Nouveau chat",model,provider})}); const data=await res.json(); if(data.conversation){ cid=data.conversation.id; setConvId(cid); window.dispatchEvent(new CustomEvent("elshalflow_refresh_convs")); window.history.pushState({},"",`/chat?c=${cid}`); } } catch{} }
    let userContent: any;
    if(images.length>0){ const parts:any[]=[]; if(input.trim()) parts.push({type:"text",text:input.trim()}); const dataUrls=await Promise.all(images.map(img=>fileToDataURL(img.file))); for(const dataUrl of dataUrls){ parts.push({type:"image_url",image_url:{url:dataUrl}}); } userContent=parts; } else { userContent=input.trim(); }
    setMessages(prev=>[...prev,{id:"u"+Date.now(),role:"user",content:input.trim()||"[Image]",images:images.map(i=>i.preview),model,provider}]);
    setInput(""); setImages([]); setLoading(true);
    const apiMessages=messages.map((m:any)=>{ if(m.images?.length){ const parts:any[]=[]; if(typeof m.content==="string" && m.content!=="[Image]") parts.push({type:"text",text:m.content}); for(const url of m.images) parts.push({type:"image_url",image_url:{url}}); return {role:m.role,content:parts}; } return {role:m.role,content:m.content}; });
    apiMessages.push({role:"user",content:userContent});
    const assistantId="a"+Date.now();
    setMessages(prev=>[...prev,{id:assistantId,role:"assistant",content:"",model,provider}]);
    abortRef.current=new AbortController();
    try{
      const response=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json","x-anon-user-id":anonId},body:JSON.stringify({messages:apiMessages,model,provider,conversationId:cid}),signal:abortRef.current.signal});
      if(!response.ok){ const err=await response.json().catch(()=>({})); throw new Error(err.response||err.error||`HTTP ${response.status}`); }
      const reader=response.body?.getReader();
      if(!reader) throw new Error("Stream non disponible");
      const decoder=new TextDecoder(); let buffer=""; let streamedContent=""; let streamedModel=model; let lastUIUpdate=0;
      function flushUI(){ const now=Date.now(); if(now-lastUIUpdate>=30){ setMessages(prev=>prev.map(m=>m.id===assistantId?{...m,content:streamedContent,model:streamedModel}:m)); lastUIUpdate=now; } }
      while(true){ const {done,value}=await reader.read(); if(done) break; buffer+=decoder.decode(value,{stream:true}); let boundary:number; while((boundary=buffer.indexOf("\n\n"))!==-1){ const frame=buffer.slice(0,boundary); buffer=buffer.slice(boundary+2); const dataIdx=frame.lastIndexOf("data: "); if(dataIdx===-1) continue; try{ const parsed=JSON.parse(frame.slice(dataIdx+6)); if(parsed.delta){ streamedContent+=parsed.delta; if(parsed.model) streamedModel=parsed.model; flushUI(); } if(parsed.done && parsed.full) streamedContent=parsed.full; if(parsed.error) toast.error(parsed.error); } catch{} } flushUI(); }
      setMessages(prev=>prev.map(m=>m.id===assistantId?{...m,content:streamedContent||"(vide)",model:streamedModel}:m));
      window.dispatchEvent(new CustomEvent("elshalflow_refresh_convs"));
    } catch(err:any){ if(err.name!=="AbortError"){ toast.error(err.message); setMessages(prev=>prev.map(m=>m.id===assistantId?{...m,content:`Erreur: ${err.message}`}:m)); } } finally { setLoading(false); abortRef.current=null; }
  }

  function renderMarkdown(text:string){ let html=text.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); html=html.replace(/```(\w*)\n?([\s\S]*?)```/g,'<pre class="bg-secondary/50 rounded-lg p-2.5 my-1.5 overflow-x-auto text-[11px]"><code>$2</code></pre>'); html=html.replace(/`([^`]+)`/g,'<code class="bg-secondary/50 px-1 py-0.5 rounded text-[11px]">$1</code>'); html=html.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>"); html=html.replace(/\n/g,"<br/>"); return <div dangerouslySetInnerHTML={{__html:html}}/>; }

  const currentModel=MODELS.find(m=>m.id===model)||MODELS[0];
  const currentProv=PROVIDERS.find(p=>p.id===provider)||PROVIDERS[0];
  const freeModels=MODELS.filter(m=>m.free);
  const paidModels=MODELS.filter(m=>!m.free);
  const filteredModels=MODELS.filter(m=>{ if(filterTab==="free"&&!m.free) return false; if(filterTab==="paid"&&m.free) return false; if(search&&!m.name.toLowerCase().includes(search.toLowerCase())&&!m.vendor.toLowerCase().includes(search.toLowerCase())&&!m.provider.toLowerCase().includes(search.toLowerCase())) return false; return true; });

  return (
    <div className="flex flex-col h-full bg-background">
      <Toaster richColors theme="dark" position="top-center" />
      <div ref={scrollRef} className="flex-1 overflow-y-auto pb-4">
        {messages.length===0?(
          <div className="flex flex-col items-center justify-center h-full px-6 text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6"><Brain className="w-8 h-8 text-primary/40"/></div>
            <h1 className="text-2xl font-bold mb-2">ElshalflowAI</h1>
            <p className="text-muted-foreground text-sm max-w-xs mb-6">Assistant IA multi-provider. OpenRouter + Mistral AI (20 modeles).</p>
            {!hasKey?(<div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 max-w-xs"><p className="text-amber-400 text-sm font-medium mb-1">Ajoutez votre cle API</p><p className="text-muted-foreground text-xs">Menu lateral → Cles API → collez votre cle</p></div>):(<p className="text-green-400 text-xs">Cle detectee — Pret !</p>)}
            <div className="flex gap-2 mt-3">{PROVIDERS.map(p=>(<span key={p.id} className={`text-[10px] px-2 py-0.5 rounded-full ${hasProviderKeys[p.id]?"bg-green-500/15 text-green-400":"bg-muted/30 text-muted-foreground"}`}>{p.icon} {p.name} {hasProviderKeys[p.id]?"✓":""}</span>))}</div>
          </div>
        ):(
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {messages.map((msg)=>{ const msgModel=MODELS.find(m=>m.id===msg.model); const msgProv=PROVIDERS.find(p=>p.id===msg.provider); return(<div key={msg.id} className={`flex ${msg.role==="user"?"justify-end":"justify-start"}`}><div className={`max-w-[85%] break-words ${msg.role==="user"?"flex flex-col items-end":""}`}>{msg.role==="assistant"&&(<span className="text-[10px] text-muted-foreground mb-1 ml-1 font-medium">{msgModel?.name||msg.model}{msgProv&&<span> · {msgProv.icon}</span>}</span>)}{msg.images?.length>0&&<div className="flex gap-1 mb-1 flex-wrap justify-end">{msg.images.map((url:string,i:number)=>(<img key={i} src={url} alt="" className="max-w-[120px] max-h-[120px] rounded-lg object-cover"/>))}</div>}<div className={`px-4 py-3 text-[14px] leading-relaxed rounded-2xl ${msg.role==="user"?"bg-primary/15 text-foreground rounded-br-md":"text-foreground"}`}>{msg.content?renderMarkdown(msg.content):(<span className="flex gap-1.5 py-1"><span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"/><span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{animationDelay:"0.15s"}}/><span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{animationDelay:"0.3s"}}/></span>)}</div></div></div>);})}
          </div>
        )}
      </div>
      {images.length>0&&(<div className="px-4 pb-1 flex gap-1.5 flex-wrap max-w-3xl mx-auto w-full">{images.map((img,i)=>(<div key={i} className="relative group"><img src={img.preview} alt="" className="h-14 w-14 rounded-lg object-cover border border-border"/><button type="button" onClick={()=>removeImage(i)} className="absolute -top-1.5 -right-1.5 bg-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-2.5 w-2.5 text-white"/></button></div>))}</div>)}
      <div className="border-t border-border px-3 py-3">
        <div className="max-w-3xl mx-auto relative" ref={pickerRef}>
          <form onSubmit={handleSubmit} className="flex items-end gap-2 bg-secondary/40 rounded-2xl border border-border focus-within:border-primary/30 transition-colors px-3 py-2">
            <button type="button" onClick={()=>fileInputRef.current?.click()} className="p-1 text-muted-foreground hover:text-foreground shrink-0"><Paperclip className="h-4 w-4"/></button>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e=>e.target.files&&handleFiles(e.target.files)}/>
            <textarea value={input} onChange={e=>setInput(e.target.value)} onPaste={handlePaste} onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); handleSubmit(e as any); } }} placeholder={`Message ${currentProv.name}...`} rows={1} className="flex-1 bg-transparent resize-none text-[14px] outline-none placeholder:text-muted-foreground min-h-[24px] max-h-[120px] py-0.5" disabled={loading}/>
            <div className="flex items-center gap-1 shrink-0">{loading?(<button type="button" onClick={()=>abortRef.current?.abort()} className="p-1 text-red-400" title="Arreter"><StopCircle className="h-4 w-4"/></button>):(<button type="submit" disabled={!input.trim()&&images.length===0} className="p-1.5 bg-primary rounded-full text-primary-foreground hover:bg-primary/80 disabled:opacity-30 transition-all"><Send className="h-3.5 w-3.5"/></button>)}</div>
          </form>
          <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1">
            <button type="button" onClick={()=>setShowProviderPicker(!showProviderPicker)} className={`text-[11px] px-2.5 py-1.5 rounded-full border transition-colors flex items-center gap-1 shrink-0 ${hasProviderKeys[provider]?"border-green-500/30 text-green-400 bg-green-500/10":"border-border text-muted-foreground"}`} title={`Provider: ${currentProv.name}`}><span>{currentProv.icon}</span><svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg></button>
            {showProviderPicker&&(<div className="absolute bottom-full mb-2 left-0 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50 w-64"><div className="p-2 space-y-1">{PROVIDERS.map(p=>(<button key={p.id} type="button" onClick={()=>{ setProvider(p.id); const fm=MODELS.find(m=>m.provider===p.id); if(fm) setModel(fm.id); setShowProviderPicker(false); }} className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-xs ${provider===p.id?"bg-primary/10 border border-primary/20":"hover:bg-secondary/50"}`}><span className="text-base">{p.icon}</span><div><div className="font-medium">{p.name}</div><div className="text-[10px] text-muted-foreground">{p.desc}</div></div>{hasProviderKeys[p.id]?<span className="ml-auto w-1.5 h-1.5 rounded-full bg-green-400"/>:<span className="ml-auto w-1.5 h-1.5 rounded-full bg-muted-foreground/30"/>}</button>))}</div></div>)}
            <button type="button" onClick={()=>{ setShowModelPicker(!showModelPicker); setSearch(""); setFilterTab("all"); }} className={`text-[12px] px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1.5 shrink-0 ${currentModel.free?"border-green-500/30 text-green-400 bg-green-500/10":"border-border text-muted-foreground"}`}><span className="font-medium">{currentModel.name}</span>{currentModel.free&&<span className="text-[10px] opacity-60">Gratuit</span>}<svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg></button>
            {freeModels.filter(m=>m.provider===provider).slice(0,4).map(m=>(<button key={m.id} type="button" onClick={()=>selectModel(m)} className={`text-[11px] px-2.5 py-1.5 rounded-full border whitespace-nowrap shrink-0 ${m.id===model?"border-primary/30 bg-primary/10 text-primary":"border-border text-muted-foreground hover:border-primary/20"}`}>{m.name}</button>))}
            {paidModels.filter(m=>m.provider===provider).length>0&&(<button type="button" onClick={()=>{ setShowModelPicker(true); setFilterTab("paid"); }} className="text-[11px] px-2.5 py-1.5 rounded-full border border-border text-muted-foreground whitespace-nowrap shrink-0">+{paidModels.filter(m=>m.provider===provider).length} payants</button>)}
          </div>
          {showModelPicker&&(<div className="absolute bottom-full mb-2 left-0 right-0 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50" style={{maxHeight:"60vh"}}><div className="p-3 border-b border-border space-y-2"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un modele..." className="w-full bg-secondary/50 rounded-lg px-3 py-2 text-xs outline-none" autoFocus/><div className="flex gap-1">{(["all","free","paid"]as const).map(tab=>{ const count=tab==="all"?MODELS.length:tab==="free"?freeModels.length:paidModels.length; const active=filterTab===tab; return(<button key={tab} type="button" onClick={()=>setFilterTab(tab)} className={`text-[11px] px-2.5 py-1 rounded-md ${active?tab==="free"?"bg-green-500/20 text-green-400":tab==="paid"?"bg-amber-500/20 text-amber-400":"bg-primary/20 text-primary":"text-muted-foreground"}`}>{tab==="all"?"Tous":tab==="free"?"Gratuits":"Payants"} ({count})</button>); })}</div></div><div className="overflow-y-auto" style={{maxHeight:"50vh"}}>{filteredModels.slice(0,30).map(m=>{ const prov=PROVIDERS.find(p=>p.id===m.provider); return(<button key={m.id} type="button" onClick={()=>selectModel(m)} className={`w-full text-left px-3 py-2.5 hover:bg-secondary/50 flex items-center justify-between gap-2 border-b border-border/20 ${m.id===model?"bg-primary/5 border-l-2 border-l-primary":""}`}><div className="min-w-0"><div className="text-xs font-medium flex items-center gap-1.5">{m.name}<span className="text-[10px] text-muted-foreground">{prov?.icon}</span>{m.free?<span className="text-[10px] bg-green-500/15 text-green-400 px-1 py-0 rounded">Gratuit</span>:<span className="text-[10px] bg-amber-500/15 text-amber-400 px-1 py-0 rounded">Payant</span>}</div><div className="text-[10px] text-muted-foreground truncate">{m.vendor} · {m.desc}</div></div>{m.id===model&&<div className="w-2 h-2 rounded-full bg-primary shrink-0"/>}</button>); })}</div></div>)}
          <p className="text-[10px] text-muted-foreground text-center mt-1.5">{hasKey?"Cle OK · ":"Ajoutez cle dans Cles API · "}{freeModels.length} gratuits · {paidModels.length} payants · {PROVIDERS.length} providers</p>
        </div>
      </div>
    </div>
  );
}
