import type { NextRequest } from "next/server";
const D=[{id:"1",name:"Brave Search",description:"Web search via Brave API",transport:"sse",server_url:"https://mcp.brave.dev/search",command:"",is_active:true,created_at:new Date().toISOString()},{id:"2",name:"Filesystem",description:"Local file system access",transport:"sse",server_url:"http://localhost:3001/mcp",command:"",is_active:false,created_at:new Date().toISOString()},{id:"3",name:"PostgreSQL",description:"SQL database queries",transport:"sse",server_url:"https://mcp.example.com/postgres",command:"",is_active:true,created_at:new Date().toISOString()}];
export async function GET() {return Response.json(D);}
export async function POST(req: NextRequest) {const b=await req.json();return Response.json({id:Date.now().toString(),...b,is_active:true,created_at:new Date().toISOString()},{status:201});}
export async function PATCH() {return Response.json({message:"Updated"});}
export async function DELETE(req: NextRequest) {return Response.json({message:"Deleted "+new URL(req.url).searchParams.get("id")});}
