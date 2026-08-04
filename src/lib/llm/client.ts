import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

export const AVAILABLE_MODELS = [
  { id: "gpt-4o-mini", name: "GPT-4o Mini" },
  { id: "gpt-4o", name: "GPT-4o" },
  { id: "claude-3.5-sonnet", name: "Claude 3.5 Sonnet" },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
];

export async function streamChatResponse(params: {
  userId: string;
  modelId: string;
  messages: any[];
  systemPrompt?: string;
}) {
  const { modelId, messages, systemPrompt } = params;
  const openai = createOpenAI({ apiKey: "demo", baseURL: "https://openrouter.ai/api/v1" });
  return streamText({ model: openai(modelId), messages, system: systemPrompt });
}
