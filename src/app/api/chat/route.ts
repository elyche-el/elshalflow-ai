import type { NextRequest } from "next/server";
import { getToolsForApps, buildFunctionDefs, executeToolCall, getToolSimulation } from "@/lib/tools";
const KEY = process.env.OPENROUTER_API_KEY || "";

function detectAction(input: string, tools: any[]) {
  const t = input.toLowerCase();
  for (const tool of tools) {
    if (tool.name === "gmail_send_email" && (t.includes("email")||t.includes("mail")||t.includes("envoie"))) { const to = input.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0]||"contact@example.com"; const s = input.match(/sujet\s*[:=]\s*["']?([^"'\n,]+)/i); const subj = s?.[1]||"Sans sujet"; return { toolName: "gmail_send_email", params: { to, subject: subj, body: input.slice(0,200) } }; }
    if (tool.name === "slack_send_message" && (t.includes("slack")||t.includes("canal")||t.includes("#"))) { const ch = input.match(/#(\w+)/)?.[1]||"général"; const msg = input.split(":").pop()?.trim()||"Message"; return { toolName: "slack_send_message", params: { channel: `#${ch}`, message: msg } }; }
    if (tool.name === "github_create_issue" && (t.includes("issue")||t.includes("github")||t.includes("bug"))) { const repo = input.match(/[\w.-]+\/[\w.-]+/)?.[0]||"elyche-el/elshalflow-ai"; const title = input.match(/["']([^"']+)["']/)?.[1]||input.match(/(?:issue|bug)\s+["']?([^"'\n]+)/i)?.[1]||"Nouvelle issue"; return { toolName: "github_create_issue", params: { repo, title, body: input } }; }
    if (tool.name === "notion_create_page" && (t.includes("notion")||t.includes("page"))) return { toolName: "notion_create_page", params: { title: input.slice(0,100), content: input } };
    if (tool.name === "calendar_create_event" && (t.includes("événement")||t.includes("event")||t.includes("rdv"))) return { toolName: "calendar_create_event", params: { summary: input.slice(0,80), date: "demain", time: "14:00" } };
    if (tool.name === "twitter_post_tweet" && (t.includes("tweet")||t.includes("publie")||t.includes("twitter"))) return { toolName: "twitter_post_tweet", params: { text: input.slice(0,280) } };
    if (tool.name === "linear_create_task" && (t.includes("tâche")||t.includes("task")||t.includes("linear"))) return { toolName: "linear_create_task", params: { title: input.slice(0,100), priority: "medium" } };
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { messages, model, connectedApps } = await req.json();
    const tools = getToolsForApps(connectedApps || []);
    const lastMsg = messages?.[messages.length - 1]?.content || "";

    if (!KEY) {
      const action = detectAction(typeof lastMsg === "string" ? lastMsg : "", tools);
      if (action && tools.length) {
        const { toolName, params } = action;
        const tool = tools.find(t => t.name === toolName);
        if (tool) {
          await executeToolCall(toolName, params);
          const sim = getToolSimulation(toolName, params);
          return Response.json({ response: `✅ **Action exécutée !**\n\n${sim}\n\n*Mode local — ajoutez une clé API OpenRouter pour l'IA complète.*`, toolCalls: [{ name: toolName, icon: tool.icon, simulation: sim }] });
        }
      }
      const appNames = tools.map(t => t.app.replace(/_/g," ")).join(", ");
      const suggestions = tools.map(t => { if(t.name.includes("send_email"))return"- 📧 **Envoyer un email** : dites \"envoie un email à...\"";if(t.name.includes("slack"))return"- 💬 **Message Slack** : dites \"envoie un message sur #...\"";if(t.name.includes("github"))return"- 🐙 **Issue GitHub** : dites \"crée une issue...\"";if(t.name.includes("notion"))return"- 📝 **Page Notion** : dites \"crée une page...\"";if(t.name.includes("calendar"))return"- 📅 **Événement** : dites \"crée un événement...\"";if(t.name.includes("tweet"))return"- 🐦 **Tweet** : dites \"publie un tweet...\"";if(t.name.includes("linear"))return"- 📋 **Tâche Linear** : dites \"crée une tâche...\"";return"";}).filter(Boolean).join("\n");
      return Response.json({ response: `👋 **Mode local**\n\n📱 Apps connectées : ${appNames||"aucune"}\n\n**Actions dispo :**\n${suggestions||"Connectez des apps dans Composio."}\n\n💡 *Ajoutez une clé API OpenRouter dans BYOK pour l'IA.*` });
    }

    const fns = tools.length ? buildFunctionDefs(tools) : undefined;
    const body: any = { model: model || "openai/gpt-4o-mini", messages, stream: false, tools: fns, tool_choice: fns ? "auto" : undefined };
    const isV = (model||"").includes("gpt-4o")||(model||"").includes("claude")||(model||"").includes("gemini");
    if(!isV) body.messages = body.messages.map((m:any)=>Array.isArray(m.content)?{...m,content:m.content.filter((c:any)=>c.type==="text").map((c:any)=>c.text).join("\n")}:m);
    const r1 = await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${KEY}`,"HTTP-Referer":"https://elshalflow-ai.vercel.app","X-Title":"ElshalflowAI"},body:JSON.stringify(body)});
    if(!r1.ok) return Response.json({error:`API: ${r1.status}`},{status:r1.status});
    const d1 = await r1.json(); const msg = d1.choices?.[0]?.message;
    if(msg?.tool_calls?.length) { const trs: any[] = []; for(const tc of msg.tool_calls) { const p=JSON.parse(tc.function?.arguments||"{}"); const t=tools.find(x=>x.name===tc.function?.name); if(t){await executeToolCall(tc.function.name,p);trs.push({toolName:tc.function.name,icon:t.icon,simulation:getToolSimulation(tc.function.name,p)});}}
      const tmsgs: any[] = [{role:"assistant",content:null,tool_calls:msg.tool_calls}]; for(let i=0;i<msg.tool_calls.length;i++) tmsgs.push({role:"tool",tool_call_id:msg.tool_calls[i].id,content:"✅ OK"});
      const r2 = await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${KEY}`,"HTTP-Referer":"https://elshalflow-ai.vercel.app","X-Title":"ElshalflowAI"},body:JSON.stringify({model:model||"openai/gpt-4o-mini",messages:[...(messages||[]),...tmsgs],stream:false})});
      if(!r2.ok) return Response.json({response:trs.map(t=>t.simulation).join("\n\n"),toolCalls:trs});
      const d2 = await r2.json(); return Response.json({response:d2.choices?.[0]?.message?.content||"",toolCalls:trs});
    }
    return Response.json({response:msg?.content||""});
  } catch(e: any) { return Response.json({error:e.message},{status:500}); }
}
