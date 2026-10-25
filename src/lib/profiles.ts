import type { UserId } from "./store";

export type Goal = "gain" | "lose";

export interface PresetItem {
  name: string;
  amount: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}
export interface Preset {
  id: string;
  name: string;
  emoji: string;
  meal: string;
  items: PresetItem[];
}

/** Tolga's usual breakfast, measured from labels (Namet kangal 240 g, Uno tost 263 kcal/100 g). */
export const TOLGA_BREAKFAST: Preset = {
  id: "klasik-kahvalti",
  name: "Klasik kahvaltım",
  emoji: "🍳",
  meal: "kahvaltı",
  items: [
    { name: "Sucuk (kangalın ¼'ü)", amount: "~60 g", kcal: 264, protein: 9.6, carbs: 2.4, fat: 24 },
    { name: "Beyaz peynir (tam yağlı)", amount: "1 kalın dilim, ~60 g", kcal: 168, protein: 10.2, carbs: 0.9, fat: 13.2 },
    { name: "Salatalık", amount: "2 adet, ~220 g", kcal: 33, protein: 1.4, carbs: 7.9, fat: 0.2 },
    { name: "Uno tost ekmeği", amount: "3 dilim, ~90 g", kcal: 237, protein: 6.1, carbs: 49.1, fat: 1.8 },
    { name: "Tereyağı (kızartma)", amount: "~12 g", kcal: 86, protein: 0.1, carbs: 0, fat: 9.8 },
    { name: "Siyah zeytin", amount: "10-12 adet, ~44 g", kcal: 132, protein: 0.6, carbs: 3, fat: 13 },
    { name: "Zeytinyağı (her şeyin üstüne)", amount: "~1,5 yemek kaşığı, 20 g", kcal: 177, protein: 0, carbs: 0, fat: 20 },
    { name: "Çay (şekersiz)", amount: "1 bardak", kcal: 2, protein: 0, carbs: 0.4, fat: 0 },
    { name: "Capri-Sun portakal", amount: "1 paket, 200 ml", kcal: 80, protein: 0, carbs: 20, fat: 0 },
  ],
};

export interface Profile {
  id: UserId;
  name: string;
  sex: "m" | "f";
  age: number;
  heightCm: number;
  startWeight: number;
  targetWeight: number;
  goal: Goal;
  startDate: string; // program week 1 starts here
  activity: number; // starting activity multiplier
  proteinPerKg: number;
  // "manual" (default for both): the day ends when you say so, not at midnight.
  dayMode?: "manual" | "calendar";
  activeDate?: string;
  intensity?: "standard" | "intense";
  // personal correction for AI plate estimates (O'Hara 2025: big plates are underestimated): EMA of saved ÷ suggested kcal
  // one-tap saved meals ("Klasik kahvaltım")
  presets?: Preset[];
  // push reminders (null = off). Times are Istanbul "HH:MM".
  reminders?: { weigh?: string | null; meal?: boolean; dayEnd?: string | null; partner?: boolean };
  aiFactor?: number;
  aiFactorN?: number; // undefined = intense (we both asked for the faster plan)
  kcalAdjust: number; // manual adjustment from coach, bounded by guardrails
  stepBaseline: number;
  equipment: string;
  likes: string;
  dislikes: string;
  ifThen: string[]; // implementation intentions
  why: string; // personal reason
  cycleTracking: boolean;
  maintenanceUntil?: string; // planned maintenance / diet break
  deficitStart?: string; // start of current deficit block
  onboarded: boolean;
  notes: string[]; // things the coach should remember
  pin?: string;
  /** Explicit food preferences: 2 = loves, 1 = eats, -1 = won't eat. Missing = unknown. */
  foodPrefs?: Record<string, number>;
}

export const PARTNER: Record<UserId, UserId> = { tolga: "eylul", eylul: "tolga" };

export function defaultProfile(id: UserId, startDate: string): Profile {
  if (id === "tolga") {
    return {
      id,
      presets: [TOLGA_BREAKFAST],
      name: "Tolga",
      sex: "m",
      age: 23,
      heightCm: 174,
      startWeight: 55,
      targetWeight: 63,
      goal: "gain",
      startDate,
      activity: 1.45,
      proteinPerKg: 1.8,
      kcalAdjust: 0,
      stepBaseline: 6000,
      equipment: "Mat, birkaç dambıl/ağırlık. Salon yok. Vücut ağırlığı tercih. Sahilde yürüyüş ve koşu.",
      likes: "",
      dislikes: "",
      ifThen: [],
      why: "",
      cycleTracking: false,
      onboarded: false,
      notes: [],
    };
  }
  return {
    id,
    name: "Eylül",
    sex: "f",
    age: 22,
    heightCm: 158,
    startWeight: 55,
    targetWeight: 50,
    goal: "lose",
    startDate,
    activity: 1.25,
    proteinPerKg: 1.8,
    kcalAdjust: 0,
    stepBaseline: 4000,
    equipment: "Mat, birkaç hafif ağırlık. Salon yok. Vücut ağırlığı tercih. Sahilde yürüyüş.",
    likes: "",
    dislikes: "",
    ifThen: [],
    why: "",
    cycleTracking: true,
    onboarded: false,
    notes: [],
    deficitStart: startDate,
  };
}

export const COLORS: Record<UserId, string> = { tolga: "var(--tolga)", eylul: "var(--eylul)" };
