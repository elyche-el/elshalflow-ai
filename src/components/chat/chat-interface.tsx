"use client";
import { useState, useRef, useEffect, FormEvent } from "react";
import { Send, StopCircle, Paperclip, X, Brain } from "lucide-react";
import { Toaster, toast } from "sonner";
import { getAnonUserId } from "@/lib/auth-anon";

function toB64(f: File) {
  return new Promise<string>((rs, rj) => {
    const r = new FileReader();
    r.onload = () => rs(r.result as string);
    r.onerror = rj;
    r.readAsDataURL(f);
  });
}

const MODELS = [
  { id: "nvidia/nemotron-3-super-120b-a12b:free", name: "Nemotron 3 Super", f: true, p: "NVIDIA", d: "120B gratuit" },
  { id: "nvidia/nemotron-3-ultra-550b-a55b:free", name: "Nemotron 3 Ultra", f: true, p: "NVIDIA", d: "550B gratuit" },
  { id: "google/gemma-4-31b-it:free", name: "Gemma 4 31B", f: true, p: "Google", d: "Vision gratuit" },
  { id: "google/gemma-4-26b-a4b-it:free", name: "Gemma 4 26B", f: true, p: "Google", d: "Vision gratuit" },
  { id: "poolside/laguna-s-2.1:free", name: "Laguna S 2.1", f: true, p: "Poolside", d: "Coding gratuit" },
  { id: "cohere/north-mini-code:free", name: "North Mini Code", f: true, p: "Cohere", d: "Code gratuit" },
  { id: "nvidia/nemotron-3-nano-30b-a3b:free", name: "Nemotron 3 Nano", f: true, p: "NVIDIA", d: "30B gratuit" },
  { id: "openai/gpt-oss-20b:free", name: "GPT-OSS 20B", f: true, p: "OpenAI", d: "Open source gratuit" },
  { id: "inclusionai/ling-3.0-flash:free", name: "Ling 3.0 Flash", f: true, p: "InclusionAI", d: "Rapide gratuit" },
  { id: "nvidia/nemotron-nano-12b-v2-vl:free", name: "Nemotron Nano VL", f: true, p: "NVIDIA", d: "Vision gratuit" },
  { id: "nvidia/nemotron-nano-9b-v2:free", name: "Nemotron Nano 9B", f: true, p: "NVIDIA", d: "9B gratuit" },
  { id: "deepseek/deepseek-chat-v3-0324", name: "DeepSeek V3", f: false, p: "DeepSeek", d: "$0.27/$1.1" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", f: false, p: "OpenAI", d: "$0.15/$0.6" },
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", f: false, p: "Anthropic", d: "$3/$15" },
  { id: "meta-llama/llama-4-maverick", name: "Llama 4 Maverick", f: false, p: "Meta", d: "$0.2/$0.9" },
  { id: "google/gemini-2.5-pro-preview-06-05", name: "Gemini 2.5 Pro", f: false, p: "Google", d: "$1.25/$10" },
  { id: "mistralai/mistral-large-2411", name: "Mistral Large", f: false, p: "Mistral", d: "$2/$6" },
];

export function ChatInterface({ convId: initialConvId }: { convId?: string }) {
  const [convId, setConvId] = useState(initialConvId || "");
  const [msgs, setMsgs] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState("nvidia/nemotron-3-super-120b-a12b:free");
  const [showM, setShowM] = useState(false);
  const [images, setImages] = useState<any[]>([]);
  const [s, setS] = useState("");
  const [mt, setMt] = useState("all");
  const [hasKey, setHasKey] = useState(false);
  const sr = useRef<HTMLDivElement>(null);
  const fr = useRef<HTMLInputElement>(null);
  const ar = useRef<AbortController>(null);
  const dr = useRef<HTMLDivElement>(null);
  const anonId = typeof window !== "undefined" ? getAnonUserId() : "";

  useEffect(() => {
    if (!convId || !anonId) { setMsgs([]); return; }
    fetch(`/api/messages?conversationId=${convId}`, { headers: { "x-anon-user-id": anonId } })
      .then(r => r.json())
      .then(d => { if (d.messages) setMsgs(d.messages.map((m: any) => ({ id: m.id, role: m.role, content: m.content, model: m.model }))); })
      .catch(() => {});
  }, [convId, anonId]);

  useEffect(() => {
    if (!anonId) return;
    fetch("/api/keys", { headers: { "x-anon-user-id": anonId } })
      .then(r => r.json())
      .then(d => setHasKey(!!d.keys?.length))
      .catch(() => setHasKey(false));
  }, [anonId]);

  useEffect(() => {
    if (sr.current) sr.current.scrollTop = sr.current.scrollHeight;
  }, [msgs]);

  useEffect(() => {
    const h = (e: any) => { if (dr.current && !dr.current.contains(e.target)) setShowM(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  function sel(id: string) { setModel(id); setShowM(false); setS(""); }
  function rmImg(i: number) { setImages((p: any) => p.filter((_: any, x: number) => x !== i)); }

  function hFiles(files: FileList) {
    const n: any[] = [];
    for (let i = 0; i < files.length; i++) {
      if (!files[i].type.startsWith("image/")) { toast.error("Images uniquement"); continue; }
      if (files[i].size > 10485760) { toast.error(">10MB"); continue; }
      if (images.length + n.length >= 5) { toast.error("Max 5"); break; }
      n.push({ file: files[i], preview: URL.createObjectURL(files[i]) });
    }
    setImages((p: any) => [...p, ...n]);
  }

  function hPaste(e: any) {
    const fs: File[] = [];
    for (let i = 0; i < e.clipboardData.items.length; i++) {
      if (e.clipboardData.items[i].type.startsWith("image/")) {
        const f = e.clipboardData.items[i].getAsFile();
        if (f) fs.push(f);
      }
    }
    if (fs.length) {
      const dt = new DataTransfer();
      fs.forEach((f: File) => dt.items.add(f));
      hFiles(dt.files);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if ((!input.trim() && images.length === 0) || loading) return;
    if (!hasKey) { toast.error("Ajoutez une cle OpenRouter dans Cles API"); return; }

    let cid = convId;
    if (!cid) {
      try {
        const r = await fetch("/api/conversations", { method: "POST", headers: { "Content-Type": "application/json", "x-anon-user-id": anonId }, body: JSON.stringify({ title: "Nouveau chat", model }) });
        const d = await r.json();
        if (d.conversation) { cid = d.conversation.id; setConvId(cid); window.dispatchEvent(new CustomEvent("elshalflow_refresh_convs")); window.history.pushState({}, "", `/chat?c=${cid}`); }
      } catch {}
    }

    let userContent: any = input.trim() || "[Image]";
    if (images.length > 0) {
      const parts: any[] = [];
      if (input.trim()) parts.push({ type: "text", text: input.trim() });
      const b64s = await Promise.all(images.map((img: any) => toB64(img.file)));
      b64s.forEach((b: string) => { parts.push({ type: "image_url", image_url: { url: b } }); });
      userContent = parts;
    }

    const prevs = images.map((i: any) => i.preview);
    setMsgs((p: any) => [...p, { id: "u" + Date.now(), role: "user", content: input.trim() || "[Image]", images: prevs, model }]);
    setInput(""); setImages([]); setLoading(true);

    const ams = msgs.map((m: any) => {
      if (m.images?.length) {
        const parts: any[] = [];
        if (typeof m.content === "string" && m.content !== "[Image]") parts.push({ type: "text", text: m.content });
        m.images.forEach((url: string) => { parts.push({ type: "image_url", image_url: { url } }); });
        return { role: m.role, content: parts.length === 1 && parts[0].type === "text" ? parts[0].text : parts };
      }
      return { role: m.role, content: m.content };
    });
    ams.push({ role: "user", content: userContent });

    const aid = "a" + Date.now();
    setMsgs((p: any) => [...p, { id: aid, role: "assistant", content: "", model }]);
    ar.current = new AbortController();

    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json", "x-anon-user-id": anonId }, body: JSON.stringify({ messages: ams, model, conversationId: cid }), signal: ar.current!.signal });
      if (!res.ok) { const err = await res.json(); throw new Error(err.response || err.error || `Err ${res.status}`); }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");
      const decoder = new TextDecoder();
      let buffer = ""; let streamedContent = ""; let streamedModel = model;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const t = line.trim();
          if (!t || !t.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(t.slice(6));
            if (parsed.delta) { streamedContent += parsed.delta; if (parsed.model) streamedModel = parsed.model; setMsgs((p: any) => p.map((m: any) => m.id === aid ? { ...m, content: streamedContent, model: streamedModel } : m)); }
            if (parsed.done && parsed.full) streamedContent = parsed.full;
            if (parsed.error) toast.error(parsed.error);
          } catch {}
        }
      }
      setMsgs((p: any) => p.map((m: any) => m.id === aid ? { ...m, content: streamedContent || "(vide)", model: streamedModel } : m));
      window.dispatchEvent(new CustomEvent("elshalflow_refresh_convs"));
    } catch (err: any) {
      if (err.name !== "AbortError") { toast.error(err.message); setMsgs((p: any) => p.map((m: any) => m.id === aid ? { ...m, content: "Err: " + err.message } : m)); }
    } finally { setLoading(false); ar.current = null; }
  }

  function render(text: string) {
    let h = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    h = h.replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre class="bg-secondary/50 rounded-lg p-2.5 my-1.5 overflow-x-auto text-[11px]"><code>$2</code></pre>');
    h = h.replace(/`([^`]+)`/g, '<code class="bg-secondary/50 px-1 py-0.5 rounded text-[11px]">$1</code>');
    h = h.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    h = h.replace(/\n/g, "<br/>");
    return <div dangerouslySetInnerHTML={{ __html: h }} />;
  }

  const cm = MODELS.find((m: any) => m.id === model) || MODELS[0];
  const frees = MODELS.filter((m: any) => m.f);
  const paids = MODELS.filter((m: any) => !m.f);
  const fm = MODELS.filter((m: any) => {
    if (mt === "free" && !m.f) return false;
    if (mt === "paid" && m.f) return false;
    if (s && !m.name.toLowerCase().includes(s.toLowerCase()) && !m.p.toLowerCase().includes(s.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-background">
      <Toaster richColors theme="dark" position="top-center" />
      <div ref={sr} className="flex-1 overflow-y-auto pb-4">
        {msgs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6"><Brain className="w-8 h-8 text-primary/40" /></div>
            <h1 className="text-2xl font-bold mb-2">ElshalflowAI</h1>
            <p className="text-muted-foreground text-sm max-w-xs mb-6">Assistant IA avec tous les modeles OpenRouter. Gratuit et prive.</p>
            {!hasKey ? (
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 max-w-xs">
                <p className="text-amber-400 text-sm font-medium mb-1">Ajoutez votre cle API</p>
                <p className="text-muted-foreground text-xs">Menu lateral → Cles API → collez votre cle</p>
              </div>
            ) : (<p className="text-green-400 text-xs">Cle detectee — Pret !</p>)}
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {msgs.map((msg: any) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] break-words ${msg.role === "user" ? "flex flex-col items-end" : ""}`}>
                  {msg.role === "assistant" && msg.model && <span className="text-[10px] text-muted-foreground mb-1 ml-1 font-medium">{MODELS.find((m: any) => m.id === msg.model)?.name || msg.model}</span>}
                  {msg.images?.length > 0 && <div className="flex gap-1 mb-1 flex-wrap justify-end">{msg.images.map((img: string, i: number) => <img key={i} src={img} alt="" className="max-w-[120px] max-h-[120px] rounded-lg object-cover" />)}</div>}
                  <div className={`px-4 py-3 text-[14px] leading-relaxed rounded-2xl ${msg.role === "user" ? "bg-primary/15 text-foreground rounded-br-md" : "text-foreground"}`}>
                    {msg.content ? render(msg.content) : <span className="flex gap-1.5 py-1"><span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" /><span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0.15s" }} /><span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0.3s" }} /></span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {images.length > 0 && <div className="px-4 pb-1 flex gap-1.5 flex-wrap max-w-3xl mx-auto w-full">{images.map((img: any, i: number) => (<div key={i} className="relative group"><img src={img.preview} alt="" className="h-14 w-14 rounded-lg object-cover border border-border" /><button type="button" onClick={() => rmImg(i)} className="absolute -top-1.5 -right-1.5 bg-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100"><X className="h-2.5 w-2.5 text-white" /></button></div>))}</div>}
      <div className="border-t border-border px-3 py-3">
        <div className="max-w-3xl mx-auto relative" ref={dr}>
          <form onSubmit={handleSubmit} className="flex items-end gap-2 bg-secondary/40 rounded-2xl border border-border focus-within:border-primary/30 transition-colors px-3 py-2">
            <button type="button" onClick={() => fr.current?.click()} className="p-1 text-muted-foreground hover:text-foreground shrink-0"><Paperclip className="h-4 w-4" /></button>
            <input ref={fr} type="file" accept="image/*" multiple className="hidden" onChange={e => e.target.files && hFiles(e.target.files)} />
            <textarea value={input} onChange={e => setInput(e.target.value)} onPaste={hPaste} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }} placeholder="Message ElshalflowAI..." rows={1} className="flex-1 bg-transparent resize-none text-[14px] outline-none placeholder:text-muted-foreground min-h-[24px] max-h-[120px] py-0.5" disabled={loading} />
            <div className="flex items-center gap-1 shrink-0">
              {loading ? (<button type="button" onClick={() => ar.current?.abort()} className="p-1 text-red-400"><StopCircle className="h-4 w-4" /></button>) : (<button type="submit" disabled={!input.trim() && images.length === 0} className="p-1.5 bg-primary rounded-full text-primary-foreground hover:bg-primary/80 disabled:opacity-30 transition-all"><Send className="h-3.5 w-3.5" /></button>)}
            </div>
          </form>
          <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1">
            <button type="button" onClick={() => { setShowM(!showM); setS(""); setMt("all"); }} className={`text-[12px] px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1.5 shrink-0 ${cm.f ? "border-green-500/30 text-green-400 bg-green-500/10" : "border-border text-muted-foreground"}`}><span className="font-medium">{cm.name}</span>{cm.f && <span className="text-[10px] opacity-60">Gratuit</span>}<svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg></button>
            {frees.slice(0, 6).map((m: any) => (<button key={m.id} type="button" onClick={() => sel(m.id)} className={`text-[11px] px-2.5 py-1.5 rounded-full border whitespace-nowrap shrink-0 ${m.id === model ? "border-primary/30 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/20"}`}>{m.name}</button>))}
            <button type="button" onClick={() => { setShowM(true); setMt("paid"); }} className="text-[11px] px-2.5 py-1.5 rounded-full border border-border text-muted-foreground whitespace-nowrap shrink-0">+{paids.length} payants</button>
          </div>
          {showM && (
            <div className="absolute bottom-full mb-2 left-0 right-0 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50" style={{ maxHeight: "60vh" }}>
              <div className="p-3 border-b border-border space-y-2">
                <input value={s} onChange={e => setS(e.target.value)} placeholder="Rechercher..." className="w-full bg-secondary/50 rounded-lg px-3 py-2 text-xs outline-none" autoFocus />
                <div className="flex gap-1">
                  <button type="button" onClick={() => setMt("all")} className={`text-[11px] px-2.5 py-1 rounded-md ${mt === "all" ? "bg-primary/20 text-primary" : "text-muted-foreground"}`}>Tous ({MODELS.length})</button>
                  <button type="button" onClick={() => setMt("free")} className={`text-[11px] px-2.5 py-1 rounded-md ${mt === "free" ? "bg-green-500/20 text-green-400" : "text-muted-foreground"}`}>Gratuits ({frees.length})</button>
                  <button type="button" onClick={() => setMt("paid")} className={`text-[11px] px-2.5 py-1 rounded-md ${mt === "paid" ? "bg-amber-500/20 text-amber-400" : "text-muted-foreground"}`}>Payants ({paids.length})</button>
                </div>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: "50vh" }}>
                {fm.slice(0, 30).map((m: any) => (
                  <button key={m.id} type="button" onClick={() => sel(m.id)} className={`w-full text-left px-3 py-2.5 hover:bg-secondary/50 flex items-center justify-between gap-2 border-b border-border/20 ${m.id === model ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}>
                    <div className="min-w-0"><div className="text-xs font-medium flex items-center gap-1.5">{m.name}{m.f ? <span className="text-[10px] bg-green-500/15 text-green-400 px-1 py-0 rounded">Gratuit</span> : <span className="text-[10px] bg-amber-500/15 text-amber-400 px-1 py-0 rounded">Payant</span>}</div><div className="text-[10px] text-muted-foreground truncate">{m.p} · {m.d}</div></div>
                    {m.id === model && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground text-center mt-1.5">{hasKey ? "Cle OK · " : "Ajoutez cle dans Cles API · "}{frees.length} gratuits · {paids.length} payants</p>
        </div>
      </div>
    </div>
  );
}
