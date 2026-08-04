"use client";
import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { useChat } from "ai/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { AVAILABLE_MODELS } from "@/lib/llm/client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Brain, User, Sparkles, StopCircle, Trash2, Copy, Check, Bot } from "lucide-react";
import { Toaster, toast } from "sonner";

export function ChatInterface() {
  const params = useParams();
  const conversationId = params.conversationId as string;
  const [selectedModel, setSelectedModel] = useState("gpt-4o-mini");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { messages, input, handleInputChange, handleSubmit, isLoading, stop, setMessages } = useChat({ api: "/api/chat", body: { conversationId, model: selectedModel }, onError: (err: any) => toast.error(err.message) });
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);
  return (
    <div className="flex flex-col h-full">
      <Toaster richColors theme="dark" />
      <header className="h-14 flex items-center justify-between px-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3"><Brain className="h-5 w-5 text-primary" /><h2 className="font-semibold text-sm">Chat</h2></div>
        <div className="flex items-center gap-2">
          <Select value={selectedModel} onValueChange={setSelectedModel}><SelectTrigger className="w-[200px] h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{AVAILABLE_MODELS.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setMessages([]); toast.success("Vidée"); }}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </header>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.length === 0 && (<div className="flex flex-col items-center justify-center h-full text-center"><Brain className="h-12 w-12 text-primary/50 mb-4" /><h3 className="text-lg font-semibold">ElshalflowAI</h3><p className="text-muted-foreground text-sm">Commencez à discuter.</p></div>)}
        {messages.map((msg: any) => (<div key={msg.id} className="flex gap-3 animate-message-in"><Avatar className="h-8 w-8 shrink-0"><AvatarFallback className={msg.role==="user"?"bg-primary/20":"bg-primary/10"}>{msg.role==="user"?<User className="h-4 w-4" />:<Bot className="h-4 w-4" />}</AvatarFallback></Avatar><div className="flex-1"><span className="text-sm font-medium">{msg.role==="user"?"Vous":"ElshalflowAI"}</span><div className="prose prose-invert max-w-none text-sm">{msg.content ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown> : <Skeleton className="h-4 w-3/4" />}</div></div></div>))}
        {isLoading && (<div className="flex gap-3 animate-message-in"><Avatar className="h-8 w-8"><AvatarFallback className="bg-primary/10"><Sparkles className="h-4 w-4 animate-pulse" /></AvatarFallback></Avatar><div className="flex-1"><span className="text-sm font-medium">ElshalflowAI</span><Skeleton className="h-4 w-2/3 mt-2" /></div></div>)}
      </div>
      <div className="p-4 border-t"><form onSubmit={handleSubmit} className="flex gap-3 items-end"><Textarea value={input} onChange={handleInputChange} placeholder="Message..." rows={1} className="min-h-[44px] resize-none" disabled={isLoading} /><Button type="submit" size="icon" disabled={!input.trim()||isLoading} className="h-[44px] w-[44px]"><Send className="h-5 w-5" /></Button></form></div>
    </div>
  );
}
