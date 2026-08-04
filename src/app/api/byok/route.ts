import type { NextRequest } from "next/server";
export async function POST(req: NextRequest) { const b=await req.json();return Response.json({id:Date.now().toString(),provider:b.provider,label:b.label,key_preview:b.api_key.slice(0,4)+"****"+b.api_key.slice(-4),is_default:false},{status:201});}
export async function GET() { return Response.json([{id:"1",provider:"openai",label:"OpenAI Demo",key_preview:"sk-****demo",is_default:true,created_at:new Date().toISOString()}]); }
export async function DELETE(req: NextRequest) { return Response.json({message:"Deleted "+new URL(req.url).searchParams.get("id")}); }
