import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { list } from "@/lib/store";
import { userToday } from "@/lib/state";
import { addDays } from "@/lib/dates";
import { validDate } from "@/lib/validate";
import type { FoodEntry } from "@/lib/engine";

// One past day of your own logs: what you ate, drank, weighed and trained.
export async function GET(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Giriş yapılmadı" }, { status: 401 });
  const today = await userToday(user);
  let date: string;
  try {
    date = validDate(new URL(req.url).searchParams.get("date"), addDays(today, -365), today);
  } catch {
    return NextResponse.json({ error: "Geçersiz tarih" }, { status: 400 });
  }
  const [foods, water, weight, workouts] = await Promise.all([
    list<FoodEntry>(user, "food", date, date),
    list<{ glasses: number }>(user, "water", date, date),
    list<{ kg: number }>(user, "weight", date, date),
    list<Record<string, unknown>>(user, "workout", date, date),
  ]);
  return NextResponse.json({
    date,
    foods: foods.map((f) => ({ id: f.id, ...f.data })),
    water: water.reduce((a, w) => a + (w.data.glasses || 0), 0),
    weight: weight[0]?.data.kg,
    workouts: workouts.length,
  });
}
