// ============================================================
// ElshalflowAI — LLM Client (OpenRouter + AI SDK)
// ============================================================

import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type CoreMessage, type Tool } from "ai";
import { decryptApiKey } from "@/lib/byok";
import { createClient } from "@/lib/supabase/server";
import { getMcpTools } from "@/lib/mcp/client";
import { getComposioActions } from "@/lib/composio/client";

// ---- Available Models ----

export const AVAILABLE_MODELS = [
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    provider: "openai",
  },
  {
    id: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "anthropic",
  },
  {
    id: "google/gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "google",
  },
  {
    id: "google/gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    provider: "google",
  },
  {
    id: "groq/llama-3.3-70b",
    name: "Llama 3.3 70B",
    provider: "groq",
  },
];

// ---- Provider mapping ----

const PROVIDER_BASE_URLS: Record<string, string> = {
  openai: "https://openrouter.ai/api/v1",
  anthropic: "https://openrouter.ai/api/v1",
  google: "https://openrouter.ai/api/v1",
  groq: "https://openrouter.ai/api/v1",
  omnirouter: "https://openrouter.ai/api/v1",
};

export function getProviderBaseUrl(provider: string): string {
  return PROVIDER_BASE_URLS[provider] || "https://openrouter.ai/api/v1";
}

// ---- Streaming Chat ----

export interface StreamChatOptions {
  model: string;
  messages: CoreMessage[];
  userId: string;
  conversationId: string;
  system?: string;
  maxTokens?: number;
  temperature?: number;
}

export async function streamChatResponse(options: StreamChatOptions) {
  const { model, messages, userId, conversationId, system, maxTokens, temperature } = options;

  // Get user's default API key
  const supabase = createClient();
  const { data: apiKey } = await supabase
    .from("api_keys")
    .select("*")
    .eq("user_id", userId)
    .eq("is_default", true)
    .single();

  let apiKeyValue: string;
  if (apiKey) {
    apiKeyValue = decryptApiKey(apiKey.encrypted_key);
  } else {
    // Fallback to environment variable
    apiKeyValue = process.env.COMPOSIO_API_KEY!;
  }

  if (!apiKeyValue) {
    throw new Error("Aucune clé API configurée. Veuillez ajouter une clé dans BYOK.");
  }

  // Get MCP and Composio tools
  let mcpTools: Tool[] = [];
  let composioActions: Tool[] = [];

  try {
    mcpTools = await getMcpTools(userId);
  } catch {
    // MCP tools optional
  }

  try {
    composioActions = await getComposioActions(userId);
  } catch {
    // Composio actions optional
  }

  const allTools = [...mcpTools, ...composioActions];

  // Determine provider from model ID
  const modelParts = model.split("/");
  const provider = modelParts[0] || "openai";
  const actualModel = modelParts.slice(1).join("/") || model;

  const baseURL = getProviderBaseUrl(provider);

  // Store user message
  const fullMessages = [...messages];

  // Create LLM client
  const openai = createOpenAI({
    apiKey: apiKeyValue,
    baseURL,
  });

  const result = streamText({
    model: openai(actualModel),
    messages: fullMessages as CoreMessage[],
    system,
    maxTokens: maxTokens || 4096,
    temperature: temperature || 0.7,
    tools: allTools.length > 0 ? allTools : undefined,
    maxSteps: allTools.length > 0 ? 5 : undefined,
  });

  return result;
}
