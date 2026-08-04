import type { NextRequest } from "next/server";
import { getToolsForApps, buildFunctionDefs, executeToolCall, getToolSimulation } from "@/lib/tools";
const KEY = process.env.OPENROUTER_API_KEY || "";

function detectAction(input: string, tools: any[]) {
  const t = input.toLowerCase();
  for (const tool of tools) {
    if (tool.name === "gmail_send_email" && (t.includes("email")||t.includes("mail")||t.includes("envoie"))) { const to=(input.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)||[])[0]||"contact@example.com"; const s=input.match(/sujet\s*[:=]\s*["']?([^"'\n,]+)/i); return {toolName:"gmail_send_email",params:{to,subject:s?.[1]||"Sans sujet",body:input.slice(0,200)}}; }
    if (tool.name === "slack_send_message" && (t.includes("slack")||t.includes("canal")||t.includes("#"))) { const ch=(input.match(/#(\w+)/)||[])[1]||"general"; const msg=input.split(":").slice(1).join(":").trim()||"Message"; return {toolName:"slack_send_message",params:{channel:"#"+ch,message:msg}}; }
    if (tool.name === "github_create_issue" && (t.includes("issue")||t.includes("github")||t.includes("bug"))) { const repo=(input.match(/[\w.-]+\/[\w.-]+/)||[])[0]||"elyche-el/elshalflow-ai"; const ti=(input.match(/["']([^"']+)["']/)||input.match(/(?:issue|bug)\s+["']?([^"'\n]+)/i)||[])[1]||"Nouvelle issue"; return {toolName:"github_create_issue",params:{repo,title:ti,body:input}}; }
    if (tool.name === "notion_create_page" && t.includes("notion")) return {toolName:"notion_create_page",params:{title:input.slice(0,100),content:input}};
    if (tool.name === "calendar_create_event" && (t.includes("evenement")||t.includes("event")||t.includes("rdv"))) return {toolName:"calendar_create_event",params:{summary:input.slice(0,80),date:"demain",time:"14:00"}};
    if (tool.name === "twitter_post_tweet" && (t.includes("tweet")||t.includes("publie un tweet")||t.includes("twitter"))) return {toolName:"twitter_post_tweet",params:{text:input.slice(0,280)}};
    if (tool.name === "linear_create_task" && (t.includes("tache")||t.includes("task")||t.includes("linear"))) return {toolName:"linear_create_task",params:{title:input.slice(0,100),priority:"medium"}};
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, model, connectedApps } = body;
    const tools = getToolsForApps(connectedApps || []);
    const lastMsg = typeof messages?.[messages.length - 1]?.content === "string" ? messages[messages.length - 1].content : "";

    if (!KEY) {
      const action = detectAction(lastMsg, tools);
      if (action && tools.length > 0) {
        const tool = tools.find(t => t.name === action.toolName);
        if (tool) {
          try { await executeToolCall(action.toolName, action.params); } catch {}
          const sim = getToolSimulation(action.toolName, action.params);
          return Response.json({ response: "Action executee avec succes!\n\n" + sim + "\n\nMode local.", toolCalls: [{ name: action.toolName, icon: tool.icon, simulation: sim }] });
        }
      }
      const appList = [...new Set(tools.map(t => t.app))].map(a => a.replace(/_/g, " ")).join(", ");
      return Response.json({ response: "Mode local\n\nApps: " + (appList || "aucune") + "\n\nDites: envoie un email a..., cree une issue..., publie sur Slack..." });
    }

    const fns = tools.length ? buildFunctionDefs(tools) : undefined;
    const reqBody: any = { model: model || "openai/gpt-4o-mini", messages, stream: false, tools: fns, tool_choice: fns ? "auto" : undefined };
    const isV = (model||"").includes("gpt-4o")||(model||"").includes("claude")||(model||"").includes("gemini");
    if(!isV) reqBody.messages = reqBody.messages.map((m:any)=>Array.isArray(m.content)?{...m,content:m.content.filter((c:any)=>c.type==="text").map((c:any)=>c.text).join("\n")}:m);

    const r1 = await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+KEY,"HTTP-Referer":"https://elshalflow-ai.vercel.app","X-Title":"ElshalflowAI"},body:JSON.stringify(reqBody)});
    if(!r1.ok) return Response.json({error:"API: "+r1.status},{status:r1.status});
    const d1 = await r1.json(); const msg = d1.choices?.[0]?.message;
    if(msg?.tool_calls?.length) {
      const trs: any[] = [];
      for(const tc of msg.tool_calls) { const p=JSON.parse(tc.function?.arguments||"{}"); const t=tools.find(x=>x.name===tc.function?.name); if(t){try{await executeToolCall(tc.function.name,p)}catch{} trs.push({toolName:tc.function.name,icon:t.icon,simulation:getToolSimulation(tc.function.name,p)});} }
      const tmsgs: any[] = [{role:"assistant",content:null,tool_calls:msg.tool_calls}];
      for(let i=0;i<msg.tool_calls.length;i++) tmsgs.push({role:"tool",tool_call_id:msg.tool_calls[i].id,content:"OK"});
      const r2 = await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+KEY,"HTTP-Referer":"https://elshalflow-ai.vercel.app","X-Title":"ElshalflowAI"},body:JSON.stringify({model:model||"openai/gpt-4o-mini",messages:[...(messages||[]),...tmsgs],stream:false})});
      if(!r2.ok) return Response.json({response:trs.map(t=>t.simulation).join("\n\n"),toolCalls:trs});
      const d2 = await r2.json();
      return Response.json({response:d2.choices?.[0]?.message?.content||"",toolCalls:trs});
    }
    return Response.json({response:msg?.content||""});
  } catch(e: any) { return Response.json({error:e.message},{status:500}); }
}
