// Turns the 12-week program (training.ts) + workout history into "what do I do today".
import { addDays, weekStart } from "./dates";
import { EXERCISES, LADDERS, PLANS, CARDIO, CIRCUITS, suggestNext, type Effort, type LadderBest, type Weekday, type UserId, type Muscle } from "./training";

export interface V2Item {
  ladder: string;
  step: number;
  sets: number[];
  effort?: Effort;
}
export interface V2Log {
  template: string;
  week: number;
  items: V2Item[];
  prs?: number;
  readiness?: "normal" | "light";
}

type Log = { date: string; data: { type: string; v2?: V2Log; minutes?: number; session?: string } };

const WEEKDAYS: Weekday[] = ["paz", "pzt", "sal", "car", "per", "cum", "cmt"];
export const weekdayOf = (date: string): Weekday => WEEKDAYS[new Date(date + "T12:00:00Z").getUTCDay()];

/** Latest performance per ladder + best set per ladder (for PRs). */
export function ladderHistory(logs: Log[]) {
  const last: Record<string, { step: number; sets: number[]; effort?: Effort; date: string }> = {};
  const best: Record<string, LadderBest> = {};
  for (const w of logs) {
    for (const it of w.data.v2?.items ?? []) {
      if (!LADDERS[it.ladder]) continue;
      last[it.ladder] = { step: it.step, sets: it.sets, effort: it.effort, date: w.date };
      const top = Math.max(0, ...it.sets);
      const b = best[it.ladder];
      if (!b || it.step > b.step || (it.step === b.step && top > b.best)) best[it.ladder] = { ladder: it.ladder, step: it.step, best: top };
    }
  }
  return { last, best };
}

export function trainingToday(user: UserId, programWeek: number, today: string, logs: Log[]) {
  const plan = PLANS[user];
  const week = ((Math.max(1, programWeek) - 1) % 12) + 1;
  const pw = plan.weeks[week - 1];
  const phase = plan.phases.find((p) => p.id === pw.phaseId)!;
  const ws = weekStart(today);
  const thisWeek = logs.filter((w) => w.date >= ws && w.date <= today);
  const doneTemplates = new Set(thisWeek.map((w) => w.data.v2?.template).filter(Boolean) as string[]);
  const doneToday = logs.filter((w) => w.date === today);
  const { last, best } = ladderHistory(logs);

  // next strength session: first planned one not yet done this week
  const nextPlanned = pw.strength.find((s) => !doneTemplates.has(s.templateId)) ?? null;
  const template = nextPlanned ? plan.templates.find((t) => t.id === nextPlanned.templateId)! : null;
  const session = nextPlanned
    ? {
        templateId: nextPlanned.templateId,
        title: nextPlanned.title,
        subtitle: template?.subtitle ?? "",
        estMinutes: nextPlanned.estMinutes,
        met: nextPlanned.met,
        warmup: template?.warmup ?? "warmup_full",
        cooldown: template?.cooldown ?? "cooldown_full",
        tests: nextPlanned.tests ?? [],
        exercises: nextPlanned.prescriptions.map((rx) => {
          const mem = last[rx.ladder];
          const sug = mem ? suggestNext(rx.ladder, mem.step, mem.sets, mem.effort, rx.sets) : null;
          const step = sug ? sug.step : rx.startStep;
          const ex = EXERCISES[LADDERS[rx.ladder].steps[step]];
          const base = sug?.targets ?? [];
          const targets = Array.from({ length: rx.sets }, (_, i) => base[i] ?? base[base.length - 1] ?? ex.min);
          return {
            ladder: rx.ladder,
            role: rx.role,
            pair: rx.pair,
            sets: rx.sets,
            rir: rx.rir,
            restSec: rx.restSec,
            step,
            exerciseId: ex.id,
            targets,
            last: mem ? { sets: mem.sets, date: mem.date, step: mem.step } : null,
            message: sug?.message ?? "İlk sefer: hedef aralığın altından başla, formu öğren.",
            change: sug?.change ?? "first",
            best: best[rx.ladder] ?? null,
          };
        }),
      }
    : null;

  // today's cardio/walk from the weekly schedule
  const wd = weekdayOf(today);
  const entry = pw.schedule.find((d) => d.day === wd);
  const cardio = entry && (entry.kind === "cardio" || entry.kind === "walk") && entry.ref ? CARDIO[entry.ref] ?? null : null;
  const circuit = entry && entry.kind === "circuit" && entry.ref ? CIRCUITS[entry.ref] ?? null : null;

  // schedule strip with done marks (strength by template id; cardio by any walk/run that day)
  const dates = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const schedule = dates.map((date) => {
    const d = weekdayOf(date);
    const e = pw.schedule.find((x) => x.day === d);
    const dayLogs = logs.filter((w) => w.date === date);
    const done =
      e?.kind === "strength" ? dayLogs.some((w) => w.data.v2?.template === e.ref || w.data.type === "strength") : e?.kind === "rest" ? false : dayLogs.some((w) => w.data.type === "walk" || w.data.type === "run");
    return { date, day: d, kind: e?.kind ?? "rest", label: e?.label ?? "Dinlen", optional: !!e?.optional, together: !!e?.together, done };
  });

  return {
    week,
    title: plan.title,
    phase: { id: phase.id, name: phase.name, goal: phase.goal, deload: phase.deload, note: phase.note },
    coachNote: pw.coachNote,
    stepTarget: pw.stepTarget,
    sessionsPlanned: pw.strength.length,
    sessionsDone: pw.strength.filter((s) => doneTemplates.has(s.templateId)).length,
    session,
    strengthDoneToday: doneToday.some((w) => w.data.type === "strength"),
    cardio,
    circuit,
    todayEntry: entry ?? null,
    schedule,
    volumeTarget: plan.volumeTargets[phase.id] ?? 10,
  };
}

/** Fractional hard sets per muscle from a v2 log (primary 1, secondary 0.5). */
export function v2Muscles(v: V2Log): Partial<Record<Muscle, number>> {
  const out: Partial<Record<Muscle, number>> = {};
  for (const it of v.items) {
    const ex = EXERCISES[LADDERS[it.ladder]?.steps[it.step] ?? ""];
    if (!ex) continue;
    const n = it.sets.filter((x) => x > 0).length;
    for (const m of ex.primary) out[m] = (out[m] ?? 0) + n;
    for (const m of ex.secondary) out[m] = (out[m] ?? 0) + n * 0.5;
  }
  return out;
}
