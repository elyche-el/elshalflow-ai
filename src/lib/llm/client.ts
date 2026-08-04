// ============================================================
// ElshalflowAI — LLM Client (OpenRouter + AI SDK)
// ============================================================

import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type CoreMessage, type Tool } from "ai";
import { decryptApiKey } from "../byok";
import { createClient } from "../supabase/server";
import { getMcpTools } from "../mcp/client";
import { getComposioActions } from "../composio/client";

export const AVAILABLE_MODELS = [
  { id: "openai/gpt-4o", name: "GPT-4o", provider: "openrouter" as const, context_length: 128000, supports_vision: true, supports_tools: true },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", provider: "openrouter" as const, context_length: 128000, supports_vision: true, supports_tools: true },
  { id: "anthropic/claude-sonnet-4-20250514", name: "Claude Sonnet 4", provider: "openrouter" as const, context_length: 200000, supports_vision: true, supports_tools: true },
  { id: "anthropic/claude-opus-4-20250514", name: "Claude Opus 4", provider: "openrouter" as const, context_length: 200000, supports_vision: true, supports_tools: true },
  { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "openrouter" as const, context_length: 1000000, supports_vision: true, supports_tools: true },
  { id: "meta-llama/llama-4-maverick", name: "Llama 4 Maverick", provider: "openrouter" as const, context_length: 131072, supports_vision: false, supports_tools: true },
  { id: "deepseek/deepseek-chat-v3", name: "DeepSeek V3", provider: "openrouter" as const, context_length: 131072, supports_vision: false, supports_tools: true },
  { id: "qwen/qwen-max", name: "Qwen Max", provider: "openrouter" as const, context_length: 32768, supports_vision: false, supports_tools: true },
] as const;

export type AvailableModel = (typeof AVAILABLE_MODELS)[number];

async function getUserApiKey(userId: string, provider: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: keys } = await supabase
    .from("api_keys")
    .select("encrypted_key, is_default")
    .eq("user_id", userId)
    .eq("provider", provider)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1);
  if (!keys || keys.length === 0) return null;
  await supabase.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("user_id", userId).eq("provider", provider).eq("is_default", true);
  return decryptApiKey(keys[0].encrypted_key);
}

async function buildToolsForUser(userId: string): Promise<Record<string, Tool>> {
  const tools: Record<string, Tool> = {};
  try { const mcpTools = await getMcpTools(userId); Object.assign(tools, mcpTools); } catch (e) { console.warn("Failed to load MCP tools:", e); }
  try { const composioTools = await getComposioActions(userId); Object.assign(tools, composioTools); } catch (e) { console.warn("Failed to load Composio tools:", e); }
  return tools;
}

export interface StreamChatParams { userId: string; modelId: string; messages: CoreMessage[]; systemPrompt?: string; }

export async function streamChat(params: StreamChatParams) {
  const { userId, modelId, messages, systemPrompt } = params;
  const modelInfo = AVAILABLE_MODELS.find((m) => m.id === modelId);
  if (!modelInfo) throw new Error(`Unknown model: ${modelId}`);
  const apiKey = await getUserApiKey(userId, "openrouter");
  if (!apiKey) throw new Error("No OpenRouter API key configured. Please add your key in the BYOK settings.");
  const tools = await buildToolsForUser(userId);
  const openrouter = createOpenAI({ apiKey, baseURL: "https://openrouter.ai/api/v1", headers: { "HTTP-Referer": process.env.AUTH_URL || "http://localhost:3000", "X-Title": "ElshalflowAI" } });
  const fullMessages = systemPrompt ? [{ role: "system" as const, content: systemPrompt }, ...messages] : messages;
  return streamText({ model: openrouter(modelId), messages: fullMessages as CoreMessage[], tools: Object.keys(tools).length > 0 ? tools : undefined, maxSteps: 10 });
}

export async function chat(params: StreamChatParams) { const streamResult = await streamChat(params); return streamResult.text; }
