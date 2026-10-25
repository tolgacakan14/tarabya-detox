import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { estimateFood } from "@/lib/coach";

export const maxDuration = 30;

export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Giriş yapılmadı" }, { status: 401 });
  const { text } = (await req.json()) as { text?: string };
  if (!text?.trim()) return NextResponse.json({ error: "Ne yediğini yaz" }, { status: 400 });
  try {
    return NextResponse.json({ items: await estimateFood(text.slice(0, 600)) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
