"use client";
import { useCallback, useMemo, useState } from "react";
import type { AppState } from "@/lib/state";
import { buildMenu, effectivePrefs, hashSeed } from "@/lib/menu";
import { FOODS } from "@/lib/foods";

/** Today's personal menu (from foods they eat), with per-meal reroll remembered on this device. */
export function useMenu(s: AppState) {
  const key = `menu-${s.user}-${s.today}`;
  const [rolls, setRolls] = useState<Record<number, number>>(() => {
    try {
      return JSON.parse(localStorage.getItem(key) || "{}");
    } catch {
      return {};
    }
  });
  const prefs = useMemo(() => effectivePrefs(s.profile.foodPrefs, s.eatenCounts), [s.profile.foodPrefs, s.eatenCounts]);
  const menu = useMemo(
    () => buildMenu({ goal: s.profile.goal, kcal: s.engine.targets.kcal, protein: s.engine.targets.protein, prefs, seed: hashSeed(s.user + s.today), slotSeeds: rolls, recent: s.recentCounts }),
    [s.profile.goal, s.engine.targets.kcal, s.engine.targets.protein, prefs, s.user, s.today, rolls, s.recentCounts]
  );
  const reroll = useCallback(
    (idx: number) => {
      setRolls((r) => {
        const next = { ...r, [idx]: (r[idx] ?? 0) + 1 };
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {
          /* private mode */
        }
        return next;
      });
    },
    [key]
  );
  // a meal counts as eaten if a planned entry for that slot with one of its foods exists today
  const eaten = (idx: number) => {
    const m = menu.meals[idx];
    const names = m.items.map((i) => FOODS.find((f) => f.id === i.foodId)?.name);
    return s.foods.some((f) => f.planned && f.meal === m.slot && names.includes(f.name));
  };
  return { menu, prefs, reroll, eaten };
}
