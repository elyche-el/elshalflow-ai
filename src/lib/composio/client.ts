// ============================================================
// ElshalflowAI — Composio Client
// ============================================================

import { createClient } from "../supabase/server";
import type { ComposioApp, ComposioConnection } from "@/types";

const COMPOSIO_API_KEY = process.env.COMPOSIO_API_KEY!;
const COMPOSIO_BASE_URL = "https://backend.composio.dev/api/v1";

export async function getAvailableApps(): Promise<ComposioApp[]> {
  const res = await fetch(`${COMPOSIO_BASE_URL}/apps`, { headers: { "X-API-Key": COMPOSIO_API_KEY } });
  if (!res.ok) throw new Error(`Composio API error: ${res.statusText}`);
  const data = await res.json();
  return data.items || [];
}

export async function createConnection(userId: string, appName: string): Promise<{ connectionId: string; redirectUrl: string }> {
  const res = await fetch(`${COMPOSIO_BASE_URL}/connectedAccounts`, {
    method: "POST",
    headers: { "X-API-Key": COMPOSIO_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ integrationId: appName, entityId: userId, redirectUri: `${process.env.AUTH_URL}/composio/callback` }),
  });
  if (!res.ok) throw new Error(`Composio API error: ${res.statusText}`);
  const data = await res.json();
  return { connectionId: data.connectionId, redirectUrl: data.redirectUrl };
}

export async function getUserConnections(userId: string): Promise<ComposioConnection[]> {
  const res = await fetch(`${COMPOSIO_BASE_URL}/connectedAccounts?entityId=${userId}`, { headers: { "X-API-Key": COMPOSIO_API_KEY } });
  if (!res.ok) throw new Error(`Composio API error: ${res.statusText}`);
  const data = await res.json();
  return data.items || [];
}

export async function getAppActions(appName: string) {
  const res = await fetch(`${COMPOSIO_BASE_URL}/actions?appName=${appName}`, { headers: { "X-API-Key": COMPOSIO_API_KEY } });
  if (!res.ok) throw new Error(`Composio API error: ${res.statusText}`);
  const data = await res.json();
  return data.items || [];
}

export async function executeAction(connectionId: string, actionName: string, params: Record<string, unknown>) {
  const res = await fetch(`${COMPOSIO_BASE_URL}/actions/${actionName}/execute`, {
    method: "POST",
    headers: { "X-API-Key": COMPOSIO_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ connectedAccountId: connectionId, params }),
  });
  if (!res.ok) throw new Error(`Composio API error: ${res.statusText}`);
  return res.json();
}

export async function getComposioActions(userId: string): Promise<Record<string, unknown>> {
  const tools: Record<string, unknown> = {};
  try {
    const connections = await getUserConnections(userId);
    for (const conn of connections) {
      if (conn.status !== "connected") continue;
      const actions = await getAppActions(conn.appName);
      for (const action of actions) {
        const toolName = `composio_${conn.appName}_${action.name}`;
        tools[toolName] = {
          description: `[${conn.appName}] ${action.description}`,
          parameters: action.parameters,
          execute: async (params: Record<string, unknown>) => executeAction(conn.connectionId, action.name, params),
        };
      }
    }
  } catch (e) { console.warn("Failed to build Composio tools:", e); }
  return tools;
}
