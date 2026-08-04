"use client";
import { useState, useRef, useEffect, FormEvent } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Toaster, toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Send, Brain, User, Bot } from "lucide-react";

type Message = { id: string; role: string; content: string };

export function ChatInterface() {
  const params = useParams();
  const conversationId = params.conversationId as string;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [...messages, userMsg], conversationId }) });
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");
      const decoder = new TextDecoder();
      let content = "";
      const assistantMsg: Message = { id: (Date.now() + 1).toString(), role: "assistant", content: "" };
      setMessages(prev => [...prev, assistantMsg]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        content += decoder.decode(value, { stream: true });
        setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content } : m));
      }
    } catch (err: any) { toast.error(err.message); } finally { setIsLoading(false); }
  }

  return (
    <div className="flex flex-col h-full">
      <header className="h-14 flex items-center px-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3"><Brain className="h-5 w-5 text-primary" /><h2 className="font-semibold text-sm">Chat</h2></div>
      </header>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (<div className="flex flex-col items-center justify-center h-full text-center"><Brain className="h-12 w-12 text-primary/50 mb-4" /><h3>ElshalflowAI</h3><p className="text-muted-foreground text-sm">Commencez à discuter.</p></div>)}
        {messages.map(msg => (<div key={msg.id} className="flex gap-3"><Avatar className="h-8 w-8"><AvatarFallback className={msg.role==="user"?"bg-primary/20":"bg-primary/10"}>{msg.role==="user"?<User className="h-4 w-4"/>:<Bot className="h-4 w-4"/>}</AvatarFallback></Avatar><div><span className="text-sm font-medium">{msg.role==="user"?"Vous":"ElshalflowAI"}</span><div className="prose prose-invert max-w-none text-sm"><ReactMarkdown>{msg.content}</ReactMarkdown></div></div></div>))}
      </div>
      <div className="p-4 border-t"><form onSubmit={handleSubmit} className="flex gap-3"><Textarea value={input} onChange={e=>setInput(e.target.value)} placeholder="Message..." rows={1} className="min-h-[44px] resize-none" disabled={isLoading} /><Button type="submit" size="icon" disabled={!input.trim()||isLoading} className="h-[44px] w-[44px]"><Send className="h-5 w-5"/></Button></form></div>
      <Toaster richColors theme="dark" />
    </div>
  );
}
