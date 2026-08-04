// ============================================================
// ElshalflowAI — Types TypeScript
// ============================================================

// ---- Database Models ----

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export type ApiKeyProvider =
  | "openrouter"
  | "openai"
  | "anthropic"
  | "google"
  | "groq"
  | "omnirouter"
  | "custom";

export interface ApiKey {
  id: string;
  user_id: string;
  provider: ApiKeyProvider;
  label: string;
  encrypted_key: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
}

export interface ApiKeyDisplay {
  id: string;
  provider: ApiKeyProvider;
  label: string;
  key_preview: string;
  is_default: boolean;
  created_at: string;
  last_used_at: string | null;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  model: string | null;
  created_at: string;
  updated_at: string;
  archived: boolean;
}

export type MessageRole = "user" | "assistant" | "system" | "tool";

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  model: string | null;
  tokens_used: number | null;
  tool_calls: ToolCall[] | null;
  created_at: string;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export type McpTransport = "sse" | "stdio" | "websocket";

export interface McpServer {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  transport: McpTransport;
  server_url: string | null;
  command: string | null;
  args: string[] | null;
  env_vars: Record<string, string> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ComposioConfig {
  id: string;
  user_id: string;
  app_name: string;
  integration_id: string | null;
  connection_id: string | null;
  is_connected: boolean;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ---- Chat Types ----

export interface ChatMessage {
  id?: string;
  role: MessageRole;
  content: string;
  tool_calls?: ToolCall[];
}

export interface StreamChunk {
  type: "text" | "tool_use" | "tool_result" | "error" | "done";
  content?: string;
  tool_call?: ToolCall;
  tool_result?: {
    tool_use_id: string;
    content: string;
  };
  error?: string;
}

export interface ComposioApp {
  name: string;
  displayName: string;
  description: string;
  icon: string;
  categories: string[];
  actions: ComposioAction[];
}

export interface ComposioAction {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ComposioConnection {
  connectionId: string;
  appName: string;
  status: "connected" | "disconnected" | "expired";
  createdAt: string;
}

export interface LlmModel {
  id: string;
  name: string;
  provider: ApiKeyProvider;
  context_length: number;
  supports_vision: boolean;
  supports_tools: boolean;
}

export interface LlmConfig {
  provider: ApiKeyProvider;
  model: string;
  api_key: string;
  base_url?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface ByokFormData {
  provider: ApiKeyProvider;
  label: string;
  api_key: string;
  is_default: boolean;
}

export interface McpFormData {
  name: string;
  description: string;
  transport: McpTransport;
  server_url?: string;
  command?: string;
  args?: string;
  env_vars?: string;
}
