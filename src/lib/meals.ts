// Daily meal templates built from the Turkish food list. Tap a meal to log it as planned.
import { FOODS } from "./foods";
import type { UserId } from "./store";

export interface MealTemplate {
  meal: string;
  title: string;
  items: { id: string; qty: number }[];
}

export const MEAL_PLANS: Record<UserId, MealTemplate[][]> = {
  tolga: [
    [
      { meal: "kahvaltı", title: "Menemenli kahvaltı", items: [{ id: "menemen3", qty: 1 }, { id: "beyazekmek", qty: 2 }, { id: "beyazpeynir", qty: 1 }, { id: "sut", qty: 1 }] },
      { meal: "ara öğün", title: "Kilo shake'i", items: [{ id: "shake", qty: 1 }] },
      { meal: "öğle", title: "Fasulye pilav ayran", items: [{ id: "kurufasulye", qty: 1 }, { id: "pilav", qty: 1 }, { id: "ayran", qty: 1 }] },
      { meal: "ara öğün", title: "Kuruyemiş ve muz", items: [{ id: "kuruyemis", qty: 1 }, { id: "muz", qty: 1 }] },
      { meal: "akşam", title: "Köfte, pilav, yoğurt", items: [{ id: "kofte", qty: 1 }, { id: "pilav", qty: 1 }, { id: "yogurt", qty: 1 }] },
    ],
    [
      { meal: "kahvaltı", title: "Tahin-pekmezli kahvaltı", items: [{ id: "tahinpekmez", qty: 1 }, { id: "yumurta", qty: 3 }, { id: "beyazekmek", qty: 2 }, { id: "kasar", qty: 1 }] },
      { meal: "ara öğün", title: "Kilo shake'i", items: [{ id: "shake", qty: 1 }] },
      { meal: "öğle", title: "Tavuk döner porsiyon + ayran", items: [{ id: "donerporsiyon", qty: 1 }, { id: "pilav", qty: 1 }, { id: "ayran", qty: 1 }] },
      { meal: "ara öğün", title: "Hurma ve badem", items: [{ id: "hurma", qty: 1 }, { id: "badem", qty: 1 }] },
      { meal: "akşam", title: "Tavuk but, makarna", items: [{ id: "tavukbut", qty: 1 }, { id: "makarna", qty: 1 }, { id: "salata", qty: 1 }] },
    ],
  ],
  eylul: [
    [
      { meal: "kahvaltı", title: "Yumurtalı kahvaltı", items: [{ id: "yumurta", qty: 2 }, { id: "tamekmek", qty: 1 }, { id: "lor", qty: 1 }, { id: "salata", qty: 1 }] },
      { meal: "öğle", title: "Mercimek ve tavuk", items: [{ id: "mercimek", qty: 1 }, { id: "tavukizgara", qty: 1 }, { id: "salata", qty: 1 }] },
      { meal: "ara öğün", title: "Süzme yoğurt ve meyve", items: [{ id: "suzmeyogurt", qty: 1 }, { id: "mandalina", qty: 1 }] },
      { meal: "akşam", title: "Balık, bulgur, zeytinyağlı", items: [{ id: "balik", qty: 1 }, { id: "bulgur", qty: 0.5 }, { id: "zeytinyagli", qty: 1 }] },
    ],
    [
      { meal: "kahvaltı", title: "Menemen ve peynir", items: [{ id: "menemen", qty: 1 }, { id: "tamekmek", qty: 1 }, { id: "beyazpeynir", qty: 0.5 }] },
      { meal: "öğle", title: "Tavuk döner, salatada", items: [{ id: "donerporsiyon", qty: 1 }, { id: "ayran", qty: 1 }] },
      { meal: "ara öğün", title: "Elma ve badem", items: [{ id: "elma", qty: 1 }, { id: "badem", qty: 1 }] },
      { meal: "akşam", title: "Köfte ve zeytinyağlı", items: [{ id: "kofte", qty: 1 }, { id: "zeytinyagli", qty: 1 }, { id: "yogurt", qty: 1 }] },
    ],
  ],
};

export function mealTotals(t: MealTemplate) {
  let kcal = 0,
    protein = 0;
  for (const it of t.items) {
    const f = FOODS.find((x) => x.id === it.id);
    if (!f) continue;
    kcal += f.kcal * it.qty;
    protein += f.protein * it.qty;
  }
  return { kcal: Math.round(kcal), protein: Math.round(protein) };
}

/** End-of-day gap filler suggestions for the gainer. */
export const GAP_FILLERS = [
  { text: "Kilo shake'i", kcal: 760, protein: 27, items: [{ id: "shake", qty: 1 }] },
  { text: "Tahin-pekmez + 1 dilim ekmek", kcal: 380, protein: 8, items: [{ id: "tahinpekmez", qty: 1 }, { id: "beyazekmek", qty: 1 }] },
  { text: "Bir avuç kuruyemiş + bir bardak süt", kcal: 335, protein: 13.5, items: [{ id: "kuruyemis", qty: 1 }, { id: "sut", qty: 1 }] },
  { text: "Kaşarlı tost + ayran", kcal: 450, protein: 20.5, items: [{ id: "tost", qty: 1 }, { id: "ayran", qty: 1 }] },
];

/** Protein-first, low-energy-density suggestions for the loser. */
export const PROTEIN_FILLERS = [
  { text: "Süzme yoğurt", kcal: 140, protein: 14.5, items: [{ id: "suzmeyogurt", qty: 1 }] },
  { text: "Lor peyniri + domates/salatalık", kcal: 185, protein: 14, items: [{ id: "lor", qty: 1 }, { id: "salata", qty: 1 }] },
  { text: "2 haşlanmış yumurta", kcal: 150, protein: 13, items: [{ id: "yumurta", qty: 2 }] },
  { text: "Ton balığı + salata", kcal: 240, protein: 32, items: [{ id: "ton", qty: 1 }, { id: "salata", qty: 1 }] },
];
