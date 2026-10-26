import { NextResponse, after } from "next/server";
import { getSession } from "@/lib/session";
import { buildState } from "@/lib/state";
import { tickAllThrottled } from "@/lib/push";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Giriş yapılmadı" }, { status: 401 });
  // whenever either of us opens the app, quietly check whether the other needs a reminder
  after(() => tickAllThrottled().catch(() => {}));
  return NextResponse.json(await buildState(user));
}
