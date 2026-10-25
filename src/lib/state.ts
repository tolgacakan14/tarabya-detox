// Assembles everything a user sees: targets, today's plan, tasks, points, scoreboard.
import { list, setDaily, type Rec, type UserId } from "./store";
import { defaultProfile, PARTNER, type Profile } from "./profiles";
import { runEngine, type EngineResult, type FoodEntry } from "./engine";
import { addDays, daysBetween, today as todayFn, weekStart } from "./dates";
import { SESSIONS, phaseFor, cardioFor, MINI, EXERCISES } from "./programs";
import { FOODS } from "./foods";
import { analyzeBody, type Measure } from "./body";
import { analyzeCycle, type CycleDay } from "./cycle";
import { eatBack, metFor, musclesFromLabel, workoutImpact, type Activity, type Muscle } from "./activity";

export interface WorkoutLog {
  type: "strength" | "mini" | "walk" | "run";
  session?: string;
  minutes?: number;
  withPartner?: boolean;
  exercises?: { id: string; level: number; sets: number[] }[];
  // self-planned session described by the user
  custom?: boolean;
  desc?: string;
  activities?: Activity[];
  kcal?: number; // net kcal above rest, computed server-side
  muscles?: Partial<Record<Muscle, number>>;
}

export interface Todo {
  text: string;
  done: boolean;
  from?: "coach" | "me" | "partner";
}

import { WATER_TARGET } from "./state-constants";
export { WATER_TARGET };
const PROFILE_DATE = "0000-00-00";

export async function getProfile(user: UserId): Promise<{ profile: Profile; id?: string }> {
  const recs = await list<Profile>(user, "profile", PROFILE_DATE, PROFILE_DATE);
  if (recs.length) return { profile: { ...defaultProfile(user, recs[0].data.startDate), ...recs[0].data }, id: recs[0].id };
  // Both partners share the same program start date
  const other = await list<Profile>(PARTNER[user], "profile", PROFILE_DATE, PROFILE_DATE);
  const start = other[0]?.data.startDate ?? todayFn();
  const p = defaultProfile(user, start);
  await setDaily(user, "profile", PROFILE_DATE, p);
  return { profile: p };
}

export async function saveProfile(user: UserId, p: Profile) {
  await setDaily(user, "profile", PROFILE_DATE, p);
}

interface Raw {
  profile: Profile;
  foods: Rec<FoodEntry>[];
  weights: Rec<{ kg: number }>[];
  steps: Rec<{ steps: number }>[];
  sleep: Rec<{ hours: number }>[];
  water: Rec<{ glasses: number }>[];
  workouts: Rec<WorkoutLog>[];
  todos: Rec<Todo>[];
  measures: Rec<Record<string, number>>[];
  flags: Rec<{ type: string }>[];
  cycle: Rec<Omit<CycleDay, "date">>[];
  reactionsSent: number; // count today
}

async function loadRaw(user: UserId): Promise<Raw> {
  const { profile } = await getProfile(user);
  const from = addDays(profile.startDate, -14);
  const [foods, weights, steps, sleep, water, workouts, todos, measures, flags, cycle] = await Promise.all([
    list<FoodEntry>(user, "food", from),
    list<{ kg: number }>(user, "weight", from),
    list<{ steps: number }>(user, "steps", from),
    list<{ hours: number }>(user, "sleep", from),
    list<{ glasses: number }>(user, "water", from),
    list<WorkoutLog>(user, "workout", from),
    list<Todo>(user, "todo", from),
    list<Record<string, number>>(user, "measure", from),
    list<{ type: string }>(user, "flag", from),
    profile.sex === "f" ? list<Omit<CycleDay, "date">>(user, "cycle", addDays(profile.startDate, -200)) : Promise.resolve([]),
  ]);
  return { profile, foods, weights, steps, sleep, water, workouts, todos, measures, flags, cycle, reactionsSent: 0 };
}

function sumBy<T>(arr: Rec<T>[], f: (d: T) => number, date: string) {
  return arr.filter((r) => r.date === date).reduce((a, r) => a + (f(r.data) || 0), 0);
}

function dailyVal<T>(arr: Rec<T>[], f: (d: T) => number, date: string): number | undefined {
  const r = arr.filter((x) => x.date === date);
  return r.length ? f(r[r.length - 1].data) : undefined;
}

export interface Task {
  id: string;
  label: string;
  hint?: string;
  done: boolean;
  points: number;
  earned: number;
}

export interface DayScore {
  date: string;
  tasks: Task[];
  points: number;
  completion: number; // 0..1
}

function engineFor(raw: Raw, date: string) {
  const weights = raw.weights.filter((w) => w.date <= date).map((w) => ({ date: w.date, weight: w.data.kg }));
  const intakeByDate: Record<string, number> = {};
  for (const f of raw.foods) if (f.date <= date) intakeByDate[f.date] = (intakeByDate[f.date] ?? 0) + f.data.kcal;
  const stepsByDate: Record<string, number> = {};
  for (const s of raw.steps) stepsByDate[s.date] = s.data.steps;
  const redFlags = raw.flags.filter((f) => f.date > addDays(date, -14) && f.date <= date).length;
  const body = bodyFor(raw, date);
  const waistTooFast = raw.profile.goal === "gain" && body.waistPerKg !== undefined && body.waistPerKg > 1;
  const cyc = cycleFor(raw, date);
  const extra = extraBurn(raw, date);
  const cycleStop = cyc.hasData && (cyc.day ?? 0) > 45 ? 1 : 0; // missed period while dieting → pause the deficit
  return runEngine(raw.profile, date, weights, intakeByDate, stepsByDate, redFlags + cycleStop, {
    waistTooFast,
    cycleKcalBonus: raw.profile.goal === "lose" ? cyc.kcalBonus : 0,
    cycleWaterWeight: cyc.waterWeightLikely,
    exerciseKcal: eatBack(raw.profile.goal, extra.kcal),
    exerciseBurn: extra.kcal,
  });
}

/** Energy burned on `date` by activity that the base TDEE doesn't already assume.
 * Planned strength sessions are inside the activity factor; cardio, sport and sessions beyond the weekly plan are extra. */
function extraBurn(raw: Raw, date: string) {
  const kg = [...raw.weights].reverse().find((w) => w.date <= date)?.data.kg ?? raw.profile.startWeight;
  const ws = weekStart(date);
  const plannedPerWeek = raw.profile.goal === "gain" ? 3 : 3;
  let kcal = 0;
  const strengthBefore = raw.workouts.filter((w) => w.data.type === "strength" && w.date >= ws && w.date < date).length;
  let strengthToday = 0;
  for (const w of raw.workouts.filter((x) => x.date === date)) {
    const d = w.data;
    if (d.custom && d.kcal) {
      if (d.type === "strength") {
        strengthToday++;
        if (strengthBefore + strengthToday > plannedPerWeek) kcal += d.kcal;
        else {
          // only the cardio part of a mixed session is extra
          const cardio = (d.activities ?? []).filter((a) => a.category !== "strength");
          kcal += cardio.reduce((t, a) => t + Math.max(0, metFor(a) - 1) * kg * (a.minutes / 60), 0);
        }
      } else kcal += d.kcal;
    } else if (d.type === "walk" || d.type === "run") {
      const met = d.type === "run" ? 9 : 4;
      kcal += (met - 1) * kg * ((d.minutes ?? 30) / 60);
    }
  }
  return { kcal: Math.round(kcal) };
}

function cycleFor(raw: Raw, date: string) {
  return analyzeCycle(raw.cycle.map((c) => ({ date: c.date, ...c.data })), date);
}

function bodyFor(raw: Raw, date: string) {
  const ms: Measure[] = raw.measures.filter((m) => m.date <= date).map((m) => ({ date: m.date, ...(m.data as Omit<Measure, "date">) }));
  const ws = raw.weights.filter((w) => w.date <= date);
  const current = ws.length ? ws[ws.length - 1].data.kg : raw.profile.startWeight;
  const firstDate = ms[0]?.date;
  const atFirst = firstDate ? [...ws].reverse().find((w) => w.date <= firstDate)?.data.kg ?? raw.profile.startWeight : undefined;
  // use a light 7-day mean so a single noisy weigh-in doesn't move the waist rule
  const recent = ws.slice(-7).map((w) => w.data.kg);
  const smooth = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : current;
  return analyzeBody(raw.profile, ms, smooth, atFirst);
}

function isTrainingDay(raw: Raw, eng: EngineResult, date: string) {
  const ws = weekStart(date);
  const strengthDates = raw.workouts.filter((w) => w.data.type === "strength").map((w) => w.date);
  if (strengthDates.includes(date)) return true;
  const doneThisWeek = new Set(strengthDates.filter((d) => d >= ws && d < date)).size;
  const left = eng.targets.sessionsPerWeek - doneThisWeek;
  if (left <= 0) return false;
  const yesterday = strengthDates.includes(addDays(date, -1));
  const daysLeft = 7 - daysBetween(ws, date); // including today
  if (yesterday && left < daysLeft) return false; // rest between sessions when possible
  return true;
}

function scoreDay(raw: Raw, eng: EngineResult, date: string, partnerWalks: Set<string>): DayScore {
  const p = raw.profile;
  const t = eng.targets;
  const foodsToday = raw.foods.filter((f) => f.date === date);
  const kcal = foodsToday.reduce((a, f) => a + f.data.kcal, 0);
  const protein = foodsToday.reduce((a, f) => a + f.data.protein, 0);
  const steps = dailyVal(raw.steps, (d) => d.steps, date) ?? 0;
  const water = sumBy(raw.water, (d) => d.glasses, date);
  const sleep = dailyVal(raw.sleep, (d) => d.hours, date);
  const weighed = raw.weights.some((w) => w.date === date);
  const wos = raw.workouts.filter((w) => w.date === date);
  const strength = wos.some((w) => w.data.type === "strength");
  const mini = wos.some((w) => w.data.type === "mini");
  const cardio = wos.find((w) => w.data.type === "walk" || w.data.type === "run");
  const training = isTrainingDay(raw, eng, date);

  const tasks: Task[] = [];
  const add = (id: string, label: string, done: boolean, points: number, earned?: number, hint?: string) =>
    tasks.push({ id, label, done, points, earned: earned ?? (done ? points : 0), hint });

  add("weigh", "Sabah tartıl", weighed, 10, undefined, "Tuvaletten sonra, kahvaltıdan önce");
  add("log", "Öğünlerini kaydet", foodsToday.length >= 3 || kcal >= t.kcal * 0.6, 10, undefined, "Plansız yediklerin dahil");
  add("protein", `Protein ${t.protein} g`, protein >= t.protein * 0.9, 20, Math.round(Math.min(1, protein / t.protein) * 20));
  if (p.goal === "gain") {
    add("kcal", `En az ${Math.round(t.kcal * 0.95)} kcal`, kcal >= t.kcal * 0.95, 20, Math.round(Math.min(1, kcal / t.kcal) * 20));
  } else {
    const inBand = kcal >= t.kcal * 0.85 && kcal <= t.kcal * 1.1 && kcal >= 1000;
    add("kcal", `Kalori ${Math.round(t.kcal * 0.85)}-${Math.round(t.kcal * 1.1)} arası`, inBand, 20);
  }
  add("water", `${WATER_TARGET} bardak su`, water >= WATER_TARGET, 40, Math.min(WATER_TARGET, water) * 5);
  add("steps", `${t.steps.toLocaleString("tr-TR")} adım`, steps >= t.steps, 20, Math.round(Math.min(1, steps / t.steps) * 20));
  if (training) add("workout", "Antrenman", strength, 40, strength ? 40 : mini ? 15 : 0, mini && !strength ? "Mini antrenman 15 puan" : undefined);
  else add("cardio", "Sahil yürüyüşü / hafif kardiyo", !!cardio || strength, 20);
  add("sleep", "7+ saat uyku", (sleep ?? 0) >= 7, 10);

  for (const td of raw.todos.filter((x) => x.date === date)) {
    add("todo:" + td.id, td.data.text, td.data.done, 10);
  }

  if (cardio?.data.withPartner && partnerWalks.has(date)) {
    tasks.push({ id: "together", label: "Birlikte yürüyüş bonusu", done: true, points: 20, earned: 20 });
  }

  const points = tasks.reduce((a, x) => a + x.earned, 0);
  const doneCount = tasks.filter((x) => x.done).length;
  return { date, tasks, points, completion: tasks.length ? doneCount / tasks.length : 0 };
}

/** Weekly body-progress bonus: points for moving toward YOUR goal at a healthy pace. */
function bodyBonus(raw: Raw, eng: EngineResult, ws: string): { points: number; label: string } {
  const we = addDays(ws, 6);
  const tr = eng.trend.filter((x) => x.date >= addDays(ws, -1) && x.date <= we);
  if (tr.length < 3) return { points: 0, label: "Bu hafta en az 3 tartı lazım" };
  const delta = tr[tr.length - 1].trend - tr[0].trend;
  const span = Math.max(3, daysBetween(tr[0].date, tr[tr.length - 1].date));
  const r = (delta / span) * 7;
  const w = eng.currentWeight;
  let pts = 0;
  if (raw.profile.goal === "gain") {
    if (r >= 0.1 && r <= 0.5) pts = 100;
    else if ((r >= 0.03 && r < 0.1) || (r > 0.5 && r <= 0.8)) pts = 50;
  } else if (eng.phase === "maintenance") {
    if (Math.abs(r) <= 0.25) pts = 100;
  } else {
    if (r <= -0.1 && r >= -0.007 * w) pts = 100;
    else if (r < -0.03 && r > -0.1) pts = 50;
  }
  const measured = raw.measures.some((m) => m.date >= ws && m.date <= we);
  const label = pts === 100 ? "Sağlıklı hızda hedefine doğru" : pts === 50 ? "Doğru yönde, yavaş" : "Bu hafta trend hedef bandında değil";
  return { points: pts + (measured ? 20 : 0), label };
}

export interface WeekSummary {
  weekStart: string;
  points: number;
  completion: number;
  body: { points: number; label: string } | null;
  perfect: boolean;
}

function summarize(raw: Raw, partnerWalks: Set<string>, today: string) {
  const days: DayScore[] = [];
  const start = raw.profile.startDate;
  for (let d = start; d <= today; d = addDays(d, 1)) {
    const eng = engineFor(raw, d);
    days.push(scoreDay(raw, eng, d, partnerWalks));
  }
  const weeks: WeekSummary[] = [];
  const engToday = engineFor(raw, today);
  for (let ws = weekStart(start); ws <= today; ws = addDays(ws, 7)) {
    const wd = days.filter((d) => d.date >= ws && d.date <= addDays(ws, 6));
    const done = wd.reduce((a, d) => a + d.tasks.filter((t) => t.done).length, 0);
    const total = wd.reduce((a, d) => a + d.tasks.length, 0);
    const completion = total ? done / total : 0;
    const finished = addDays(ws, 6) < today;
    const body = finished ? bodyBonus(raw, engToday, ws) : null;
    const perfect = finished && completion >= 0.85;
    weeks.push({
      weekStart: ws,
      points: wd.reduce((a, d) => a + d.points, 0) + (body?.points ?? 0) + (perfect ? 50 : 0),
      completion,
      body,
      perfect,
    });
  }
  // weekly streak (>=70%), one miss per 4 weeks auto-frozen
  let streak = 0;
  let freezes = 0;
  const finishedWeeks = weeks.filter((w) => addDays(w.weekStart, 6) < today);
  for (let i = finishedWeeks.length - 1; i >= 0; i--) {
    if (finishedWeeks[i].completion >= 0.7) streak++;
    else if (freezes === 0 && finishedWeeks[i].completion >= 0.4) {
      freezes++;
      streak++;
    } else break;
  }
  return { days, weeks, streak, freezesUsed: freezes, total: weeks.reduce((a, w) => a + w.points, 0) };
}

export const LEVELS = [
  { min: 0, name: "Çaylak" },
  { min: 500, name: "Isınan" },
  { min: 1500, name: "Düzenli" },
  { min: 3500, name: "Kararlı" },
  { min: 7000, name: "Sahil efsanesi" },
  { min: 12000, name: "Boğaz'ın hakimi" },
];

export function levelFor(points: number) {
  let i = 0;
  for (let k = 0; k < LEVELS.length; k++) if (points >= LEVELS[k].min) i = k;
  const next = LEVELS[i + 1];
  return { index: i + 1, name: LEVELS[i].name, next: next ? { name: next.name, at: next.min } : null };
}

function partnerWalkDates(raw: Raw) {
  return new Set(raw.workouts.filter((w) => (w.data.type === "walk" || w.data.type === "run") && w.data.withPartner).map((w) => w.date));
}

/** Last logged performance for each exercise and suggested level. */
function exerciseMemory(raw: Raw) {
  const mem: Record<string, { level: number; sets: number[]; date: string; levelUp: boolean }> = {};
  for (const w of raw.workouts) {
    if (w.data.type !== "strength") continue;
    for (const e of w.data.exercises ?? []) {
      const def = EXERCISES[e.id];
      if (!def) continue;
      const done = e.sets.filter((s) => s > 0);
      const levelUp = done.length > 0 && done.every((s) => s >= def.repMax);
      mem[e.id] = { level: e.level, sets: e.sets, date: w.date, levelUp };
    }
  }
  return mem;
}

export async function buildState(user: UserId) {
  const today = todayFn();
  const partner = PARTNER[user];
  const [raw, praw] = await Promise.all([loadRaw(user), loadRaw(partner)]);
  const myWalks = partnerWalkDates(raw);
  const theirWalks = partnerWalkDates(praw);
  const me = summarize(raw, theirWalks, today);
  const them = summarize(praw, myWalks, today);
  const eng = engineFor(raw, today);
  const pEng = engineFor(praw, today);
  const todayScore = me.days[me.days.length - 1];
  const partnerToday = them.days[them.days.length - 1];

  const foodsToday = raw.foods.filter((f) => f.date === today);
  const totals = foodsToday.reduce(
    (a, f) => ({ kcal: a.kcal + f.data.kcal, protein: a.protein + f.data.protein, carbs: a.carbs + f.data.carbs, fat: a.fat + f.data.fat }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const mem = exerciseMemory(raw);
  const strengthLogs = raw.workouts.filter((w) => w.data.type === "strength");
  const lastSession = strengthLogs.length ? strengthLogs[strengthLogs.length - 1].data.session : undefined;
  const sessions = SESSIONS[user];
  const nextSession = sessions.find((s) => s.key !== lastSession) ?? sessions[0];
  const training = isTrainingDay(raw, eng, today);
  const ws = weekStart(today);

  const myWeek = me.weeks[me.weeks.length - 1];
  const theirWeek = them.weeks[them.weeks.length - 1];
  const reactions = await list<{ from: string; type: string; text?: string }>(user, "reaction", addDays(today, -2));

  const weeksWon = { me: 0, them: 0 };
  me.weeks.forEach((w, i) => {
    const o = them.weeks.find((x) => x.weekStart === w.weekStart);
    if (!o || addDays(w.weekStart, 6) >= today) return;
    if (w.points > o.points) weeksWon.me++;
    else if (o.points > w.points) weeksWon.them++;
    void i;
  });

  // what they actually eat: counts by list food id + favourites for one-tap relog
  const eatenCounts: Record<string, number> = {};
  const favMap = new Map<string, { entry: FoodEntry; n: number; last: string }>();
  for (const f of raw.foods) {
    const id = FOODS.find((x) => x.name === f.data.name)?.id;
    if (id) eatenCounts[id] = (eatenCounts[id] ?? 0) + 1;
    const key = f.data.name + "|" + (f.data.amount ?? "");
    const cur = favMap.get(key);
    favMap.set(key, { entry: f.data, n: (cur?.n ?? 0) + 1, last: f.date });
  }
  const favorites = [...favMap.values()]
    .sort((a, b) => b.n - a.n || b.last.localeCompare(a.last))
    .slice(0, 8)
    .map((x) => ({ name: x.entry.name, amount: x.entry.amount, kcal: x.entry.kcal, protein: x.entry.protein, carbs: x.entry.carbs, fat: x.entry.fat, times: x.n }));
  const yesterday = addDays(today, -1);
  const yesterdayFoods = raw.foods.filter((f) => f.date === yesterday).map((f) => f.data);
  const lastWeight = [...raw.weights].reverse()[0]?.data.kg;

  // weekly hard sets per muscle: planned program sets + self-planned sessions
  const weekMuscles: Partial<Record<Muscle, number>> = {};
  for (const w of raw.workouts.filter((x) => x.date >= ws)) {
    for (const e of w.data.exercises ?? []) {
      const def = EXERCISES[e.id];
      if (!def) continue;
      const done = e.sets.filter((x) => x > 0).length;
      musclesFromLabel(def.muscle).forEach((m, i) => (weekMuscles[m] = (weekMuscles[m] ?? 0) + (i === 0 ? done : done * 0.5)));
    }
    for (const [m, v] of Object.entries(w.data.muscles ?? {})) weekMuscles[m as Muscle] = (weekMuscles[m as Muscle] ?? 0) + (v ?? 0);
  }
  const muscleTarget = raw.profile.goal === "gain" ? (eng.week <= 3 ? 8 : eng.week <= 8 ? 12 : 14) : eng.week <= 6 ? 6 : 9;

  return {
    today,
    user,
    weekMuscles,
    muscleTarget,
    extraBurnToday: extraBurn(raw, today).kcal,
    eatenCounts,
    favorites,
    yesterdayFoods,
    lastWeight,
    profile: { ...raw.profile, pin: undefined },
    hasPin: !!raw.profile.pin,
    engine: eng,
    totals,
    foods: foodsToday.map((f) => ({ id: f.id, ...f.data })),
    water: sumBy(raw.water, (d) => d.glasses, today),
    steps: dailyVal(raw.steps, (d) => d.steps, today) ?? 0,
    sleep: dailyVal(raw.sleep, (d) => d.hours, today),
    weighedToday: raw.weights.find((w) => w.date === today)?.data.kg,
    workoutsToday: raw.workouts.filter((w) => w.date === today).map((w) => ({ id: w.id, ...w.data })),
    plan: {
      training,
      session: nextSession,
      phase: phaseFor(user, eng.week),
      cardio: cardioFor(user, eng.week),
      mini: MINI[user],
      sessionsDoneThisWeek: new Set(strengthLogs.filter((w) => w.date >= ws).map((w) => w.date)).size,
      exerciseMemory: mem,
    },
    todayScore,
    measures: raw.measures.slice(-8).map((m) => ({ date: m.date, ...m.data })),
    body: bodyFor(raw, today),
    // cycle data is private: only ever returned to its owner
    cycle: raw.profile.sex === "f" ? { ...cycleFor(raw, today), today: raw.cycle.find((c) => c.date === today)?.data ?? {}, recent: raw.cycle.slice(-60).map((c) => ({ date: c.date, ...c.data })) } : null,
    reactions: reactions.map((r) => ({ id: r.id, date: r.date, at: r.created_at, ...r.data })).reverse().slice(0, 8),
    habitDay: eng.dayIndex + 1,
    scores: {
      me: { total: me.total, week: myWeek?.points ?? 0, completion: myWeek?.completion ?? 0, streak: me.streak, level: levelFor(me.total), today: todayScore.points, weeks: me.weeks.slice(-8) },
      partner: { name: praw.profile.name, total: them.total, week: theirWeek?.points ?? 0, completion: theirWeek?.completion ?? 0, streak: them.streak, level: levelFor(them.total), today: partnerToday.points, weeks: them.weeks.slice(-8), todayTasks: partnerToday.tasks.map((t) => ({ label: t.label, done: t.done })) },
      couple: (((myWeek?.completion ?? 0) + (theirWeek?.completion ?? 0)) / 2),
      weeksWon,
    },
    partnerPhase: pEng.phase,
    partnerProgress: {
      name: praw.profile.name,
      goal: praw.profile.goal,
      start: praw.profile.startWeight,
      current: pEng.currentWeight,
      target: praw.profile.targetWeight,
      weeklyRate: pEng.weeklyRate,
      weighIns: pEng.trend.length,
    },
  };
}

export type AppState = Awaited<ReturnType<typeof buildState>>;
