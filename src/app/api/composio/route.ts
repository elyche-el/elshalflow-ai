import { fetchApps,createConnection,getConnections,deleteConnection } from "@/lib/composio-real";import type { NextRequest } from "next/server";
export async function GET(req:NextRequest){if(req.nextUrl.searchParams.get("type")==="connected")return Response.json(await getConnections());return Response.json(await fetchApps())}
export async function POST(req:NextRequest){const{app_name}=await req.json();return Response.json(await createConnection("default",app_name),{status:201})}
export async function DELETE(req:NextRequest){const{connectionId}=await req.json();await deleteConnection(connectionId);return Response.json({message:"OK"})}
