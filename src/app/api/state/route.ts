import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { buildState } from "@/lib/state";


export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Giriş yapılmadı" }, { status: 401 });
  return NextResponse.json(await buildState(user));
}
