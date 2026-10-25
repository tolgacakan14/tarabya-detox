import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { parseWorkout } from "@/lib/workouts-server";

export const maxDuration = 30;

export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Giriş yapılmadı" }, { status: 401 });
  const { text } = (await req.json().catch(() => ({}))) as { text?: string };
  if (!text?.trim()) return NextResponse.json({ error: "Ne yaptığını yaz" }, { status: 400 });
  return NextResponse.json(await parseWorkout(text.slice(0, 600)));
}
