import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { restoreOld } from "@/lib/restore";

export const maxDuration = 60;

// Manual "bring the old records back now" (also runs by itself once a day from /api/state).
export async function POST() {
  if (!(await getSession())) return NextResponse.json({ error: "Giriş yapılmadı" }, { status: 401 });
  return NextResponse.json(await restoreOld(true));
}
