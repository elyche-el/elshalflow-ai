/**
 * Agent Router — routes requests between OpenRouter and Mistral AI
 */
import { MODEL_STABLE_MAP, STABLE_MODELS } from "./model-stabilizer";

export interface AgentConfig {
  provider: string;
  model: string;
  apiKey?: string;
  baseUrl: string;
}

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const MISTRAL_BASE = "https://api.mistral.ai/v1";

export function resolveProvider(model: string, preferredProvider: string): {
  provider: string;
  model: string;
  baseUrl: string;
} {
  // If it's a stable model (Tier-1), use the preferred provider
  if (STABLE_MODELS.has(model)) {
    if (preferredProvider === "mistral") {
      const mapped = MODEL_STABLE_MAP[model];
      return {
        provider: "mistral",
        model: mapped || model,
        baseUrl: MISTRAL_BASE,
      };
    }
    return { provider: "openrouter", model, baseUrl: OPENROUTER_BASE };
  }

  // Non-stable models → fallback to Mistral Large
  return {
    provider: "mistral",
    model: "mistral-large-latest",
    baseUrl: MISTRAL_BASE,
  };
}

export function getProviderConfig(
  provider: string,
  model: string,
  openrouterKey?: string,
  mistralKey?: string
): AgentConfig {
  if (provider === "mistral") {
    return {
      provider: "mistral",
      model,
      apiKey: mistralKey || process.env.MISTRAL_API_KEY,
      baseUrl: MISTRAL_BASE,
    };
  }
  return {
    provider: "openrouter",
    model,
    apiKey: openrouterKey || process.env.OPENROUTER_API_KEY,
    baseUrl: OPENROUTER_BASE,
  };
}
