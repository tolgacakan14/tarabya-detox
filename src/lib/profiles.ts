import type { UserId } from "./store";

export type Goal = "gain" | "lose";

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
