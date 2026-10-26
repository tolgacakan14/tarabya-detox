import { NextResponse } from "next/server";
import { clearSession, getSession, isUser, setSession } from "@/lib/session";
import { add, list, remove, setDaily, update, type UserId } from "@/lib/store";
import { getProfile, saveProfile, startNewDay, userToday, type Todo, type WorkoutLog } from "@/lib/state";
import { clampTargetWeight, type FoodEntry } from "@/lib/engine";
import { addDays, nowTime, today } from "@/lib/dates";
import { QUEST_IDS, SYMPTOMS } from "@/lib/cycle";
import { logCustomWorkout, sanitizeActivities } from "@/lib/workouts-server";
import { PARTNER, type Profile } from "@/lib/profiles";
import { FOODS } from "@/lib/foods";
import { sendTo } from "@/lib/push";
import { EXERCISES as OLD_EXERCISES } from "@/lib/programs";
import { BENCHMARKS, LADDERS, PLANS, netKcal, type Effort } from "@/lib/training";
import { boundedNumber, validDate, validFood } from "@/lib/validate";


type Body = Record<string, unknown> & { action: string };

const num = boundedNumber;

export async function POST(req: Request) {
  try {
    if (Number(req.headers.get("content-length") ?? 0) > 450_000) throw new Error("İstek çok büyük");
    const rawText = await req.text();
    if (rawText.length > 450_000) throw new Error("İstek çok büyük");
    const body = (() => {
      try {
        return JSON.parse(rawText);
      } catch {
        return null;
      }
    })() as Body | null;
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
    const d = await userToday(user);
    await act(user, d, body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = (e as Error).message;
    // don't leak JS internals ("Cannot read properties of undefined…")
    return NextResponse.json({ error: e instanceof TypeError ? "Geçersiz istek" : msg }, { status: 400 });
  }
}

/** Guided program session: validate against the program, compute burn on the server. */
async function cleanV2(user: UserId, v: unknown, minutes?: number): Promise<Partial<WorkoutLog>> {
  const o = (v ?? {}) as Record<string, unknown>;
  const tpl = PLANS[user].templates.find((t) => t.id === o.template);
  if (!tpl) throw new Error("Geçersiz antrenman");
  const allowed = new Set(tpl.slots.map((sl) => sl.ladder));
  const items = (Array.isArray(o.items) ? o.items : []).slice(0, 12).flatMap((x) => {
    const it = x as Record<string, unknown>;
    const ladder = LADDERS[String(it.ladder)];
    if (!ladder || !allowed.has(ladder.id)) return [];
    const step = Math.round(num(it.step, 0, ladder.steps.length - 1));
    const sets = (Array.isArray(it.sets) ? it.sets : []).slice(0, 8).map((s) => Math.round(num(s || 0, 0, 600)));
    const effort = ["easy", "right", "hard"].includes(String(it.effort)) ? (it.effort as Effort) : undefined;
    return [{ ladder: ladder.id, step, sets, effort }];
  });
  if (!items.some((i) => i.sets.some((x) => x > 0))) throw new Error("En az bir set kaydet");
  const t = await userToday(user);
  const weights = await list<{ kg: number }>(user, "weight", addDays(t, -60), t);
  const kg = weights[weights.length - 1]?.data.kg ?? (await getProfile(user)).profile.startWeight;
  const mins = minutes ? Math.min(180, Math.max(1, Number(minutes) || 30)) : 30;
  return {
    v2: { template: tpl.id, week: Math.round(num(o.week ?? 1, 1, 12)), items, prs: Math.round(num(o.prs ?? 0, 0, 30)), readiness: o.readiness === "light" ? "light" : "normal" },
    session: tpl.id,
    kcal: netKcal(tpl.met, kg, mins),
  };
}

/** A love note to the partner's phone, at most 3 partner notifications a day. */
async function notifyPartner(user: UserId, body: string) {
  try {
    const partner = PARTNER[user];
    const { profile: pp } = await getProfile(partner);
    if (pp.reminders?.partner === false) return;
    const sentP = (await list<{ type: string }>(partner, "notif", today(), today())).filter((x) => x.data.type === "partner").length;
    if (sentP >= 3) return;
    await sendTo(partner, { title: "İkimiz 💛", body, url: "/app", tag: "partner" }, "partner");
  } catch {
    /* best-effort */
  }
}

/** Foods can be added to the last 7 days ("dün gece yediğimi unuttum"). */
const pastDay = (v: unknown, d: string) => (v === undefined || v === null || v === "" ? d : validDate(v, addDays(d, -7), d));

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
      const fd0 = pastDay(b.date, d);
      entry.time = fd0 === d ? nowTime() : undefined; // a past day's time is unknown
      await add(user, "food", fd0, entry);
      return;
    }
    case "delete": {
      const id = String(b.id);
      // only things the UI lets you delete (never profile or cycle history by accident)
      const own = await Promise.all((["food", "water", "workout", "todo", "weight"] as const).map((k) => list(user, k, addDays(d, -400), d)));
      if (!own.flat().some((r) => r.id === id)) throw new Error("Silinecek kayıt bulunamadı");
      await remove(user, id);
      return;
    }
    case "aiFeedback": {
      const ratio = num(b.ratio, 0.3, 3);
      const { profile } = await getProfile(user);
      const n = (profile.aiFactorN ?? 0) + 1;
      const prev = profile.aiFactor ?? 1;
      const f = Math.min(1.5, Math.max(0.8, prev + (Math.min(1.6, Math.max(0.6, ratio)) - prev) * (n < 5 ? 1 / n : 0.2)));
      await saveProfile(user, { ...profile, aiFactor: Math.round(f * 100) / 100, aiFactorN: n });
      return;
    }
    case "benchmark": {
      const bm = BENCHMARKS.find((x) => x.id === b.id && x.users.includes(user));
      if (!bm) throw new Error("Geçersiz test");
      const v = Math.round(num(b.value, 0, bm.unit === "meters" ? 5000 : 1000));
      const prev = (await list<Record<string, number>>(user, "bench", d, d))[0]?.data ?? {};
      await setDaily(user, "bench", d, { ...prev, [bm.id]: v });
      return;
    }
    case "logPlanned": {
      // a whole planned meal in one request (no half-saved meals, no double taps)
      const its = (Array.isArray(b.items) ? b.items : []).slice(0, 10) as { foodId?: unknown; qty?: unknown }[];
      const entries = its.map((it) => {
        const f = FOODS.find((x) => x.id === it.foodId);
        if (!f) throw new Error("Yemek bulunamadı");
        const q = num(it.qty ?? 1, 0.25, 10);
        return { name: f.name, amount: q === 1 ? f.portion : `${q} × ${f.portion}`, kcal: Math.round(f.kcal * q), protein: Math.round(f.protein * q * 10) / 10, carbs: Math.round(f.carbs * q * 10) / 10, fat: Math.round(f.fat * q * 10) / 10 };
      });
      if (!entries.length) throw new Error("Boş öğün");
      const meal = typeof b.meal === "string" ? b.meal.slice(0, 40) : undefined;
      for (const e of entries) await add<FoodEntry>(user, "food", d, { ...e, meal, planned: true, time: nowTime(), source: "list" });
      return;
    }
    case "logPreset": {
      const { profile } = await getProfile(user);
      const pr = (profile.presets ?? []).find((x) => x.id === b.id);
      if (!pr) throw new Error("Menü bulunamadı");
      const fd = pastDay(b.date, d);
      for (const it of pr.items) {
        const v = validFood({ ...it, meal: pr.meal });
        await add<FoodEntry>(user, "food", fd, { name: v.name, amount: v.amount, kcal: Math.round(v.kcal), protein: v.protein, carbs: v.carbs, fat: v.fat, meal: typeof b.meal === "string" ? b.meal.slice(0, 40) : pr.meal, planned: false, time: fd === d ? nowTime() : undefined, source: "quick" });
      }
      return;
    }
    case "savePreset": {
      const { profile } = await getProfile(user);
      const items = (Array.isArray(b.items) ? b.items : []).slice(0, 15).map((x) => {
        const v = validFood(x);
        return { name: v.name, amount: v.amount ?? "", kcal: Math.round(v.kcal), protein: v.protein, carbs: v.carbs, fat: v.fat };
      });
      if (!items.length) throw new Error("Menü boş olamaz");
      const name = typeof b.name === "string" && b.name.trim() ? b.name.trim().slice(0, 40) : "Menüm";
      const presets = (profile.presets ?? []).slice(0, 11);
      const id = `p${Date.now().toString(36)}`;
      presets.push({ id, name, emoji: typeof b.emoji === "string" ? [...b.emoji].slice(0, 2).join("") : "⭐", meal: typeof b.meal === "string" ? b.meal.slice(0, 40) : "kahvaltı", items });
      await saveProfile(user, { ...profile, presets });
      return;
    }
    case "deletePreset": {
      const { profile } = await getProfile(user);
      await saveProfile(user, { ...profile, presets: (profile.presets ?? []).filter((x) => x.id !== b.id) });
      return;
    }
    case "newDay": {
      await startNewDay(user);
      return;
    }
    case "reminders": {
      const { profile } = await getProfile(user);
      const cur = profile.reminders ?? {};
      const t = (v: unknown) => (v === null ? null : typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : undefined);
      const next = { ...cur } as NonNullable<typeof profile.reminders>;
      if (b.weigh !== undefined && t(b.weigh) !== undefined) next.weigh = t(b.weigh);
      if (b.dayEnd !== undefined && t(b.dayEnd) !== undefined) next.dayEnd = t(b.dayEnd);
      if (typeof b.meal === "boolean") next.meal = b.meal;
      if (typeof b.partner === "boolean") next.partner = b.partner;
      await saveProfile(user, { ...profile, reminders: next });
      return;
    }
    case "dayMode": {
      const { profile } = await getProfile(user);
      if (b.mode !== "manual" && b.mode !== "calendar") throw new Error("Geçersiz değer");
      if (b.mode === "calendar" && d > today()) throw new Error("Şu an yarının günündesin; kayıtlar kaybolmasın diye bunu yarın değiştirebilirsin.");
      await saveProfile(user, { ...profile, dayMode: b.mode, activeDate: b.mode === "calendar" ? undefined : d });
      return;
    }
    case "avatar": {
      // a small square JPEG cropped on the phone; served from /api/avatar/[user]
      const img = typeof b.image === "string" ? b.image : "";
      if (!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(img) || img.length > 400_000) throw new Error("Fotoğraf okunamadı");
      // must really be a JPEG (magic bytes), not something labelled as one
      if (!Buffer.from(img.split(",")[1].slice(0, 8), "base64").subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) throw new Error("Fotoğraf okunamadı");
      await setDaily(user, "avatar", "0000-00-00", { img, v: Date.now() });
      return;
    }
    case "avatarRemove": {
      const recs = await list(user, "avatar", "0000-00-00", "0000-00-00");
      for (const r of recs) await remove(user, r.id);
      return;
    }
    case "weight": {
      // a past morning can be filled in or corrected (last 30 days)
      const date = b.date === undefined ? d : validDate(b.date, addDays(d, -30), d);
      // a weight typed in later for a past morning counts for the trend, not for points
      const had = (await list<{ late?: boolean }>(user, "weight", date, date))[0];
      const late = date !== d && (!had || !!had.data.late); // correcting an on-time weigh-in keeps its points
      await setDaily(user, "weight", date, { kg: Math.round(num(b.kg, 30, 200) * 10) / 10, ...(late ? { late: true } : {}) });
      return;
    }
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
        exercises: (Array.isArray(w.exercises) ? w.exercises : []).filter((e) => e && Object.hasOwn(OLD_EXERCISES, String(e.id))).slice(0, 12).map((e) => ({
          id: String(e.id),
          level: Math.round(num(e.level, 0, 10)),
          sets: (Array.isArray(e.sets) ? e.sets : []).slice(0, 6).map((s) => Math.round(num(s || 0, 0, 200))),
        })),
        ...(w.type === "strength" && w.v2 ? await cleanV2(user, w.v2, w.minutes) : {}),
      });
      if (w.type !== "mini") {
        const from = user === "tolga" ? "Tolga" : "Eylül";
        await notifyPartner(user, w.type === "strength" ? `${from} antrenmanını bitirdi 💪 Ona bir beşlik çak, çok sevinir 💛` : `${from} ${w.minutes ?? ""} dk ${w.type === "run" ? "koştu" : "yürüdü"} 🌊 Gururlanma zamanı 💞`);
      }
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
      const recs = await list<Todo>(user, "todo", d, d);
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
      const fd = pastDay(b.date, d);
      for (const v of valid) {
        await add<FoodEntry>(user, "food", fd, {
          name: v.name,
          amount: v.amount,
          kcal: Math.round(v.kcal),
          protein: v.protein,
          carbs: v.carbs,
          fat: v.fat,
          meal: v.meal,
          planned: b.planned === true,
          time: fd === d ? nowTime() : undefined,
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
      if (Array.isArray(b.quests)) next.quests = (b.quests as unknown[]).map(String).filter((x) => QUEST_IDS.includes(x)).slice(0, 6);
      if (b.mood !== undefined) next.mood = b.mood === null || !["calm", "happy", "sad", "angry", "anxious", "tired"].includes(String(b.mood)) ? undefined : String(b.mood);
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
      // tell the partner's phone (max 3 partner pushes a day)
      try {
        const { profile: pp } = await getProfile(partner);
        const sentP = (await list<{ type: string }>(partner, "notif", today(), today())).filter((x) => x.data.type === "partner").length;
        if (sentP < 3 && pp.reminders?.partner !== false) {
          const from = user === "tolga" ? "Tolga" : "Eylül";
          const body = { highfive: `${from} sana beşlik çaktı 🙌 Bugün de yanındayım diyor 💛`, cheer: `${from} sana tezahürat yapıyor 📣 Sen yaparsın!`, proud: `${from} seninle çok gurur duyuyor 💛`, walk: `${from} seni sahile, el ele bir yürüyüşe çağırıyor 🌊💞` }[type] ?? `${from} sana bir şey gönderdi 💛`;
          await sendTo(partner, { title: "İkimiz", body, url: "/app", tag: "partner" }, "partner");
        }
      } catch {
        /* push is best-effort */
      }
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
      if (patch.intensity === "standard" || patch.intensity === "intense") next.intensity = patch.intensity;
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
