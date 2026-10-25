// Server-side helpers for self-planned workouts (used by the API and the coach).
import { add, list, type UserId } from "./store";
import { getProfile, type WorkoutLog } from "./state";
import { workoutImpact, quickParse, type Activity } from "./activity";
import { addDays, today as todayFn } from "./dates";
import { extract, hasAI } from "./llm";

const MUSCLES = ["chest", "back", "shoulders", "arms", "legs", "glutes", "core"];

export function sanitizeActivities(input: unknown): Activity[] {
  const arr = Array.isArray(input) ? input : [];
  const n = (v: unknown, lo: number, hi: number) => {
    const x = Number(v);
    return Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : undefined;
  };
  return arr.slice(0, 10).flatMap((raw) => {
    const a = raw as Record<string, unknown>;
    const minutes = n(a.minutes, 1, 300);
    if (!minutes) return [];
    return [
      {
        name: String(a.name ?? "Antrenman").slice(0, 60),
        category: (["strength", "cardio", "sport", "flex"].includes(String(a.category)) ? a.category : "cardio") as Activity["category"],
        kind: a.kind ? String(a.kind).slice(0, 20) : undefined,
        minutes: Math.round(minutes),
        intensity: (["light", "moderate", "vigorous"].includes(String(a.intensity)) ? a.intensity : "moderate") as Activity["intensity"],
        sets: a.sets ? Math.round(n(a.sets, 1, 60) ?? 0) || undefined : undefined,
        distanceKm: a.distanceKm ? n(a.distanceKm, 0.1, 100) : undefined,
        muscles: Array.isArray(a.muscles) ? (a.muscles as string[]).filter((m) => MUSCLES.includes(m)).slice(0, 7) as Activity["muscles"] : undefined,
      },
    ];
  });
}

export async function logCustomWorkout(user: UserId, acts: Activity[], desc?: string, withPartner = false) {
  if (!acts.length) throw new Error("Aktivite bulunamadı");
  const d = todayFn();
  const weights = await list<{ kg: number }>(user, "weight", addDays(d, -30), d);
  const { profile } = await getProfile(user);
  const kg = weights.length ? weights[weights.length - 1].data.kg : profile.startWeight;
  const imp = workoutImpact(acts, kg);
  await add<WorkoutLog>(user, "workout", d, {
    type: imp.countsAs,
    custom: true,
    desc: desc?.slice(0, 300),
    activities: acts,
    minutes: imp.minutes,
    kcal: imp.kcal,
    muscles: imp.muscles,
    withPartner,
  });
  return imp;
}

const ACTIVITY_SCHEMA = {
  type: "object" as const,
  properties: {
    name: { type: "string", description: "Türkçe kısa ad, örn. 'Şınav + squat devresi', 'Sahil koşusu'" },
    category: { type: "string", enum: ["strength", "cardio", "sport", "flex"] },
    kind: { type: "string", enum: ["walk", "run", "cycle", "swim", "hiit", "football", "basketball", "tennis", "yoga", "pilates", "dance", "stairs", "other"] },
    minutes: { type: "number" },
    intensity: { type: "string", enum: ["light", "moderate", "vigorous"] },
    sets: { type: "number", description: "Kuvvet için toplam zor set sayısı (biliniyorsa)" },
    distanceKm: { type: "number" },
    muscles: { type: "array", items: { type: "string", enum: MUSCLES } },
  },
  required: ["name", "category", "minutes", "intensity"],
};

export async function parseWorkout(text: string): Promise<{ activities: Activity[]; source: "ai" | "rules" }> {
  if (hasAI()) {
    try {
      const out = await extract(
        "Kullanıcının kendi yaptığı antrenmanı anlat dediği metni aktivitelere ayır. Süre verilmemişse makul tahmin et (kuvvet seti başına ~3 dk, toplam). Yoğunluğu metinden çıkar (zorlandım/tempolu = vigorous, rahat = light). Kuvvet hareketlerinde çalışan kas gruplarını muscles alanında belirt (şınav: chest, arms, shoulders; squat/lunge: legs, glutes; barfiks/row: back, arms; plank/mekik: core; omuz press: shoulders, arms). Set sayısı verilmişse sets alanına toplam seti yaz.",
        text,
        {
          name: "workout",
          description: "Ayrıştırılmış antrenman",
          input_schema: { type: "object", properties: { activities: { type: "array", items: ACTIVITY_SCHEMA } }, required: ["activities"] },
        }
      );
      const acts = sanitizeActivities((out as { activities?: unknown }).activities);
      if (acts.length) return { activities: acts, source: "ai" };
    } catch {
      /* fall back to rules */
    }
  }
  return { activities: quickParse(text), source: "rules" };
}

export const LOG_CUSTOM_TOOL = {
  name: "log_custom_workout",
  description:
    "Kullanıcının planın dışında KENDİ yaptığı antrenmanı/sporu kaydeder (örn. halı saha, koşu, kendi kurduğu devre antrenmanı). Kalori ve kas hacmi sunucuda hesaplanır, sonuç sana döner; kullanıcıya etkisini kısaca anlat.",
  input_schema: {
    type: "object",
    properties: { description: { type: "string" }, activities: { type: "array", items: ACTIVITY_SCHEMA }, with_partner: { type: "boolean" } },
    required: ["activities"],
  },
};
