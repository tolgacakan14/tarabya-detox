// Free-form workout engine: energy cost (MET), muscle volume and how a self-planned session counts.
// MET values: 2024 Adult Compendium of Physical Activities (Herrmann et al. 2024). Net kcal = (MET − 1) × kg × hours
// (subtract resting energy, already in the TDEE).

export type Category = "strength" | "cardio" | "sport" | "flex";
export type Intensity = "light" | "moderate" | "vigorous";
export type Muscle = "chest" | "back" | "shoulders" | "arms" | "legs" | "glutes" | "core";

export interface Activity {
  name: string;
  category: Category;
  kind?: string; // walk | run | cycle | swim | hiit | football | basketball | tennis | yoga | pilates | dance | stairs | other
  minutes: number;
  intensity: Intensity;
  sets?: number;
  distanceKm?: number;
  muscles?: Muscle[];
}

export const MUSCLE_LABEL: Record<Muscle, string> = {
  chest: "Göğüs",
  back: "Sırt",
  shoulders: "Omuz",
  arms: "Kol",
  legs: "Bacak",
  glutes: "Kalça",
  core: "Karın",
};

const MET: Record<string, Record<Intensity, number>> = {
  strength: { light: 3.5, moderate: 5.0, vigorous: 6.0 },
  walk: { light: 3.0, moderate: 4.0, vigorous: 5.0 },
  run: { light: 7.0, moderate: 9.0, vigorous: 11.0 },
  cycle: { light: 4.0, moderate: 6.8, vigorous: 10.0 },
  swim: { light: 5.0, moderate: 7.0, vigorous: 9.8 },
  hiit: { light: 6.0, moderate: 8.0, vigorous: 9.5 },
  football: { light: 6.0, moderate: 7.0, vigorous: 9.5 },
  basketball: { light: 4.5, moderate: 6.5, vigorous: 8.0 },
  tennis: { light: 5.0, moderate: 7.0, vigorous: 8.0 },
  yoga: { light: 2.3, moderate: 3.0, vigorous: 4.0 },
  pilates: { light: 2.8, moderate: 3.5, vigorous: 4.5 },
  dance: { light: 3.5, moderate: 5.5, vigorous: 7.5 },
  stairs: { light: 4.0, moderate: 6.0, vigorous: 8.5 },
  other: { light: 3.0, moderate: 4.5, vigorous: 6.5 },
};

export function metFor(a: Activity): number {
  // running/walking with distance: derive speed (Compendium: ~1 MET per km/h when running)
  if (a.distanceKm && a.minutes > 0 && (a.kind === "run" || a.kind === "walk")) {
    const kmh = a.distanceKm / (a.minutes / 60);
    if (a.kind === "run" || kmh >= 7.5) return Math.min(16, Math.max(6, kmh * 1.0 + 0.5));
    return kmh < 4 ? 3.0 : kmh < 5 ? 3.5 : kmh < 6 ? 4.3 : 5.0;
  }
  const key = a.category === "strength" ? "strength" : a.category === "flex" ? (a.kind === "pilates" ? "pilates" : "yoga") : a.kind && MET[a.kind] ? a.kind : "other";
  return MET[key][a.intensity] ?? 4.5;
}

export interface WorkoutImpact {
  minutes: number;
  kcal: number; // net kcal above rest
  strengthMinutes: number;
  muscles: Partial<Record<Muscle, number>>; // hard sets credited this session
  countsAs: "strength" | "run" | "walk";
}

export function workoutImpact(acts: Activity[], weightKg: number): WorkoutImpact {
  let kcal = 0,
    minutes = 0,
    strengthMinutes = 0;
  const muscles: Partial<Record<Muscle, number>> = {};
  for (const a of acts) {
    const m = Math.max(0, Math.min(300, a.minutes || 0));
    minutes += m;
    kcal += Math.max(0, metFor(a) - 1) * weightKg * (m / 60);
    if (a.category === "strength") {
      strengthMinutes += m;
      const ms = a.muscles?.length ? a.muscles : (["legs", "chest", "back", "core"] as Muscle[]);
      // no sets given: ~1 hard set per 3 min of lifting, split across the muscles worked
      const sets = a.sets ?? Math.max(1, Math.round(m / 3));
      // compound moves hit several muscles: share the sets, with ~1.5× overlap, never more than the total
      const per = Math.min(sets, (sets * 1.5) / ms.length);
      for (const mu of ms) muscles[mu] = Math.round(((muscles[mu] ?? 0) + per) * 10) / 10;
    }
  }
  const vigorousCardio = acts.some((a) => a.category !== "strength" && a.intensity === "vigorous");
  return {
    minutes,
    kcal: Math.round(kcal),
    strengthMinutes,
    muscles,
    countsAs: strengthMinutes >= 15 ? "strength" : vigorousCardio ? "run" : "walk",
  };
}

/** How much of the burn goes back onto the plate (evidence: don't eat back exercise calories in a deficit). */
export function eatBack(goal: "gain" | "lose", burn: number) {
  if (goal === "gain") return burn; // a gainer must cover extra burn or the surplus disappears
  return burn > 250 ? Math.round(burn * 0.25) : 0;
}

/** Planned-program exercise → muscles, from the program's Turkish muscle labels. */
export function musclesFromLabel(label: string): Muscle[] {
  const l = label.toLocaleLowerCase("tr");
  const out: Muscle[] = [];
  if (l.includes("göğüs")) out.push("chest");
  if (l.includes("sırt")) out.push("back");
  if (l.includes("omuz")) out.push("shoulders");
  if (l.includes("kol") || l.includes("biceps")) out.push("arms");
  if (l.includes("bacak")) out.push("legs");
  if (l.includes("kalça")) out.push("glutes");
  if (l.includes("karın")) out.push("core");
  return out;
}

/** Simple offline parser when no AI key / quota: recognises common Turkish activity words. */
export function quickParse(text: string): Activity[] {
  const t = text.toLocaleLowerCase("tr");
  const mins = Number(t.match(/(\d+)\s*(dk|dakika|min)/)?.[1] ?? (t.match(/(\d+(?:[.,]\d+)?)\s*saat/) ? Number(t.match(/(\d+(?:[.,]\d+)?)\s*saat/)![1].replace(",", ".")) * 60 : 30));
  const km = t.match(/(\d+(?:[.,]\d+)?)\s*km/)?.[1];
  const intensity: Intensity = /yoğun|sert|çok zor|tempolu|hızlı/.test(t) ? "vigorous" : /hafif|yavaş|rahat/.test(t) ? "light" : "moderate";
  const base = { minutes: mins, intensity, distanceKm: km ? Number(km.replace(",", ".")) : undefined };
  if (/koş/.test(t)) return [{ name: "Koşu", category: "cardio", kind: "run", ...base }];
  if (/yürü/.test(t)) return [{ name: "Yürüyüş", category: "cardio", kind: "walk", ...base }];
  if (/bisiklet/.test(t)) return [{ name: "Bisiklet", category: "cardio", kind: "cycle", ...base }];
  if (/yüz/.test(t)) return [{ name: "Yüzme", category: "cardio", kind: "swim", ...base }];
  if (/futbol|halı saha/.test(t)) return [{ name: "Futbol", category: "sport", kind: "football", ...base }];
  if (/basket/.test(t)) return [{ name: "Basketbol", category: "sport", kind: "basketball", ...base }];
  if (/yoga/.test(t)) return [{ name: "Yoga", category: "flex", kind: "yoga", ...base }];
  if (/pilates/.test(t)) return [{ name: "Pilates", category: "flex", kind: "pilates", ...base }];
  if (/dans/.test(t)) return [{ name: "Dans", category: "sport", kind: "dance", ...base }];
  const muscles: Muscle[] = [];
  if (/şınav|göğüs|bench/.test(t)) muscles.push("chest");
  if (/barfiks|row|sırt|kürek/.test(t)) muscles.push("back");
  if (/omuz|press|pike/.test(t)) muscles.push("shoulders");
  if (/kol|biceps|triceps|curl|dips/.test(t)) muscles.push("arms");
  if (/squat|bacak|lunge|çömel/.test(t)) muscles.push("legs");
  if (/kalça|bridge|hip/.test(t)) muscles.push("glutes");
  if (/plank|karın|mekik|crunch/.test(t)) muscles.push("core");
  return [{ name: "Kuvvet antrenmanı", category: "strength", ...base, muscles: muscles.length ? muscles : undefined }];
}
