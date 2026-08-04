import { fetchModels } from "@/lib/openrouter";import type { NextRequest } from "next/server";
export async function GET(req:NextRequest){const key=req.nextUrl.searchParams.get("key")||req.headers.get("x-api-key")||process.env.OPENROUTER_API_KEY||"";return Response.json(await fetchModels(key))}
