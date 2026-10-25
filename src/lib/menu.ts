// Personal menu generator for picky eaters.
// Builds a day from foods the person eats (explicit prefs + what they actually log),
// scales portions to hit the calorie target and checks protein. Pure, runs on client or server.
import { FOODS, type Food } from "./foods";

export type Slot = "kahvaltı" | "öğle" | "akşam" | "ara öğün";
type Role = "protein" | "carb" | "side" | "drink" | "snack" | "dish" | "soup";

/** Which meal slot(s) a food fits and what role it plays on the plate. */
const META: Record<string, { slots: Slot[]; role: Role }> = {
  yumurta: { slots: ["kahvaltı", "ara öğün"], role: "protein" },
  menemen: { slots: ["kahvaltı"], role: "protein" },
  menemen3: { slots: ["kahvaltı"], role: "protein" },
  beyazpeynir: { slots: ["kahvaltı"], role: "side" },
  kasar: { slots: ["kahvaltı"], role: "side" },
  lor: { slots: ["kahvaltı", "ara öğün"], role: "protein" },
  zeytin: { slots: ["kahvaltı"], role: "side" },
  tamekmek: { slots: ["kahvaltı", "öğle", "akşam"], role: "carb" },
  beyazekmek: { slots: ["kahvaltı", "öğle", "akşam"], role: "carb" },
  simit: { slots: ["kahvaltı"], role: "carb" },
  pogaca: { slots: ["kahvaltı", "ara öğün"], role: "carb" },
  borek: { slots: ["kahvaltı"], role: "dish" },
  tahinpekmez: { slots: ["kahvaltı", "ara öğün"], role: "snack" },
  bal: { slots: ["kahvaltı"], role: "side" },
  fistikezmesi: { slots: ["kahvaltı", "ara öğün"], role: "snack" },
  yulaf: { slots: ["kahvaltı"], role: "dish" },
  sut: { slots: ["kahvaltı", "ara öğün"], role: "drink" },
  yogurt: { slots: ["öğle", "akşam", "ara öğün"], role: "side" },
  suzmeyogurt: { slots: ["ara öğün", "kahvaltı"], role: "protein" },
  ayran: { slots: ["öğle", "akşam"], role: "drink" },
  kefir: { slots: ["ara öğün", "kahvaltı"], role: "drink" },
  mercimek: { slots: ["öğle", "akşam"], role: "soup" },
  ezogelin: { slots: ["öğle", "akşam"], role: "soup" },
  tavukcorba: { slots: ["öğle", "akşam"], role: "soup" },
  tavukizgara: { slots: ["öğle", "akşam"], role: "protein" },
  tavukbut: { slots: ["öğle", "akşam"], role: "protein" },
  kofte: { slots: ["öğle", "akşam"], role: "protein" },
  balik: { slots: ["öğle", "akşam"], role: "protein" },
  ton: { slots: ["öğle", "akşam", "ara öğün"], role: "protein" },
  kurufasulye: { slots: ["öğle", "akşam"], role: "dish" },
  nohut: { slots: ["öğle", "akşam"], role: "dish" },
  pilav: { slots: ["öğle", "akşam"], role: "carb" },
  bulgur: { slots: ["öğle", "akşam"], role: "carb" },
  makarna: { slots: ["öğle", "akşam"], role: "carb" },
  mantı: { slots: ["öğle", "akşam"], role: "dish" },
  zeytinyagli: { slots: ["öğle", "akşam"], role: "side" },
  kizartma: { slots: ["öğle", "akşam"], role: "side" },
  karniyarik: { slots: ["öğle", "akşam"], role: "dish" },
  dolma: { slots: ["öğle", "akşam", "ara öğün"], role: "side" },
  salata: { slots: ["kahvaltı", "öğle", "akşam"], role: "side" },
  donerdurum: { slots: ["öğle", "akşam"], role: "dish" },
  donerporsiyon: { slots: ["öğle", "akşam"], role: "protein" },
  etdurum: { slots: ["öğle", "akşam"], role: "dish" },
  lahmacun: { slots: ["öğle", "akşam"], role: "dish" },
  pide: { slots: ["öğle", "akşam"], role: "dish" },
  tost: { slots: ["kahvaltı", "ara öğün", "öğle"], role: "dish" },
  kuruyemis: { slots: ["ara öğün"], role: "snack" },
  badem: { slots: ["ara öğün"], role: "snack" },
  hurma: { slots: ["ara öğün"], role: "snack" },
  muz: { slots: ["ara öğün", "kahvaltı"], role: "snack" },
  elma: { slots: ["ara öğün"], role: "snack" },
  mandalina: { slots: ["ara öğün"], role: "snack" },
  sutlac: { slots: ["ara öğün"], role: "snack" },
  shake: { slots: ["ara öğün"], role: "snack" },
  proteinshake: { slots: ["ara öğün"], role: "snack" },
};

/** Foods worth asking about first (common, plan-relevant). */
export const ASK_ORDER = [
  "yumurta", "menemen", "beyazpeynir", "lor", "tamekmek", "simit", "yulaf", "sut", "yogurt", "suzmeyogurt", "ayran",
  "tavukizgara", "kofte", "balik", "ton", "mercimek", "kurufasulye", "nohut", "pilav", "bulgur", "makarna", "zeytinyagli",
  "salata", "donerporsiyon", "lahmacun", "tost", "kuruyemis", "muz", "elma", "tahinpekmez", "fistikezmesi", "hurma",
  "kefir", "tavukbut", "mantı", "karniyarik", "dolma", "badem", "mandalina", "ezogelin", "tavukcorba", "sutlac", "shake",
];

export interface MenuItem {
  foodId: string;
  qty: number;
  name: string;
  portion: string;
  kcal: number;
  protein: number;
  isNew: boolean; // user hasn't told us about it yet
}
export interface MenuMeal {
  slot: Slot;
  items: MenuItem[];
  kcal: number;
  protein: number;
}
export interface DayMenu {
  meals: MenuMeal[];
  kcal: number;
  protein: number;
  knownFoods: number;
  note?: string;
}

const SLOT_SPLIT: Record<"gain" | "lose", { slot: Slot; share: number }[]> = {
  gain: [
    { slot: "kahvaltı", share: 0.25 },
    { slot: "ara öğün", share: 0.15 },
    { slot: "öğle", share: 0.27 },
    { slot: "ara öğün", share: 0.08 },
    { slot: "akşam", share: 0.25 },
  ],
  lose: [
    { slot: "kahvaltı", share: 0.27 },
    { slot: "öğle", share: 0.33 },
    { slot: "ara öğün", share: 0.1 },
    { slot: "akşam", share: 0.3 },
  ],
};

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

export function hashSeed(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Combines explicit prefs with what the person actually logs (eaten twice ⇒ likes it). */
export function effectivePrefs(prefs: Record<string, number> | undefined, eatenCounts: Record<string, number>) {
  const out: Record<string, number> = {};
  for (const [id, n] of Object.entries(eatenCounts)) if (n >= 2) out[id] = n >= 5 ? 2 : 1;
  for (const [id, v] of Object.entries(prefs ?? {})) out[id] = v; // explicit wins
  return out;
}

export function buildMenu(opts: {
  goal: "gain" | "lose";
  kcal: number;
  protein: number;
  prefs: Record<string, number>;
  seed: number;
  slotSeeds?: Record<number, number>;
}): DayMenu {
  const { goal, prefs } = opts;
  const known = Object.values(prefs).filter((v) => v > 0).length;
  // Use only liked foods once we know enough; before that, allow unknowns (flagged as "new").
  const allowUnknown = known < 12;

  const pool = FOODS.filter((f) => META[f.id] && (prefs[f.id] ?? 0) >= 0 && (allowUnknown || (prefs[f.id] ?? 0) > 0));

  const score = (f: Food) => {
    const p = prefs[f.id] ?? 0;
    let s = p === 2 ? 4 : p === 1 ? 2.5 : 1;
    if (goal === "gain" && f.tags.includes("dense")) s += 1.2;
    if (goal === "lose" && f.tags.includes("light")) s += 1.2;
    if (goal === "lose" && f.tags.includes("dense")) s -= 0.6;
    if (f.tags.includes("protein")) s += 0.8;
    return Math.max(0.2, s);
  };

  const pick = (r: () => number, cands: Food[], used: Set<string>, local?: Set<string>) => {
    let list = cands.filter((f) => !used.has(f.id));
    // snacks and drinks may repeat across the day (a second ayran is fine), just not within one meal
    if (!list.length && local) list = cands.filter((f) => !local.has(f.id) && ["snack", "drink"].includes(META[f.id].role));
    if (!list.length) return null;
    const total = list.reduce((a, f) => a + score(f), 0);
    let x = r() * total;
    for (const f of list) {
      x -= score(f);
      if (x <= 0) return f;
    }
    return list[list.length - 1];
  };

  const used = new Set<string>();
  const meals: MenuMeal[] = [];
  SLOT_SPLIT[goal].forEach(({ slot, share }, idx) => {
    const r = rng(opts.seed + (opts.slotSeeds?.[idx] ?? 0) * 7919 + idx * 104729);
    const budget = opts.kcal * share;
    const inSlot = pool.filter((f) => META[f.id].slots.includes(slot));
    const byRole = (...roles: Role[]) => inSlot.filter((f) => roles.includes(META[f.id].role));
    const chosen: Food[] = [];
    const add = (f: Food | null) => {
      if (f) {
        chosen.push(f);
        used.add(f.id);
      }
    };

    if (slot === "ara öğün") {
      const snacks = goal === "gain" ? byRole("snack", "drink", "protein") : byRole("protein", "snack", "drink");
      const local = () => new Set(chosen.map((c) => c.id));
      add(pick(r, snacks, used, local()));
      if (budget > 300) add(pick(r, byRole("snack", "drink"), used, local()));
    } else if (slot === "kahvaltı") {
      add(pick(r, byRole("protein", "dish"), used));
      if (chosen[0] && META[chosen[0].id].role !== "dish") add(pick(r, byRole("carb"), used));
      add(pick(r, byRole("side"), used));
      if (goal === "gain") add(pick(r, byRole("drink", "snack"), used));
    } else {
      if (goal === "lose" && r() < 0.5) add(pick(r, byRole("soup"), used));
      const main = pick(r, byRole("protein", "dish"), used);
      add(main);
      if (main && META[main.id].role === "protein") add(pick(r, byRole("carb"), used));
      add(pick(r, byRole("side", "drink"), used));
    }

    // portions: start at 1, scale the main + carb in 0.5 steps toward the budget
    const items = chosen.map((f) => ({ f, qty: 1 }));
    const total = () => items.reduce((a, i) => a + i.f.kcal * i.qty, 0);
    const scalable = items.filter((i) => ["protein", "carb", "dish", "snack", "drink"].includes(META[i.f.id].role));
    for (let guard = 0; guard < 16 && scalable.length; guard++) {
      const t = total();
      if (t < budget * 0.88) {
        const target = scalable.reduce((best, i) => (i.qty < best.qty ? i : best), scalable[0]);
        if (target.qty >= 3) break;
        target.qty += 0.5;
      } else if (t > budget * 1.15) {
        const target = scalable.reduce((best, i) => (i.qty > best.qty ? i : best), scalable[0]);
        if (target.qty <= 0.5) break;
        target.qty -= 0.5;
      } else break;
    }

    const mi: MenuItem[] = items.map(({ f, qty }) => ({
      foodId: f.id,
      qty,
      name: f.name,
      portion: f.portion,
      kcal: Math.round(f.kcal * qty),
      protein: Math.round(f.protein * qty),
      isNew: (prefs[f.id] ?? 0) === 0,
    }));
    meals.push({ slot, items: mi, kcal: mi.reduce((a, i) => a + i.kcal, 0), protein: mi.reduce((a, i) => a + i.protein, 0) });
  });

  // protein top-up: add the best liked protein food to a snack slot if the day falls short
  let proteinNow = meals.reduce((a, m) => a + m.protein, 0);
  if (proteinNow < opts.protein * 0.9) {
    const snackMeal = meals.find((m) => m.slot === "ara öğün") ?? meals[meals.length - 1];
    const cands = pool
      .filter((f) => f.tags.includes("protein") && !used.has(f.id) && META[f.id].slots.some((s) => s === "ara öğün" || s === snackMeal.slot))
      .sort((a, b) => score(b) * (b.protein / b.kcal) - score(a) * (a.protein / a.kcal));
    const f = cands[0];
    if (!f) {
      // no new protein food they eat: enlarge the most protein-dense item they already have
      let best: { m: MenuMeal; i: MenuItem } | null = null;
      for (const m of meals)
        for (const i of m.items)
          if (i.kcal > 0 && (!best || i.protein / i.kcal > best.i.protein / best.i.kcal)) best = { m, i };
      if (best && best.i.qty < 3) {
        const food = FOODS.find((x) => x.id === best!.i.foodId)!;
        best.i.qty += 0.5;
        best.i.kcal = Math.round(food.kcal * best.i.qty);
        best.i.protein = Math.round(food.protein * best.i.qty);
        best.m.kcal = best.m.items.reduce((a, x) => a + x.kcal, 0);
        best.m.protein = best.m.items.reduce((a, x) => a + x.protein, 0);
        proteinNow = meals.reduce((a, m) => a + m.protein, 0);
      }
    } else {
      const qty = goal === "lose" ? 1 : 1.5;
      snackMeal.items.push({ foodId: f.id, qty, name: f.name, portion: f.portion, kcal: Math.round(f.kcal * qty), protein: Math.round(f.protein * qty), isNew: (prefs[f.id] ?? 0) === 0 });
      snackMeal.kcal += Math.round(f.kcal * qty);
      snackMeal.protein += Math.round(f.protein * qty);
      proteinNow = meals.reduce((a, m) => a + m.protein, 0);
    }
  }

  // whole-day calibration: after the protein top-up, nudge portions until the day is within ±10%
  const recalc = (m: MenuMeal) => {
    m.kcal = m.items.reduce((a, x) => a + x.kcal, 0);
    m.protein = m.items.reduce((a, x) => a + x.protein, 0);
  };
  const all = () => meals.flatMap((m) => m.items.map((i) => ({ m, i, f: FOODS.find((x) => x.id === i.foodId)! })));
  const scalableRole = (id: string) => ["protein", "carb", "dish", "snack", "drink"].includes(META[id]?.role);
  for (let guard = 0; guard < 24; guard++) {
    const day = meals.reduce((a, m) => a + m.kcal, 0);
    const its = all().filter((x) => scalableRole(x.i.foodId));
    if (!its.length) break;
    let t;
    if (day < opts.kcal * 0.92) {
      // grow the most energy-dense item that still has room (fewest steps to the target)
      t = its.filter((x) => x.i.qty < 3).sort((a, b) => b.f.kcal - a.f.kcal)[0];
      if (!t) break;
      t.i.qty += 0.5;
    } else if (day > opts.kcal * 1.08) {
      // shrink, but keep protein foods where they are
      t = its.filter((x) => x.i.qty > 0.5 && META[x.i.foodId].role !== "protein").sort((a, b) => b.i.kcal - a.i.kcal)[0] ?? its.filter((x) => x.i.qty > 0.5).sort((a, b) => b.i.kcal - a.i.kcal)[0];
      if (!t) break;
      t.i.qty -= 0.5;
    } else break;
    t.i.kcal = Math.round(t.f.kcal * t.i.qty);
    t.i.protein = Math.round(t.f.protein * t.i.qty);
    recalc(t.m);
  }
  proteinNow = meals.reduce((a, m) => a + m.protein, 0);

  const kcal = meals.reduce((a, m) => a + m.kcal, 0);
  const protein = proteinNow;
  let note: string | undefined;
  if (known < 12) note = "Henüz neleri sevdiğini tam bilmiyorum. Menüdeki yeni yiyecekleri işaretledikçe sadece sevdiklerinden menü kuracağım.";
  else if (protein < opts.protein * 0.9) note = "Sevdiğin yiyeceklerle protein hedefi zor tutuyor. Yumurta, yoğurt, tavuk ya da ton balığından birini sevdiklerine eklersen menü çok daha iyi olur.";
  return { meals, kcal, protein, knownFoods: known, note };
}

/** Next foods to ask about (unknown, in priority order), max n. */
export function nextQuestions(prefs: Record<string, number>, n = 5): Food[] {
  return ASK_ORDER.filter((id) => prefs[id] === undefined)
    .slice(0, n)
    .map((id) => FOODS.find((f) => f.id === id)!)
    .filter(Boolean);
}

/** Map a logged food name back to the list id (for implicit learning). */
export function foodIdByName(name: string): string | undefined {
  return FOODS.find((f) => f.name === name)?.id;
}
