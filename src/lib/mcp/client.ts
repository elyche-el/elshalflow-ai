// ============================================================
// ElshalflowAI — MCP Client
// ============================================================

import { createClient } from "../supabase/server";
import type { McpServer } from "@/types";

export async function getUserMcpServers(userId: string): Promise<McpServer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mcp_servers")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getMcpTools(userId: string): Promise<Record<string, unknown>> {
  const tools: Record<string, unknown> = {};
  const servers = await getUserMcpServers(userId);

  for (const server of servers) {
    if (!server.is_active) continue;
    const serverPrefix = `mcp_${server.name}`;

    try {
      if (server.transport === "sse" && server.server_url) {
        const mcpTools = await fetchMcpToolsFromServer(server);
        for (const [toolName, toolDef] of Object.entries(mcpTools)) {
          const fullName = `${serverPrefix}_${toolName}`;
          tools[fullName] = {
            description: `[MCP:${server.name}] ${(toolDef as any).description || toolName}`,
            parameters: (toolDef as any).inputSchema || {},
            execute: async (params: Record<string, unknown>) => {
              return callMcpTool(server, toolName, params);
            },
          };
        }
      }
    } catch (e) {
      console.warn(`Failed to connect to MCP server "${server.name}":`, e);
    }
  }

  return tools;
}

async function fetchMcpToolsFromServer(server: McpServer): Promise<Record<string, unknown>> {
  const res = await fetch(`${server.server_url}/tools/list`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "tools/list", id: 1 }),
  });

  if (!res.ok) throw new Error(`MCP tools/list failed: ${res.statusText}`);

  const data = await res.json();
  const toolsArray = data.result?.tools || [];
  const toolsRecord: Record<string, unknown> = {};
  for (const tool of toolsArray) toolsRecord[tool.name] = tool;
  return toolsRecord;
}

async function callMcpTool(server: McpServer, toolName: string, params: Record<string, unknown>) {
  const res = await fetch(`${server.server_url}/tools/call`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0", method: "tools/call",
      params: { name: toolName, arguments: params }, id: Date.now(),
    }),
  });

  if (!res.ok) throw new Error(`MCP tools/call failed: ${res.statusText}`);
  const data = await res.json();
  return data.result;
}
