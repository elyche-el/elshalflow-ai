"use client";
import { useState, useRef, useEffect, FormEvent } from "react";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Sparkles, StopCircle, Paperclip, X, Image, Brain } from "lucide-react";
import { Toaster, toast } from "sonner";

function toB64(f: File): Promise<string> { return new Promise((rs, rj) => { const r = new FileReader(); r.onload = () => rs(r.result as string); r.onerror = rj; r.readAsDataURL(f); }); }
function getKey(): string { try { const v = localStorage.getItem("elshalflow_byok"); return v ? (JSON.parse(v).find((k: any) => k.is_default)?.api_key || JSON.parse(v)[0]?.api_key || "") : ""; } catch { return ""; } }

const FALLBACK_MODELS = [
  { id: "google/gemini-2.0-flash-001", name: "Gemini 2.0 Flash", is_free: true, provider: "Google", pricing: "0" },
  { id: "deepseek/deepseek-chat-v3-0324:free", name: "DeepSeek V3 (Free)", is_free: true, provider: "DeepSeek", pricing: "0" },
  { id: "meta-llama/llama-4-maverick:free", name: "Llama 4 Maverick (Free)", is_free: true, provider: "Meta", pricing: "0" },
  { id: "mistralai/mistral-small-3.1-24b-instruct:free", name: "Mistral Small 3.1 (Free)", is_free: true, provider: "Mistral", pricing: "0" },
  { id: "google/gemini-2.5-flash-preview-06-09", name: "Gemini 2.5 Flash", is_free: true, provider: "Google", pricing: "0" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", is_free: false, provider: "OpenAI", pricing: "0.15/0.6" },
  { id: "openai/gpt-4o", name: "GPT-4o", is_free: false, provider: "OpenAI", pricing: "2.5/10" },
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", is_free: false, provider: "Anthropic", pricing: "3/15" },
  { id: "google/gemini-2.5-pro-preview-06-05", name: "Gemini 2.5 Pro", is_free: false, provider: "Google", pricing: "1.25/10" },
  { id: "deepseek/deepseek-chat-v3-0324", name: "DeepSeek V3", is_free: false, provider: "DeepSeek", pricing: "0.27/1.1" },
  { id: "qwen/qwen3-235b-a22b", name: "Qwen 3 235B", is_free: false, provider: "Alibaba", pricing: "0.35/1.4" },
  { id: "mistralai/mistral-large-2411", name: "Mistral Large", is_free: false, provider: "Mistral", pricing: "2/6" },
];

type ModelInfo = { id: string; name: string; is_free: boolean; provider: string; pricing: string; multimodal?: boolean };
type Message = { id: string; role: string; content: string; images?: string[]; model?: string };

export function ChatInterface() {
  const cid = (useParams()?.conversationId as string) || "default";
  const [msgs, setMsgs] = useState<Message[]>(() => { try { return JSON.parse(localStorage.getItem("chat_" + cid) || "[]"); } catch { return []; } });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState("google/gemini-2.0-flash-001");
  const [models, setModels] = useState<ModelInfo[]>(FALLBACK_MODELS);
  const [showM, setShowM] = useState(false);
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [ms, setMs] = useState("");
  const [mt, setMt] = useState<"free" | "paid" | "all">("all");
  const sr = useRef<HTMLDivElement>(null);
  const fr = useRef<HTMLInputElement>(null);
  const ar = useRef<AbortController | null>(null);
  const dr = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const k = getKey();
    fetch("/api/models?key=" + encodeURIComponent(k || ""))
      .then(r => r.json())
      .then(d => { if (Array.isArray(d) && d.length) setModels(d.map((m: any) => ({ id: m.id, name: m.name, is_free: m.is_free, provider: m.top_provider?.name || "", pricing: m.pricing?.prompt || "0", multimodal: (m.architecture?.modality || "").includes("image") }))); })
      .catch(() => {});
  }, []);

  useEffect(() => { if (sr.current) sr.current.scrollTop = sr.current.scrollHeight; }, [msgs]);
  useEffect(() => { try { localStorage.setItem("chat_" + cid, JSON.stringify(msgs)); } catch {} }, [msgs, cid]);
  useEffect(() => { const h = (e: MouseEvent) => { if (dr.current && !dr.current.contains(e.target as Node)) setShowM(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);

  function rmImg(i: number) { setImages(p => p.filter((_, x) => x !== i)); }
  function hFiles(files: FileList) {
    const n: { file: File; preview: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      if (!files[i].type.startsWith("image/")) { toast.error(files[i].name + " pas une image"); continue; }
      if (files[i].size > 10 * 1024 * 1024) { toast.error(files[i].name + " > 10MB"); continue; }
      if (images.length + n.length >= 5) { toast.error("Max 5 images"); break; }
      n.push({ file: files[i], preview: URL.createObjectURL(files[i]) });
    }
    setImages(p => [...p, ...n]);
  }
  function hPaste(e: React.ClipboardEvent) {
    const fs: File[] = [];
    for (let i = 0; i < e.clipboardData.items.length; i++) { if (e.clipboardData.items[i].type.startsWith("image/")) { const f = e.clipboardData.items[i].getAsFile(); if (f) fs.push(f); } }
    if (fs.length) { const dt = new DataTransfer(); fs.forEach(f => dt.items.add(f)); hFiles(dt.files); }
  }
  function sel(id: string) { setModel(id); setShowM(false); setMs(""); }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if ((!input.trim() && images.length === 0) || loading) return;
    const b64s = await Promise.all(images.map(toB64));
    const prvs = images.map(i => i.preview);
    let c: any = input || "[Image]";
    if (b64s.length) { const parts: any[] = []; if (input.trim()) parts.push({ type: "text", text: input }); b64s.forEach(b => parts.push({ type: "image_url", image_url: { url: b } })); c = parts; }
    const um: Message = { id: "u" + Date.now(), role: "user", content: input.trim() || "[Image]", images: prvs, model };
    setMsgs(p => [...p, um]); setInput(""); setImages([]); setLoading(true);
    const ams = msgs.map(m => ({ role: m.role, content: m.images?.length ? m.content || "[Image]" : m.content }));
    ams.push({ role: "user", content: c } as any);
    const key = getKey();
    ar.current = new AbortController();
    const aid = "a" + Date.now();
    setMsgs(p => [...p, { id: aid, role: "assistant", content: "", model }]);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: ams, model, apiKey: key }), signal: ar.current.signal });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.response || e.error || "Erreur " + res.status);
      }
      const rd = res.body?.getReader();
      if (!rd) throw new Error("Pas de stream");
      const dec = new TextDecoder(); let full = "";
      while (true) {
        const { done, value } = await rd.read(); if (done) break;
        const chunk = dec.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) { const d = line.slice(6); if (d === "[DONE]") continue; try { full += JSON.parse(d).choices?.[0]?.delta?.content || ""; } catch {} }
        }
        setMsgs(p => p.map(m => m.id === aid ? { ...m, content: full } : m));
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        toast.error(err.message);
        setMsgs(p => p.map(m => m.id === aid ? { ...m, content: "Erreur: " + err.message } : m));
      }
    } finally { setLoading(false); ar.current = null; }
  }

  function clear() { if (confirm("Effacer ?")) { setMsgs([]); localStorage.removeItem("chat_" + cid); } }

  const cm = models.find(m => m.id === model);
  const frees = models.filter(m => m.is_free).slice(0, 8);
  const paids = models.filter(m => !m.is_free).slice(0, 8);
  const fm = models.filter(m => (mt === "free" ? !m.is_free : mt === "paid" ? m.is_free : true) && (!ms || m.name.toLowerCase().includes(ms.toLowerCase())));

  return (<div className="flex flex-col h-full bg-background"><Toaster richColors theme="dark" position="top-center" />
    <div className="flex items-center justify-between h-11 px-3 border-b border-border shrink-0"><div className="flex items-center gap-2"><span className="text-xs font-medium text-muted-foreground truncate max-w-[180px]">{cm?.name||"Modele"}</span>{cm?.is_free?<span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">Gratuit</span>:cm?<span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">${cm.pricing}/1M</span>:null}</div><button onClick={clear} className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-0.5 rounded">Effacer</button></div>
    <div ref={sr} className="flex-1 overflow-y-auto">
      {msgs.length===0?(<div className="flex flex-col items-center justify-center h-full px-6 text-center"><div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5"><Brain className="w-7 h-7 text-primary/40"/></div><h1 className="text-xl font-bold mb-1.5">ElshalflowAI</h1><p className="text-muted-foreground text-xs max-w-xs mb-6">Assistant IA avec tous les modeles OpenRouter.</p><div className="w-full max-w-xs space-y-2"><p className="text-[10px] text-muted-foreground uppercase tracking-wide text-left">Gratuits</p><div className="grid grid-cols-2 gap-1.5">{frees.map(m=>(<button key={m.id} onClick={()=>sel(m.id)} className="text-left p-2 rounded-lg border border-border hover:border-primary/30 bg-secondary/30"><div className="text-[11px] font-medium truncate">{m.name}</div><div className="text-[9px] text-green-400 mt-0.5">{m.provider} Gratuit</div></button>))}</div>{paids.length>0&&<><p className="text-[10px] text-muted-foreground uppercase tracking-wide text-left mt-2">Payants</p><div className="grid grid-cols-2 gap-1.5">{paids.map(m=>(<button key={m.id} onClick={()=>sel(m.id)} className="text-left p-2 rounded-lg border border-border hover:border-primary/30 bg-secondary/30"><div className="text-[11px] font-medium truncate">{m.name}</div><div className="text-[9px] text-amber-400 mt-0.5">{m.provider} ${m.pricing}/1M</div></button>))}</div></>}</div></div>):(<div className="max-w-3xl mx-auto px-3 py-5 space-y-5">{msgs.map(msg=>(<div key={msg.id} className={`flex ${msg.role==="user"?"justify-end":"justify-start"}`}><div className={`max-w-[85%] ${msg.role==="user"?"flex flex-col items-end":""}`}>{msg.role==="assistant"&&msg.model&&<span className="text-[9px] text-muted-foreground mb-1 ml-1">{models.find(m=>m.id===msg.model)?.name}</span>}{msg.images&&msg.images.length>0&&<div className="flex gap-1 mb-1 flex-wrap justify-end">{msg.images.map((img,i)=><img key={i} src={img} alt="" className="max-w-[120px] max-h-[120px] rounded-lg object-cover"/>)}</div>}<div className={`px-3 py-2.5 text-[13px] leading-relaxed rounded-2xl ${msg.role==="user"?"bg-primary/15 text-foreground rounded-br-md":"bg-transparent text-foreground"}`}>{msg.content?<ReactMarkdown remarkPlugins={[remarkGfm]} components={{pre:({children})=><pre className="bg-secondary/50 rounded-lg p-2.5 my-1.5 overflow-x-auto text-[11px]">{children}</pre>,code:({children})=><code className="bg-secondary/50 px-1 py-0.5 rounded text-[11px]">{children}</code>}}>{msg.content}</ReactMarkdown>:<span className="flex gap-1"><span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"/><span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{animationDelay:"0.15s"}}/><span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{animationDelay:"0.3s"}}/></span>}</div></div></div>))}{loading&&msgs[msgs.length-1]?.role==="user"&&<div className="flex justify-start"><div className="px-3 py-2.5"><span className="flex gap-1"><span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce"/><span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{animationDelay:"0.15s"}}/><span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{animationDelay:"0.3s"}}/></span></div></div>}</div>)}</div>
    {images.length>0&&<div className="px-3 pb-1 flex gap-1.5 flex-wrap max-w-3xl mx-auto w-full">{images.map((img,i)=>(<div key={i} className="relative group"><img src={img.preview} alt="" className="h-12 w-12 rounded-lg object-cover border border-border"/><button onClick={()=>rmImg(i)} className="absolute -top-1.5 -right-1.5 bg-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100"><X className="h-2.5 w-2.5 text-white"/></button></div>))}</div>}
    <div className="border-t border-border px-2 py-2.5"><div className="max-w-3xl mx-auto relative" ref={dr}><form onSubmit={handleSubmit} className="flex items-end gap-1.5 bg-secondary/40 rounded-2xl border border-border focus-within:border-primary/30 transition-colors px-2.5 py-1.5"><button type="button" onClick={()=>fr.current?.click()} className="p-1 text-muted-foreground hover:text-foreground shrink-0"><Paperclip className="h-3.5 w-3.5"/></button><input ref={fr} type="file" accept="image/*" multiple className="hidden" onChange={e=>e.target.files&&hFiles(e.target.files)}/><textarea value={input} onChange={e=>setInput(e.target.value)} onPaste={hPaste} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleSubmit(e)}}} placeholder="Message ElshalflowAI..." rows={1} className="flex-1 bg-transparent resize-none text-[13px] outline-none placeholder:text-muted-foreground min-h-[22px] max-h-[120px] py-0.5" disabled={loading}/><div className="flex items-center gap-1 shrink-0"><button type="button" onClick={()=>{setShowM(!showM);setMs("");setMt("all")}} className={`text-[10px] px-1.5 py-1 rounded-lg border transition-colors flex items-center gap-0.5 whitespace-nowrap ${cm?.is_free?"border-green-500/30 text-green-400 bg-green-500/10":"border-border text-muted-foreground hover:border-primary/30"}`}><span className="truncate max-w-[60px]">{cm?.name?.split(" ")[0]||"Modele"}</span><svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg></button>{loading?<button type="button" onClick={()=>ar.current?.abort()} className="p-1 text-red-400"><StopCircle className="h-3.5 w-3.5"/></button>:<button type="submit" disabled={!input.trim()&&images.length===0} className="p-1 text-primary hover:text-primary/80 disabled:text-muted-foreground disabled:opacity-40"><Send className="h-3.5 w-3.5"/></button>}</div></form>
    {showM&&<div className="absolute bottom-full mb-2 left-0 right-0 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50"><div className="p-1.5 border-b border-border"><input value={ms} onChange={e=>setMs(e.target.value)} placeholder="Rechercher..." className="w-full bg-secondary/50 rounded-lg px-2.5 py-1.5 text-[11px] outline-none" autoFocus/><div className="flex gap-1 mt-1.5">{(["all","free","paid"]as const).map(t=><button key={t} onClick={()=>setMt(t)} className={`text-[10px] px-2 py-0.5 rounded-md ${mt===t?"bg-primary/20 text-primary":"text-muted-foreground"}`}>{t==="all"?"Tous":t==="free"?"Gratuits":"Payants"}</button>)}</div></div><div className="max-h-56 overflow-y-auto p-1">{fm.slice(0,40).map(m=>(<button key={m.id} onClick={()=>sel(m.id)} className={`w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-secondary/50 transition-colors flex items-center justify-between gap-1.5 ${m.id===model?"bg-primary/10":""}`}><div className="min-w-0"><div className="text-[11px] font-medium truncate">{m.name}</div><div className="text-[9px] text-muted-foreground truncate">{m.provider}</div></div><div className="shrink-0 text-right">{m.is_free?<span className="text-[9px] text-green-400 font-medium">Gratuit</span>:<span className="text-[9px] text-muted-foreground">${m.pricing}/1M</span>}{m.multimodal&&<Image className="h-2.5 w-2.5 text-muted-foreground ml-0.5 inline"/>}</div></button>))}</div></div>}</div><p className="text-[9px] text-muted-foreground text-center mt-1">{!getKey()?"Ajoutez votre cle OpenRouter dans Cles API ":""}Entree = envoyer</p></div></div>);
}
