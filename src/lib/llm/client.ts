import { OpenAIStream, StreamingTextResponse } from "ai";
import OpenAI from "openai";

export const AVAILABLE_MODELS = [
  { id: "gpt-4o-mini", name: "GPT-4o Mini" },
  { id: "gpt-4o", name: "GPT-4o" },
];

export async function streamChatResponse(params: { userId: string; modelId: string; messages: any[] }) {
  const { modelId, messages } = params;
  const openai = new OpenAI({ apiKey: process.env.OPENROUTER_API_KEY || "demo", baseURL: "https://openrouter.ai/api/v1" });
  const response = await openai.chat.completions.create({ model: modelId, messages, stream: true });
  const stream = OpenAIStream(response);
  return new StreamingTextResponse(stream);
}
