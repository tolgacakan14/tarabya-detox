// Body-measurement analysis: ratios, fat estimate and personal tape-measure goals.
// RFM (relative fat mass): Woolcott & Bergman 2018, validated against DXA. 64 − 20·(height/waist) + 12·sex (sex=1 for women).
// WHtR < 0.5 is the common health cut-off (Ashwell); WHR risk cut-offs from WHO (men ≥0.90, women ≥0.85).
import type { Profile } from "./profiles";

export interface Measure {
  date: string;
  waist?: number;
  arm?: number;
  chest?: number; // upper chest
  underbust?: number;
  hip?: number;
  thigh?: number;
}

export const MEASURE_FIELDS: { key: keyof Omit<Measure, "date">; label: (p: Profile) => string }[] = [
  { key: "waist", label: () => "Bel" },
  { key: "hip", label: () => "Kalça" },
  { key: "chest", label: (p) => (p.sex === "f" ? "Göğüs üst" : "Göğüs") },
  { key: "underbust", label: () => "Göğüs alt" },
  { key: "arm", label: () => "Kol" },
  { key: "thigh", label: () => "Üst bacak" },
];

export interface BodyAnalysis {
  latest: Measure | null;
  first: Measure | null;
  whtr?: number;
  whr?: number;
  rfm?: number;
  rfmBand?: string;
  goals: { key: keyof Omit<Measure, "date">; label: string; now?: number; start?: number; target: number; direction: "up" | "down" | "hold" }[];
  insights: string[];
  waistPerKg?: number; // cm of waist change per kg of weight change since first measure
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;

export function analyzeBody(p: Profile, measures: Measure[], currentWeight: number, weightAtFirst?: number): BodyAnalysis {
  const sorted = [...measures].sort((a, b) => a.date.localeCompare(b.date));
  // carry forward last known value of each field so partial check-ins still work
  const merged: Measure | null = sorted.length ? sorted.reduce((acc, m) => ({ ...acc, ...Object.fromEntries(Object.entries(m).filter(([, v]) => v !== undefined && v !== null)) }), {} as Measure) : null;
  const first = sorted[0] ?? null;
  const out: BodyAnalysis = { latest: merged, first, goals: [], insights: [] };
  if (!merged) return out;

  const female = p.sex === "f";
  if (merged.waist) {
    out.whtr = r2(merged.waist / p.heightCm);
    out.rfm = r1(64 - 20 * (p.heightCm / merged.waist) + (female ? 12 : 0));
    const rfm = out.rfm;
    out.rfmBand = female
      ? rfm < 21 ? "düşük" : rfm <= 33 ? "normal" : rfm <= 39 ? "normalin üstü" : "yüksek"
      : rfm < 8 ? "düşük" : rfm <= 20 ? "normal" : rfm <= 25 ? "normalin üstü" : "yüksek";
  }
  if (merged.waist && merged.hip) out.whr = r2(merged.waist / merged.hip);

  const g = (key: keyof Omit<Measure, "date">, label: string, target: number, direction: "up" | "down" | "hold") =>
    out.goals.push({ key, label, now: merged[key] as number | undefined, start: first?.[key] as number | undefined, target: r1(target), direction });

  if (p.goal === "gain") {
    // lean gain: arms/chest/thighs up, waist roughly stable (≤ +3 cm over the whole bulk)
    if (first?.arm) g("arm", "Kol", first.arm + 3, "up");
    if (first?.chest) g("chest", "Göğüs", first.chest + 6, "up");
    if (first?.thigh) g("thigh", "Üst bacak", first.thigh + 3, "up");
    if (first?.waist) g("waist", "Bel (sınır)", first.waist + 3, "hold");
    if (merged.arm && merged.arm < 30) out.insights.push("Kolların ve göğsün en hızlı büyüyecek yerler. Programında kol, göğüs ve sırt hareketlerini atlamamak önemli.");
    if (out.rfm !== undefined && out.rfm <= 20) out.insights.push(`Tahmini yağ oranın %${out.rfm} (${out.rfmBand}). Eksiğin yağ değil kas: yavaş fazla + kuvvet antrenmanı tam sana göre.`);
  } else {
    // fat loss: waist is the main tape metric; aim for WHtR < 0.45 without going below a sensible floor
    if (first?.waist) g("waist", "Bel", Math.max(first.waist - 6, 0.44 * p.heightCm), "down");
    if (first?.hip) g("hip", "Kalça", first.hip - 3, "down");
    if (first?.thigh) g("thigh", "Üst bacak", first.thigh - 2, "down");
    if (first?.arm) g("arm", "Kol (kas korunur)", first.arm, "hold");
    if (out.whtr !== undefined) {
      out.insights.push(
        out.whtr >= 0.5
          ? `Bel/boy oranın ${out.whtr}. Önce bunu 0.5'in altına indirmek en değerli hedef.`
          : `Bel/boy oranın ${out.whtr}, sağlıklı aralıkta. Hedef 0.45'in altı: belin yaklaşık ${r1(0.45 * p.heightCm)} cm.`
      );
    }
    if (out.rfm !== undefined) out.insights.push(`Tahmini yağ oranın %${out.rfm} (${out.rfmBand}). Tartıdan çok bel ölçün inceldikçe doğru yoldasın.`);
  }

  // waist vs weight trend since the first measurement
  if (first?.waist && merged.waist && weightAtFirst !== undefined && sorted.length >= 2) {
    const dW = currentWeight - weightAtFirst;
    const dWaist = merged.waist - first.waist;
    if (Math.abs(dW) >= 0.8) out.waistPerKg = r2(dWaist / dW);
    if (p.goal === "gain" && dW >= 1 && dWaist > dW * 1.0)
      out.insights.push(`Aldığın her kiloda belin ${r2(dWaist / dW)} cm büyüyor. Bu biraz hızlı; fazlayı azaltıyorum ki kilonun çoğu kas olsun.`);
    if (p.goal === "lose" && Math.abs(dW) < 0.8 && dWaist <= -1.5)
      out.insights.push(`Tartı neredeyse aynı ama belin ${Math.abs(r1(dWaist))} cm inceldi. Yağ yakıp kas kazanıyorsun, bu en iyi senaryo!`);
  }
  return out;
}
