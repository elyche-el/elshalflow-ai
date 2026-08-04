import type { NextRequest } from "next/server";
import { getToolsForApps, buildFunctionDefs, executeToolCall, getToolSimulation } from "@/lib/tools";
const KEY = process.env.OPENROUTER_API_KEY || "";

export async function POST(req: NextRequest) {
  try {
    const { messages, model, connectedApps } = await req.json();
    const tools = getToolsForApps(connectedApps || []);
    const fns = tools.length ? buildFunctionDefs(tools) : undefined;
    const body: any = { model: model || "openai/gpt-4o-mini", messages, stream: false, tools: fns, tool_choice: fns ? "auto" : undefined };
    const isV = (model||"").includes("gpt-4o")||(model||"").includes("claude")||(model||"").includes("gemini");
    if(!isV)body.messages=body.messages.map((m:any)=>Array.isArray(m.content)?{...m,content:m.content.filter((c:any)=>c.type==="text").map((c:any)=>c.text).join("\n")}:m);

    const r1 = await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${KEY}`,"HTTP-Referer":"https://elshalflow-ai.vercel.app","X-Title":"ElshalflowAI"},body:JSON.stringify(body)});
    if(!r1.ok)return Response.json({error:`API error: ${r1.status}`},{status:r1.status});
    const d1 = await r1.json();
    const msg = d1.choices?.[0]?.message;

    if(msg?.tool_calls?.length && tools.length) {
      const trs: {toolName:string;icon:string;simulation:string}[] = [];
      for(const tc of msg.tool_calls) {
        const p = JSON.parse(tc.function?.arguments||"{}");
        const t = tools.find(x=>x.name===tc.function?.name);
        if(t) { await executeToolCall(tc.function.name,p); trs.push({toolName:tc.function.name,icon:t.icon,simulation:getToolSimulation(tc.function.name,p)}); }
      }
      const tmsgs: any[] = [{role:"assistant",content:null,tool_calls:msg.tool_calls}];
      for(let i=0;i<msg.tool_calls.length;i++) tmsgs.push({role:"tool",tool_call_id:msg.tool_calls[i].id,content:"✅ Action exécutée"});
      const r2 = await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${KEY}`,"HTTP-Referer":"https://elshalflow-ai.vercel.app","X-Title":"ElshalflowAI"},body:JSON.stringify({model:model||"openai/gpt-4o-mini",messages:[...(messages||[]),...tmsgs],stream:false})});
      if(!r2.ok) return Response.json({response:trs.map(t=>t.simulation).join("\n\n"),toolCalls:trs});
      const d2 = await r2.json();
      return Response.json({response:d2.choices?.[0]?.message?.content||"",toolCalls:trs});
    }
    return Response.json({response:msg?.content||""});
  } catch(e:any) { return Response.json({error:e.message},{status:500}); }
}
