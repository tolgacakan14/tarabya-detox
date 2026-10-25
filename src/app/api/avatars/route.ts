import { NextResponse } from "next/server";
import { list } from "@/lib/store";

// Which profiles have a photo (version stamps), for screens without app state such as the profile picker.
export async function GET() {
  const out: Record<string, number | null> = {};
  for (const u of ["tolga", "eylul"] as const) out[u] = (await list<{ v: number }>(u, "avatar", "0000-00-00", "0000-00-00"))[0]?.data.v ?? null;
  return NextResponse.json(out, { headers: { "Cache-Control": "no-store" } });
}
