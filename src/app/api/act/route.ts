import { NextResponse } from "next/server";
import { clearSession, getSession, isUser, setSession } from "@/lib/session";
import { add, list, remove, setDaily, update, type UserId } from "@/lib/store";
import { getProfile, saveProfile, type Todo, type WorkoutLog } from "@/lib/state";
import { clampTargetWeight, type FoodEntry } from "@/lib/engine";
import { addDays, nowTime, today } from "@/lib/dates";
import { SYMPTOMS } from "@/lib/cycle";
import { logCustomWorkout, sanitizeActivities } from "@/lib/workouts-server";
import { PARTNER, type Profile } from "@/lib/profiles";
import { FOODS } from "@/lib/foods";
import { boundedNumber, validDate, validFood } from "@/lib/validate";


type Body = Record<string, unknown> & { action: string };

const num = boundedNumber;

export async function POST(req: Request) {
  try {
    if (Number(req.headers.get("content-length") ?? 0) > 64_000) throw new Error("İstek çok büyük");
    const body = (await req.json().catch(() => null)) as Body | null;
    if (!body || typeof body !== "object" || typeof body.action !== "string") throw new Error("Geçersiz istek");
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
    const msg = (e as Error).message;
    // don't leak JS internals ("Cannot read properties of undefined…")
    return NextResponse.json({ error: e instanceof TypeError ? "Geçersiz istek" : msg }, { status: 400 });
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
        const v = validFood(e);
        entry = { name: v.name, amount: v.amount, kcal: Math.round(v.kcal), protein: v.protein, carbs: v.carbs, fat: v.fat, source: (v.source as FoodEntry["source"]) ?? "quick" };
      }
      entry.meal = b.meal ? String(b.meal).slice(0, 40) : undefined;
      entry.planned = b.planned === true;
      entry.time = nowTime();
      await add(user, "food", d, entry);
      return;
    }
    case "delete": {
      const id = String(b.id);
      // only things the UI lets you delete (never profile or cycle history by accident)
      const own = await Promise.all((["food", "water", "workout", "todo"] as const).map((k) => list(user, k, addDays(d, -400), d)));
      if (!own.flat().some((r) => r.id === id)) throw new Error("Silinecek kayıt bulunamadı");
      await remove(user, id);
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
      const delta = num(b.delta, -1, 4);
      if (!Number.isInteger(delta) || delta === 0) throw new Error("Geçersiz değer");
      if (delta > 0) await add(user, "water", d, { glasses: delta });
      else {
        const recs = await list<{ glasses: number }>(user, "water", d, d);
        const last = recs[recs.length - 1];
        if (last) await remove(user, last.id);
      }
      return;
    }
    case "customWorkout": {
      await logCustomWorkout(user, sanitizeActivities(b.activities), b.desc ? String(b.desc) : undefined, !!b.withPartner);
      return;
    }
    case "workout": {
      const w = b.log as WorkoutLog;
      if (!w || typeof w !== "object" || !["strength", "mini", "walk", "run"].includes(w.type)) throw new Error("Geçersiz antrenman");
      const minsToday = (await list<WorkoutLog>(user, "workout", d, d)).reduce((t, r) => t + (r.data.minutes ?? 0), 0);
      if (w.minutes && minsToday + Number(w.minutes) > 360) throw new Error("Bugün için çok fazla dakika, bir yazım hatası olabilir mi?");
      await add<WorkoutLog>(user, "workout", d, {
        type: w.type,
        session: w.session ? String(w.session).slice(0, 4) : undefined,
        minutes: w.minutes ? num(w.minutes, 1, 300) : undefined,
        withPartner: !!w.withPartner,
        exercises: (w.exercises ?? []).slice(0, 12).map((e) => ({
          id: String(e.id),
          level: Math.round(num(e.level, 0, 10)),
          sets: (Array.isArray(e.sets) ? e.sets : []).slice(0, 6).map((s) => Math.round(num(s || 0, 0, 200))),
        })),
      });
      return;
    }
    case "addTodo": {
      const text = typeof b.text === "string" ? b.text.trim().slice(0, 120) : "";
      if (!text) throw new Error("Bir şey yaz");
      if ((await list(user, "todo", d, d)).length >= 10) throw new Error("Bugün için 10 görev yeter");
      await add<Todo>(user, "todo", d, { text, done: false, from: "me" });
      return;
    }
    case "toggleTodo": {
      const recs = await list<Todo>(user, "todo", String(b.date ?? d), String(b.date ?? d));
      const r = recs.find((x) => x.id === b.id);
      if (r) await update(user, r.id, { ...r.data, done: !r.data.done });
      return;
    }
    case "measure": {
      const m: Record<string, number> = {};
      for (const k of ["waist", "arm", "chest", "underbust", "thigh", "hip"]) if (b[k]) m[k] = num(b[k], 10, 200);
      if (!Object.keys(m).length) throw new Error("En az bir ölçü gir");
      // merge with anything already measured today instead of overwriting it
      const prev = (await list<Record<string, number>>(user, "measure", d, d))[0]?.data ?? {};
      await setDaily(user, "measure", d, { ...prev, ...m });
      return;
    }
    case "foodPref": {
      const id = String(b.foodId);
      if (!FOODS.some((f) => f.id === id)) throw new Error("Yemek bulunamadı");
      const v = b.value === null ? null : Number(b.value);
      if (v !== null && ![2, 1, -1].includes(v)) throw new Error("Geçersiz tercih");
      const { profile } = await getProfile(user);
      const prefs = { ...(profile.foodPrefs ?? {}) };
      if (v === null) delete prefs[id];
      else prefs[id] = v;
      await saveProfile(user, { ...profile, foodPrefs: prefs });
      return;
    }
    case "addFoods": {
      // one-tap relog of several entries (favourites / yesterday's meal)
      const entries = (Array.isArray(b.entries) ? b.entries : []).slice(0, 12) as FoodEntry[];
      const valid = entries.map(validFood); // validate all before writing any
      for (const v of valid) {
        await add<FoodEntry>(user, "food", d, {
          name: v.name,
          amount: v.amount,
          kcal: Math.round(v.kcal),
          protein: v.protein,
          carbs: v.carbs,
          fat: v.fat,
          meal: v.meal,
          planned: b.planned === true,
          time: nowTime(),
          source: (["ai", "photo", "quick", "coach", "list", "estimate"].includes(v.source ?? "") ? v.source : "quick") as FoodEntry["source"],
        });
      }
      return;
    }
    case "flag":
      await add(user, "flag", d, { type: String(b.type).slice(0, 60) });
      return;
    case "cycle": {
      const { profile } = await getProfile(user);
      if (profile.sex !== "f") throw new Error("Döngü takibi bu profilde yok");
      const date = b.date === undefined ? d : validDate(b.date, addDays(d, -200), d);
      const prev = (await list<Record<string, unknown>>(user, "cycle", date, date))[0]?.data ?? {};
      const next: Record<string, unknown> = { ...prev };
      if (b.start !== undefined) next.start = !!b.start;
      if (b.end !== undefined) next.end = !!b.end;
      if (b.flow !== undefined) next.flow = b.flow === null ? undefined : Math.round(num(b.flow, 1, 3));
      if (b.energy !== undefined) next.energy = b.energy === null ? undefined : Math.round(num(b.energy, 1, 5));
      if (Array.isArray(b.symptoms)) next.symptoms = (b.symptoms as unknown[]).map(String).filter((x) => SYMPTOMS.some((s) => s.id === x)).slice(0, 10);
      await setDaily(user, "cycle", date, next);
      return;
    }
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
      if (!patch || typeof patch !== "object") throw new Error("Geçersiz istek");
      const next: Profile = { ...profile };
      if (patch.age !== undefined) next.age = num(patch.age, 14, 80);
      if (patch.heightCm !== undefined) next.heightCm = num(patch.heightCm, 120, 220);
      if (patch.startWeight !== undefined) next.startWeight = num(patch.startWeight, 30, 200);
      // always re-clamp: a height/age change can push an old target under BMI 18.5
      let tw = patch.targetWeight !== undefined ? num(patch.targetWeight, 30, 200) : next.targetWeight;
      if (next.goal === "gain" && tw <= next.startWeight) throw new Error("Kilo alma hedefi şu anki kilondan yüksek olmalı");
      if (next.goal === "lose" && tw >= next.startWeight + 0.1 && patch.targetWeight !== undefined) throw new Error("Kilo verme hedefi şu anki kilondan düşük olmalı");
      tw = clampTargetWeight(next, tw).value;
      next.targetWeight = tw;
      if (patch.stepBaseline !== undefined) next.stepBaseline = num(patch.stepBaseline, 500, 30000);
      for (const k of ["likes", "dislikes", "why", "equipment"] as const) if (typeof patch[k] === "string") next[k] = String(patch[k]).slice(0, 300);
      if (Array.isArray(patch.ifThen)) next.ifThen = patch.ifThen.map((x) => String(x).slice(0, 120)).filter(Boolean).slice(0, 6);
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
