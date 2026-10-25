import { NextResponse } from "next/server";
import { tickUser } from "@/lib/push";

export const maxDuration = 30;

// Called every ~15 min by the scheduler (GitHub Actions). Safe to call any time: it only sends a
// reminder when it is due, once per type per day, max 2 a day, never at night.
export async function GET() {
  const out: Record<string, string[]> = {};
  for (const u of ["tolga", "eylul"] as const) {
    try {
      out[u] = await tickUser(u);
    } catch (e) {
      console.error("tick", u, (e as Error).message);
      out[u] = [];
    }
  }
  return NextResponse.json({ ok: true, sent: out });
}
