import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { chat, history, hasAI } from "@/lib/coach";

export const maxDuration = 60;

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Giriş yapılmadı" }, { status: 401 });
  return NextResponse.json({ messages: await history(user), ai: hasAI() });
}

export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Giriş yapılmadı" }, { status: 401 });
  const { message } = (await req.json()) as { message?: string };
  if (!message || !message.trim()) return NextResponse.json({ error: "Mesaj boş" }, { status: 400 });
  try {
    const r = await chat(user, message.trim().slice(0, 2000));
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: "Koç şu an cevap veremedi: " + (e as Error).message }, { status: 500 });
  }
}
