import { NextResponse } from "next/server";
import { clearSession, getSession, isUser, setSession } from "@/lib/session";
import { add, list, remove, setDaily, update, type UserId } from "@/lib/store";
import { getProfile, saveProfile, type Todo, type WorkoutLog } from "@/lib/state";
import { clampTargetWeight, type FoodEntry } from "@/lib/engine";
import { nowTime, today } from "@/lib/dates";
import { PARTNER, type Profile } from "@/lib/profiles";
import { FOODS } from "@/lib/foods";


type Body = Record<string, unknown> & { action: string };

const num = (v: unknown, min: number, max: number) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) throw new Error("Geçersiz değer");
  return n;
};

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  try {
    if (body.action === "login") {
      if (!isUser(body.user)) return NextResponse.json({ error: "Profil seç" }, { status: 400 });
      // No PINs: the link is shared by just the two of us.
      await getProfile(body.user);
      await setSession(body.user);
      return NextResponse.json({ ok: true });
    }
    if (body.action === "logout") {
      await clearSession();
      return NextResponse.json({ ok: true });
    }

    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Giriş yapılmadı" }, { status: 401 });
    const d = today();
    await act(user, d, body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

async function act(user: UserId, d: string, b: Body) {
  switch (b.action) {
    case "addFood": {
      const e = b.entry as FoodEntry;
      let entry: FoodEntry;
      if (b.foodId) {
        const f = FOODS.find((x) => x.id === b.foodId);
        if (!f) throw new Error("Yemek bulunamadı");
        const q = num(b.qty ?? 1, 0.25, 10);
        entry = {
          name: f.name,
          amount: q === 1 ? f.portion : `${q} × ${f.portion}`,
          kcal: Math.round(f.kcal * q),
          protein: Math.round(f.protein * q * 10) / 10,
          carbs: Math.round(f.carbs * q * 10) / 10,
          fat: Math.round(f.fat * q * 10) / 10,
          source: "list",
        };
      } else {
        entry = {
          name: String(e.name).slice(0, 80),
          amount: e.amount ? String(e.amount).slice(0, 60) : undefined,
          kcal: num(e.kcal, 0, 5000),
          protein: num(e.protein ?? 0, 0, 400),
          carbs: num(e.carbs ?? 0, 0, 800),
          fat: num(e.fat ?? 0, 0, 400),
          source: e.source ?? "quick",
        };
      }
      entry.meal = b.meal ? String(b.meal) : undefined;
      entry.planned = b.planned === true;
      entry.time = nowTime();
      await add(user, "food", d, entry);
      return;
    }
    case "delete": {
      await remove(user, String(b.id));
      return;
    }
    case "weight":
      await setDaily(user, "weight", d, { kg: num(b.kg, 30, 200) });
      return;
    case "steps":
      await setDaily(user, "steps", d, { steps: Math.round(num(b.steps, 0, 80000)) });
      return;
    case "sleep":
      await setDaily(user, "sleep", d, { hours: num(b.hours, 0, 16) });
      return;
    case "water": {
      const delta = Math.round(num(b.delta, -1, 4));
      if (delta > 0) await add(user, "water", d, { glasses: delta });
      else {
        const recs = await list<{ glasses: number }>(user, "water", d, d);
        const last = recs[recs.length - 1];
        if (last) await remove(user, last.id);
      }
      return;
    }
    case "workout": {
      const w = b.log as WorkoutLog;
      if (!["strength", "mini", "walk", "run"].includes(w.type)) throw new Error("Geçersiz antrenman");
      await add<WorkoutLog>(user, "workout", d, {
        type: w.type,
        session: w.session,
        minutes: w.minutes ? num(w.minutes, 1, 300) : undefined,
        withPartner: !!w.withPartner,
        exercises: (w.exercises ?? []).slice(0, 12).map((e) => ({
          id: String(e.id),
          level: Math.round(num(e.level, 0, 10)),
          sets: e.sets.slice(0, 6).map((s) => Math.round(num(s || 0, 0, 200))),
        })),
      });
      return;
    }
    case "addTodo":
      await add<Todo>(user, "todo", d, { text: String(b.text).slice(0, 120), done: false, from: "me" });
      return;
    case "toggleTodo": {
      const recs = await list<Todo>(user, "todo", String(b.date ?? d), String(b.date ?? d));
      const r = recs.find((x) => x.id === b.id);
      if (r) await update(user, r.id, { ...r.data, done: !r.data.done });
      return;
    }
    case "measure": {
      const m: Record<string, number> = {};
      for (const k of ["waist", "arm", "chest", "thigh", "hip"]) if (b[k]) m[k] = num(b[k], 10, 200);
      await setDaily(user, "measure", d, m);
      return;
    }
    case "flag":
      await add(user, "flag", d, { type: String(b.type).slice(0, 60) });
      return;
    case "react": {
      const type = String(b.type);
      if (!["highfive", "cheer", "walk", "proud"].includes(type)) throw new Error("Geçersiz tepki");
      const partner = PARTNER[user];
      const sentToday = (await list<{ from: string }>(partner, "reaction", d, d)).filter((r) => r.data.from === user);
      if (type === "walk" && sentToday.some((r) => (r.data as { type?: string }).type === "walk")) throw new Error("Yürüyüş davetini bugün zaten gönderdin");
      if (sentToday.length >= 10) throw new Error("Bugünlük yeter, yarın yine gönderebilirsin");
      await add(partner, "reaction", d, { from: user, type, text: b.text ? String(b.text).slice(0, 80) : undefined });
      return;
    }
    case "profile": {
      const { profile } = await getProfile(user);
      const patch = b.patch as Partial<Profile>;
      const next: Profile = { ...profile };
      if (patch.age !== undefined) next.age = num(patch.age, 14, 80);
      if (patch.heightCm !== undefined) next.heightCm = num(patch.heightCm, 120, 220);
      if (patch.startWeight !== undefined) next.startWeight = num(patch.startWeight, 30, 200);
      if (patch.targetWeight !== undefined) {
        const r = clampTargetWeight(next, num(patch.targetWeight, 30, 200));
        next.targetWeight = r.value;
      }
      if (patch.stepBaseline !== undefined) next.stepBaseline = num(patch.stepBaseline, 500, 30000);
      for (const k of ["likes", "dislikes", "why", "equipment"] as const) if (typeof patch[k] === "string") next[k] = String(patch[k]).slice(0, 300);
      if (Array.isArray(patch.ifThen)) next.ifThen = patch.ifThen.map(String).filter(Boolean).slice(0, 6);
      if (typeof patch.cycleTracking === "boolean") next.cycleTracking = patch.cycleTracking;
      if (typeof patch.onboarded === "boolean") next.onboarded = patch.onboarded;
      await saveProfile(user, next);
      if (patch.startWeight !== undefined && !(await list(user, "weight", d, d)).length) {
        await setDaily(user, "weight", d, { kg: next.startWeight });
      }
      return;
    }
    default:
      throw new Error("Bilinmeyen işlem");
  }
}
