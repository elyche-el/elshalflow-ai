/**
 * Model Stabilizer — Tier-1 stable models with fallback to Mistral Large
 */

export const STABLE_MODELS = new Set([
  "deepseek/deepseek-chat-v3-0324",
  "openai/gpt-4o-mini",
  "anthropic/claude-3.5-sonnet",
  "google/gemini-2.5-pro-preview-06-05",
  "mistral-large-latest",
]);

// Map OpenRouter model IDs → Mistral equivalents for stable models
export const MODEL_STABLE_MAP: Record<string, string> = {
  "deepseek/deepseek-chat-v3-0324": "deepseek/deepseek-chat-v3-0324",
  "openai/gpt-4o-mini": "openai/gpt-4o-mini",
  "anthropic/claude-3.5-sonnet": "anthropic/claude-3.5-sonnet",
  "google/gemini-2.5-pro-preview-06-05": "google/gemini-2.5-pro-preview-06-05",
};

export function isStableModel(modelId: string): boolean {
  return STABLE_MODELS.has(modelId);
}

export function getFallbackModel(originalModel: string): string {
  return "mistral-large-latest";
}
