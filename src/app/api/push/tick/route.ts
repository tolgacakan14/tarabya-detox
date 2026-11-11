import { NextResponse } from "next/server";
import { tickAllThrottled, tickUser } from "@/lib/push";

export const maxDuration = 30;

// Called every ~15 min by the scheduler (GitHub Actions). Safe to call any time: it only sends a
// reminder when it is due, once per type per day, max 2 a day, never at night.
// The free database sleeps when nobody touches it and its monthly compute is limited, so the scheduler
// (every 5 min) may only wake it inside reminder windows, once per half hour. Pure clock math, no DB.
const WINDOWS: [number, number][] = [
  [8 * 60 + 30, 10 * 60 + 30], // morning weigh-in (Eylül)
  [11 * 60 + 30, 17 * 60 + 30], // Tolga's weigh-in, both meal reminders
  [23 * 60 + 30, 24 * 60], // day end
  [0, 3 * 60],
];
function worthWaking(now = new Date()) {
  const [h, m] = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now).split(":").map(Number);
  const mins = h * 60 + m;
  return mins % 30 < 5 && WINDOWS.some(([a, b]) => mins >= a && mins < b);
}

export async function GET(req: Request) {
  // the scheduler uses the throttled path; ?force=1 is only for checking by hand
  if (!new URL(req.url).searchParams.has("force")) {
    if (!worthWaking()) return NextResponse.json({ ok: true, ran: false, sleeping: true });
    return NextResponse.json({ ok: true, ran: await tickAllThrottled() });
  }
  const out: Record<string, string[]> = {};
  const why: Record<string, string[]> = { tolga: [], eylul: [] };
  for (const u of ["tolga", "eylul"] as const) {
    try {
      out[u] = await tickUser(u, why[u]);
    } catch (e) {
      console.error("tick", u, (e as Error).message);
      out[u] = [];
    }
  }
  return NextResponse.json({ ok: true, sent: out, why });
}
