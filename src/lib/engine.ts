// Evidence-based energy & target engine. See docs/ARASTIRMA.md.
import type { Profile } from "./profiles";
import { addDays, daysBetween, weekStart } from "./dates";

export interface FoodEntry {
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  meal?: string;
  planned?: boolean;
  amount?: string;
  time?: string;
  source?: "list" | "estimate" | "ai" | "quick" | "coach";
}

export interface DayPoint {
  date: string;
  weight?: number;
  intake?: number; // undefined = not logged
}

const RHO = 7000; // kcal per kg of tissue change (Hall 2011; Slater 2019)
const ALPHA_TAU = 10; // days, time-aware EMA (Hacker's Diet alpha ~0.1)

export function bmr(p: Profile, weight: number): number {
  return 10 * weight + 6.25 * p.heightCm - 5 * p.age + (p.sex === "m" ? 5 : -161);
}

export function bmi(p: Profile, weight: number): number {
  const h = p.heightCm / 100;
  return weight / (h * h);
}

export function weightForBmi(p: Profile, b: number): number {
  const h = p.heightCm / 100;
  return Math.round(b * h * h * 10) / 10;
}

/** Time-aware EMA trend. weights sorted by date. */
export function trendSeries(weights: { date: string; weight: number }[]) {
  const out: { date: string; weight: number; trend: number }[] = [];
  let t: number | null = null;
  let last: string | null = null;
  for (const w of weights) {
    if (t === null || last === null) t = w.weight;
    else {
      const dt = Math.max(1, daysBetween(last, w.date));
      const a = 1 - Math.exp(-dt / ALPHA_TAU);
      t = t + a * (w.weight - t);
    }
    last = w.date;
    out.push({ date: w.date, weight: w.weight, trend: Math.round(t * 100) / 100 });
  }
  return out;
}

function trendAt(series: { date: string; trend: number }[], date: string): number | null {
  let v: number | null = null;
  for (const s of series) {
    if (s.date <= date) v = s.trend;
    else break;
  }
  return v;
}

export interface Targets {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  steps: number;
  sessionsPerWeek: number;
}

export interface EngineResult {
  week: number;
  dayIndex: number;
  currentWeight: number;
  trend: { date: string; weight: number; trend: number }[];
  weeklyRate: number | null; // kg per week, from trend over last 21 days
  bmr: number;
  priorTdee: number;
  tdee: number;
  adaptiveWeight: number; // 0..1 how much logged data drives TDEE
  loggingCompleteness: number;
  phase: "surplus" | "deficit" | "maintenance";
  targets: Targets;
  floor: number;
  insights: { tone: "info" | "good" | "warn"; text: string }[];
  milestones: { label: string; weight: number; reached: boolean }[];
  week7: { date: string; intake?: number }[];
  weekBudget: { used: number; budget: number; days: number };
}

export function runEngine(
  p: Profile,
  today: string,
  weights: { date: string; weight: number }[],
  intakeByDate: Record<string, number>,
  stepsByDate: Record<string, number>,
  redFlagsRecent: number,
  opts: { waistTooFast?: boolean } = {}
): EngineResult {
  const dayIndex = Math.max(0, daysBetween(p.startDate, today));
  const week = Math.floor(dayIndex / 7) + 1;
  const trend = trendSeries(weights);
  const currentWeight = trend.length ? trend[trend.length - 1].trend : p.startWeight;
  const insights: EngineResult["insights"] = [];

  // weekly rate from trend over last 21 days
  let weeklyRate: number | null = null;
  if (trend.length >= 4) {
    const end = trend[trend.length - 1];
    const startDate = addDays(end.date, -21);
    const first = trend.find((t) => t.date >= startDate) ?? trend[0];
    const span = daysBetween(first.date, end.date);
    if (span >= 7) weeklyRate = Math.round(((end.trend - first.trend) / span) * 7 * 100) / 100;
  }

  const B = bmr(p, currentWeight);
  const priorTdee = B * p.activity;

  // Adaptive TDEE over the last 28 days ending yesterday
  const winEnd = addDays(today, -1);
  const winStart = addDays(today, -28);
  let loggedDays = 0;
  let intakeSum = 0;
  for (let d = winStart; d <= winEnd; d = addDays(d, 1)) {
    const v = intakeByDate[d];
    if (v !== undefined && v > 400) {
      loggedDays++;
      intakeSum += v;
    }
  }
  const spanDays = Math.min(28, Math.max(1, dayIndex));
  const completeness = loggedDays / spanDays;
  let adaptiveWeight = 0;
  let tdee = priorTdee;
  const tStart = trendAt(trend, winStart) ?? trend[0]?.trend ?? null;
  const tEnd = trendAt(trend, winEnd);
  if (loggedDays >= 10 && completeness >= 0.6 && tStart !== null && tEnd !== null && trend.length >= 5) {
    const firstWeighDate = trend.find((t) => t.date >= winStart)?.date ?? winStart;
    const span = Math.max(7, daysBetween(firstWeighDate, winEnd));
    const obs = intakeSum / loggedDays - (RHO * (tEnd - tStart)) / span;
    adaptiveWeight = Math.min(0.8, Math.max(0, (loggedDays - 7) / 21)) * Math.min(1, completeness / 0.8);
    tdee = adaptiveWeight * obs + (1 - adaptiveWeight) * priorTdee;
    tdee = Math.min(priorTdee * 1.3, Math.max(priorTdee * 0.75, tdee));
  } else if (dayIndex >= 10) {
    insights.push({
      tone: "info",
      text: "Harcamanı kendi verinden öğrenebilmem için 4 haftanın en az %60'ında yemek kaydı lazım. Eksik günler sıfır sayılmıyor, sadece hesaba katılmıyor.",
    });
  }

  // Phase & kcal
  const floor = Math.round(Math.max(p.sex === "f" ? 1300 : 1600, B));
  let phase: EngineResult["phase"] = p.goal === "gain" ? "surplus" : "deficit";
  let kcal: number;

  if (p.goal === "gain") {
    kcal = tdee + 350;
    if (week >= 4 && weeklyRate !== null) {
      if (weeklyRate < 0.1 && adaptiveWeight < 0.5) {
        kcal += 150;
        insights.push({ tone: "warn", text: "Kilo trendin son 3 haftada neredeyse yatay. Hedefine 150 kcal ekledim. Genelde en kolayı: günde bir shake ya da bir avuç kuruyemiş daha." });
      } else if (weeklyRate > 0.5) {
        kcal -= 100;
        insights.push({ tone: "info", text: "Haftada 0.5 kg'dan hızlı alıyorsun. Bu hızda fazlanın bir kısmı yağa gidiyor, hedefi 100 kcal azalttım." });
      } else if (weeklyRate >= 0.15) {
        insights.push({ tone: "good", text: `Haftada ${weeklyRate.toFixed(2)} kg alıyorsun. Tam hedef bandında.` });
      }
    }
    // tape-measure rule: waist growing faster than ~1 cm per kg gained → trim the surplus
    if (opts.waistTooFast) kcal -= 100;
    kcal = Math.max(kcal, tdee + 150);
  } else {
    // Diet-break cycle: 8 weeks deficit, 2 weeks maintenance (MATADOR / ICECAP)
    const ds = p.deficitStart ?? p.startDate;
    const wInCycle = Math.floor(Math.max(0, daysBetween(ds, today)) / 7) % 10;
    const plannedBreak = wInCycle >= 8;
    const manualBreak = p.maintenanceUntil && p.maintenanceUntil >= today;
    const reachedGoal = currentWeight <= p.targetWeight;
    if (redFlagsRecent > 0) {
      phase = "maintenance";
      insights.push({ tone: "warn", text: "Son iki haftada bir uyarı işareti kaydettin. Açığı durdurdum, şu an bakım kalorisindesin. Devam ederse bir doktor ya da diyetisyenle konuşmanı istiyorum." });
    } else if (manualBreak || plannedBreak) {
      phase = "maintenance";
      insights.push({ tone: "good", text: "Bakım dönemindesin. Bu bir mola değil, planın parçası: vücudun ve kafan dinleniyor, sonra açık daha kolay gidiyor." });
    } else if (reachedGoal) {
      phase = "maintenance";
      insights.push({ tone: "good", text: "Hedefine ulaştın! Şimdi bakım dönemi: kilonu korumaya odaklanıyoruz." });
    }
    kcal = phase === "maintenance" ? tdee : tdee - 250;
    if (phase === "deficit" && weeklyRate !== null && weeklyRate < -0.007 * currentWeight) {
      kcal += 125;
      insights.push({ tone: "warn", text: "Son 3 haftada güvenli hızdan daha hızlı veriyorsun. Kas kaybetmemen için hedefini 125 kcal artırdım." });
    } else if (phase === "deficit" && weeklyRate !== null && weeklyRate <= -0.15) {
      insights.push({ tone: "good", text: `Haftada ${Math.abs(weeklyRate).toFixed(2)} kg veriyorsun. Sağlıklı ve sürdürülebilir bir hız.` });
    }
  }

  kcal += p.kcalAdjust;
  kcal = Math.max(floor, kcal);
  if (p.goal === "gain") kcal = Math.max(kcal, Math.round(tdee));
  kcal = Math.round(kcal / 10) * 10;

  const protein = Math.round((p.proteinPerKg * currentWeight) / 5) * 5;
  const fat =
    p.goal === "gain"
      ? Math.round(1.0 * currentWeight)
      : Math.round(Math.max(0.8 * currentWeight, (0.27 * kcal) / 9));
  const carbs = Math.max(80, Math.round((kcal - protein * 4 - fat * 9) / 4));

  // Steps
  let steps: number;
  if (p.goal === "lose") {
    const firstWeek = Object.entries(stepsByDate)
      .filter(([d]) => d >= p.startDate && d < addDays(p.startDate, 7))
      .map(([, v]) => v);
    const base = firstWeek.length >= 3 ? firstWeek.reduce((a, b) => a + b, 0) / firstWeek.length : p.stepBaseline;
    steps = Math.min(9000, Math.round((base + 500 * (week - 1)) / 500) * 500);
    steps = Math.max(steps, 3000);
  } else {
    steps = 7000;
  }

  const sessionsPerWeek = p.goal === "gain" ? 3 : week <= 4 ? 2 : 3;

  // Milestones
  const milestones =
    p.goal === "gain"
      ? [
          { label: "Normal BMI sınırı", weight: weightForBmi(p, 18.5) },
          { label: "BMI 20", weight: weightForBmi(p, 20) },
          { label: "Hedef", weight: p.targetWeight },
        ]
      : [
          { label: "İlk 2 kg", weight: Math.round((p.startWeight - 2) * 10) / 10 },
          { label: "Yarı yol", weight: Math.round(((p.startWeight + p.targetWeight) / 2) * 10) / 10 },
          { label: "Hedef", weight: p.targetWeight },
        ];
  const ms = milestones.map((m) => ({
    ...m,
    reached: p.goal === "gain" ? currentWeight >= m.weight : currentWeight <= m.weight,
  }));

  // Weekly budget (flexible restraint: judge the week, not the day)
  const ws = weekStart(today);
  let used = 0;
  let days = 0;
  for (let d = ws; d <= today; d = addDays(d, 1)) {
    days++;
    used += intakeByDate[d] ?? 0;
  }
  const week7: { date: string; intake?: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(today, -i);
    week7.push({ date: d, intake: intakeByDate[d] });
  }

  if (p.goal === "lose" && bmi(p, p.targetWeight) < 19.5) {
    insights.push({ tone: "info", text: "Hedef kilon sağlıklı aralığın alt kısmında. Oraya yaklaşırken bir doktor ya da diyetisyenle kontrol iyi olur." });
  }

  return {
    week,
    dayIndex,
    currentWeight: Math.round(currentWeight * 10) / 10,
    trend,
    weeklyRate,
    bmr: Math.round(B),
    priorTdee: Math.round(priorTdee),
    tdee: Math.round(tdee),
    adaptiveWeight: Math.round(adaptiveWeight * 100) / 100,
    loggingCompleteness: Math.round(completeness * 100) / 100,
    phase,
    targets: { kcal, protein, fat, carbs, fiber: p.goal === "lose" ? 25 : 30, steps, sessionsPerWeek },
    floor,
    insights,
    milestones: ms,
    week7,
    weekBudget: { used: Math.round(used), budget: kcal * 7, days },
  };
}

/** Hard guardrails applied to any target change (coach or user). */
export function clampTargetWeight(p: Profile, w: number): { value: number; note?: string } {
  const minW = weightForBmi(p, 18.5);
  if (p.goal === "lose" && w < minW) {
    return { value: minW, note: `Hedef ${minW} kg'ın (BMI 18.5) altına inemez.` };
  }
  return { value: w };
}

export function clampKcalAdjust(p: Profile, adj: number): number {
  // Coach can move targets at most ±300 kcal from the engine's computed value
  return Math.max(-300, Math.min(p.goal === "gain" ? 500 : 300, Math.round(adj)));
}
