// ============================================================
// ElshalflowAI — Chat Interface Component
// ============================================================

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { AVAILABLE_MODELS } from "@/lib/llm/client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Send,
  Brain,
  User,
  Sparkles,
  StopCircle,
  Trash2,
  Copy,
  Check,
  Bot,
} from "lucide-react";
import { Toaster, toast } from "sonner";

interface MessageBubbleProps {
  role: "user" | "assistant" | "system";
  content: string;
  model?: string;
  isLoading?: boolean;
}

function MessageBubble({ role, content, model, isLoading }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (role === "user") {
    return (
      <div className="flex gap-3 animate-message-in">
        <Avatar className="h-8 w-8 shrink-0 mt-0.5">
          <AvatarFallback className="bg-primary/20 text-primary">
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Vous</span>
          </div>
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 animate-message-in">
      <Avatar className="h-8 w-8 shrink-0 mt-0.5">
        <AvatarFallback className="bg-primary/10 text-primary">
          {isLoading ? (
            <Sparkles className="h-4 w-4 animate-pulse" />
          ) : (
            <Bot className="h-4 w-4" />
          )}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-2 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">ElshalflowAI</span>
          {model && (
            <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
              {model}
            </span>
          )}
          {!isLoading && (
            <div className="flex items-center gap-1 ml-auto opacity-0 hover:opacity-100 transition-opacity">
              <button
                onClick={copyToClipboard}
                className="p-1 rounded hover:bg-secondary text-muted-foreground"
              >
                {copied ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            </div>
          )}
        </div>
        <div className="prose prose-invert max-w-none text-sm leading-relaxed">
          {isLoading && !content ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          )}
        </div>
      </div>
    </div>
  );
}

export function ChatInterface() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.conversationId as string;

  const [selectedModel, setSelectedModel] = useState("openai/gpt-4o-mini");
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    stop,
    setMessages,
  } = useChat({
    api: "/api/chat",
    body: {
      conversationId,
      model: selectedModel,
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !isLoading) {
        e.preventDefault();
        handleSubmit(e);
      }
    },
    [handleSubmit, isLoading]
  );

  async function clearConversation() {
    if (confirm("Supprimer tous les messages de cette conversation ?")) {
      setMessages([]);
      toast.success("Conversation vidée");
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Toaster richColors theme="dark" position="top-center" />

      <header className="h-14 flex items-center justify-between px-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <Brain className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-sm">Chat</h2>
        </div>

        <div className="flex items-center gap-2">
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-[200px] h-8 text-xs">
              <SelectValue placeholder="Sélectionner un modèle" />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_MODELS.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={clearConversation}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Vider la conversation</TooltipContent>
          </Tooltip>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-6"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="p-6 rounded-2xl bg-primary/5 ring-1 ring-primary/10">
              <Brain className="h-12 w-12 text-primary/50" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">ElshalflowAI</h3>
              <p className="text-muted-foreground text-sm max-w-sm">
                Votre assistant IA avec support BYOK, Composio et MCP.
                Sélectionnez un modèle et commencez à discuter.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg: any) => (
          <MessageBubble
            key={msg.id}
            role={msg.role}
            content={msg.content}
            model={msg.role === "assistant" ? selectedModel : undefined}
          />
        ))}

        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <MessageBubble
            role="assistant"
            content=""
            isLoading={true}
          />
        )}
      </div>

      <div className="p-4 border-t border-border">
        <form
          onSubmit={handleSubmit}
          className="flex gap-3 items-end"
        >
          <div className="flex-1 relative">
            <Textarea
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Écrivez votre message... (Ctrl+Enter pour envoyer)"
              rows={1}
              className="min-h-[44px] max-h-[200px] resize-none pr-12"
              disabled={isLoading}
            />
            <span className="absolute right-3 bottom-2.5 text-xs text-muted-foreground pointer-events-none">
              {isLoading && (
                <StopCircle
                  className="h-4 w-4 cursor-pointer text-primary animate-pulse"
                  onClick={stop}
                />
              )}
            </span>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isLoading}
                className="h-[44px] w-[44px] shrink-0"
              >
                <Send className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Envoyer (Ctrl+Enter)</TooltipContent>
          </Tooltip>
        </form>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          ElshalflowAI peut faire des erreurs. Vérifiez les informations importantes.
        </p>
      </div>
    </div>
  );
}
