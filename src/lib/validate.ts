// Strict input validation for the API (rejects "", null, booleans, NaN, impossible dates).
import { z } from "zod";

export function boundedNumber(value: unknown, min: number, max: number): number {
  if ((typeof value !== "number" && typeof value !== "string") || value === "" || (typeof value === "string" && !value.trim())) throw new Error("Geçersiz değer");
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) throw new Error("Geçersiz değer");
  return n;
}

export const foodEntrySchema = z.object({
  name: z.string().trim().min(1).max(80),
  amount: z.string().max(60).optional(),
  kcal: z.number().finite().min(0).max(5000),
  protein: z.number().finite().min(0).max(400).default(0),
  carbs: z.number().finite().min(0).max(800).default(0),
  fat: z.number().finite().min(0).max(400).default(0),
  meal: z.string().max(40).optional(),
  source: z.string().max(30).optional(),
});

export function validFood(value: unknown) {
  const parsed = foodEntrySchema.safeParse(value);
  if (!parsed.success) throw new Error("Yemek adı, porsiyon ve besin değerlerini kontrol et.");
  return parsed.data;
}

export function validDate(value: unknown, earliest: string, latest: string): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Geçersiz tarih");
  const date = new Date(value + "T12:00:00Z");
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value || value < earliest || value > latest) throw new Error("Geçersiz tarih");
  return value;
}
