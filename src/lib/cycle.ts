// Menstrual cycle tracking: predictions, phases, phase-aware guidance and personal patterns.
// Evidence used:
//  - Normal cycle 24–38 days, variation ≤ 7–9 days, bleeding ≤ 8 days (FIGO / MSD Manual).
//  - Energy intake ~168 kcal/day higher in the luteal vs follicular phase (Tucker et al. 2024, Nutr Rev, 15 studies).
//  - Resting metabolic rate slightly higher in the luteal phase, ES 0.33 (Benton et al. 2020, PLoS ONE, 26 studies).
//  - Exercise performance: only a trivial, uncertain dip in the early follicular phase; no general phase rules,
//    individualise instead (McNulty et al. 2020, Sports Med, 73 studies).
//  - Missing periods while dieting can signal low energy availability (IOC REDs consensus 2023).
import { addDays, daysBetween } from "./dates";

export interface CycleDay {
  date: string;
  start?: boolean; // first day of bleeding
  end?: boolean; // last day of bleeding
  flow?: number; // 1 light, 2 medium, 3 heavy
  symptoms?: string[];
  energy?: number; // 1..5 self-rated
}

export const SYMPTOMS = [
  { id: "kramp", label: "Kramp", emoji: "😣" },
  { id: "siskinlik", label: "Şişkinlik", emoji: "🎈" },
  { id: "tatli", label: "Tatlı isteği", emoji: "🍫" },
  { id: "aclik", label: "Çok acıkma", emoji: "🍽️" },
  { id: "yorgunluk", label: "Yorgunluk", emoji: "😴" },
  { id: "moral", label: "Moral düşük", emoji: "🌧️" },
  { id: "basagrisi", label: "Baş ağrısı", emoji: "🤕" },
  { id: "sivilce", label: "Sivilce", emoji: "🔴" },
  { id: "gogus", label: "Göğüs hassasiyeti", emoji: "💢" },
  { id: "enerjik", label: "Enerjik", emoji: "⚡" },
];

export type PhaseKey = "menstrual" | "follicular" | "ovulatory" | "luteal" | "premenstrual";

export const PHASES: Record<PhaseKey, { label: string; emoji: string; color: string; tips: { food: string; hunger: string; training: string; scale: string } }> = {
  menstrual: {
    label: "Adet dönemi",
    emoji: "🌸",
    color: "#ff5d73",
    tips: {
      food: "Demir kaybı var: kırmızı et, mercimek, nohut, yumurta; yanına limon ya da mandalina (C vitamini emilimi artırır). Çayı yemekten 1 saat sonra iç.",
      hunger: "İştah genelde normale dönüyor. Bol su ve sıcak çorba kramplara iyi gelir.",
      training: "Kramp varsa yürüyüş ve hafif esneme yeterli. Kendini iyi hissediyorsan normal antrenmanına devam et, performansa etkisi çok küçük.",
      scale: "Adet öncesi tutulan su bu günlerde atılıyor; tartı birkaç gün içinde düşebilir.",
    },
  },
  follicular: {
    label: "Foliküler evre",
    emoji: "🌱",
    color: "#10b5a3",
    tips: {
      food: "Normal planına devam. İştah çoğu zaman en düşük olduğu dönem, açığı tutturmak daha kolay.",
      hunger: "Tokluk hissi daha kolay geliyor; protein ve sebzeyle bunu kullan.",
      training: "Enerjin yükseliyorsa zorlaştırma zamanı: tekrar ya da set artırmayı bu haftalarda dene.",
      scale: "Tartı en 'dürüst' olduğu dönem; trendi bu günlere göre yorumla.",
    },
  },
  ovulatory: {
    label: "Yumurtlama dönemi",
    emoji: "✨",
    color: "#ffb703",
    tips: {
      food: "Normal planına devam.",
      hunger: "Kısa süreli iştah artışı olabilir, normal.",
      training: "Birçok kadın kendini güçlü hisseder; formunu koruyarak zorlayabilirsin.",
      scale: "Hafif dalgalanma olabilir.",
    },
  },
  luteal: {
    label: "Luteal evre",
    emoji: "🌙",
    color: "#8b5cf6",
    tips: {
      food: "Protein ve lifi artır (yoğurt, yumurta, baklagil, sebze); öğün atlama, açlık birikmesin.",
      hunger: "Bu evrede metabolizma biraz hızlanır ve iştah artar; araştırmalarda günde ortalama ~170 kcal daha fazla yeniyor.",
      training: "Normal antrenmanına devam; nefes ve ısınmayı biraz uzat.",
      scale: "Tartı yavaş inmeye başlayabilir, normal.",
    },
  },
  premenstrual: {
    label: "Adet öncesi",
    emoji: "🌘",
    color: "#a855f7",
    tips: {
      food: "Bu günlerde hedefine küçük bir 'döngü payı' eklendi. Tatlı isteğine plan yap: bitter çikolata, hurma, sütlaç gibi küçük porsiyonlar.",
      hunger: "Açlık ve tatlı isteği artabilir; bu hormonal ve tamamen normal, kendini suçlama.",
      training: "Yorgun hissedersen 5 dakikalık mini antrenman ya da yürüyüş da sayılır.",
      scale: "Su tutulumu 0.5–2 kg ekleyebilir. Bu günlerdeki tartı yağ değil; trende bak.",
    },
  },
};

/** "Inner seasons": a friendly way to read the phases, plus three tiny quests per phase. */
export const SEASONS: Record<PhaseKey, { season: string; mood: string; power: string; quests: { id: string; text: string; emoji: string }[] }> = {
  menstrual: {
    season: "Kış",
    mood: "Yavaşla, kendine iyi bak",
    power: "Dinlenme süper gücü: bugün az ama düzenli hareket yeter.",
    quests: [
      { id: "m_soup", text: "Bir kase mercimek çorbası ya da kırmızı et", emoji: "🥣" },
      { id: "m_stretch", text: "10 dakika esneme ya da yoga", emoji: "🧘‍♀️" },
      { id: "m_water", text: "Bir bardak sıcak su veya bitki çayı", emoji: "🍵" },
    ],
  },
  follicular: {
    season: "İlkbahar",
    mood: "Enerjin yükseliyor",
    power: "Güç süper gücü: antrenmanda bir tekrar fazlasını dene.",
    quests: [
      { id: "f_rep", text: "Antrenmanda bir set ya da tekrar artır", emoji: "💪" },
      { id: "f_walk", text: "30 dakika tempolu sahil yürüyüşü", emoji: "🌊" },
      { id: "f_new", text: "Menüden yeni bir sebze dene", emoji: "🥦" },
    ],
  },
  ovulatory: {
    season: "Yaz",
    mood: "Parıldıyorsun",
    power: "Zirve süper gücü: kendini güçlü hissettiğin günler, formunu koruyarak zorla.",
    quests: [
      { id: "o_pr", text: "Bir harekette kişisel rekorunu dene", emoji: "🏆" },
      { id: "o_run", text: "Yürü-koş aralığını 1 dakika uzat", emoji: "🏃‍♀️" },
      { id: "o_protein", text: "Her öğünde avuç içi kadar protein", emoji: "🍳" },
    ],
  },
  luteal: {
    season: "Sonbahar",
    mood: "Sakin ve istikrarlı",
    power: "İstikrar süper gücü: öğün atlamadan plana sadık kal.",
    quests: [
      { id: "l_fiber", text: "Bir öğüne baklagil ya da salata ekle", emoji: "🥗" },
      { id: "l_sleep", text: "Bu gece 7+ saat uyku", emoji: "😴" },
      { id: "l_snack", text: "Ara öğünü yoğurtla planla", emoji: "🥛" },
    ],
  },
  premenstrual: {
    season: "Sonbahar sonu",
    mood: "Kendine şefkatli ol",
    power: "Şefkat süper gücü: tatlı isteği hormonal, suçluluk yok, plan var.",
    quests: [
      { id: "p_choc", text: "Tatlı isteğine 2 kare bitter çikolata", emoji: "🍫" },
      { id: "p_salt", text: "Bugün tuzu azalt, şişkinlik azalır", emoji: "🧂" },
      { id: "p_walk", text: "Kısa bir akşam yürüyüşü", emoji: "🌙" },
    ],
  },
};
export const QUEST_IDS = Object.values(SEASONS).flatMap((x) => x.quests.map((q) => q.id));

export interface CycleInfo {
  hasData: boolean;
  lastStart?: string;
  day?: number; // cycle day (1 = first day of period)
  avgLen: number;
  periodLen: number;
  cycles: { start: string; length?: number; periodLength?: number }[];
  phase?: PhaseKey;
  inPeriod: boolean;
  nextStart?: string;
  daysToNext?: number;
  ovulationDay?: number;
  lateDays: number;
  flags: { level: "info" | "warn"; text: string }[];
  patterns: string[];
  energyByPhase: Partial<Record<PhaseKey, number>>;
  kcalBonus: number; // added to the calorie target today
  waterWeightLikely: boolean;
}

export function phaseFor(day: number, avgLen: number, periodLen: number): PhaseKey {
  const ovu = Math.max(periodLen + 3, avgLen - 14);
  if (day <= periodLen) return "menstrual";
  if (day < ovu - 1) return "follicular";
  if (day <= ovu + 1) return "ovulatory";
  if (day <= avgLen - 7) return "luteal";
  return "premenstrual";
}

export function analyzeCycle(days: CycleDay[], today: string): CycleInfo {
  const sorted = [...days].filter((d) => d.date <= today).sort((a, b) => a.date.localeCompare(b.date));
  const starts = sorted.filter((d) => d.start).map((d) => d.date);
  const info: CycleInfo = { hasData: starts.length > 0, avgLen: 28, periodLen: 5, cycles: [], inPeriod: false, lateDays: 0, flags: [], patterns: [], energyByPhase: {}, kcalBonus: 0, waterWeightLikely: false };
  if (!starts.length) return info;

  // cycles and period lengths
  const ends = sorted.filter((d) => d.end).map((d) => d.date);
  for (let i = 0; i < starts.length; i++) {
    const s = starts[i];
    const next = starts[i + 1];
    const end = ends.find((e) => e >= s && (!next || e < next));
    info.cycles.push({
      start: s,
      length: next ? daysBetween(s, next) : undefined,
      periodLength: end ? daysBetween(s, end) + 1 : undefined,
    });
  }
  const lens = info.cycles.map((c) => c.length).filter((x): x is number => !!x && x >= 15 && x <= 60).slice(-6);
  const plens = info.cycles.map((c) => c.periodLength).filter((x): x is number => !!x && x >= 1 && x <= 12).slice(-6);
  if (lens.length) info.avgLen = Math.round(lens.reduce((a, b) => a + b, 0) / lens.length);
  if (plens.length) info.periodLen = Math.round(plens.reduce((a, b) => a + b, 0) / plens.length);

  const last = starts[starts.length - 1];
  info.lastStart = last;
  info.day = daysBetween(last, today) + 1;
  const lastEnd = ends.filter((e) => e >= last).pop();
  info.inPeriod = !lastEnd && info.day <= Math.max(info.periodLen, 8);
  info.phase = info.inPeriod ? "menstrual" : phaseFor(info.day, info.avgLen, info.periodLen);
  info.nextStart = addDays(last, info.avgLen);
  info.daysToNext = daysBetween(today, info.nextStart);
  info.ovulationDay = Math.max(info.periodLen + 3, info.avgLen - 14);
  info.lateDays = Math.max(0, info.day - info.avgLen);
  if (info.lateDays > 0) info.phase = "premenstrual";

  // phase-aware adjustments
  if (info.phase === "premenstrual" && info.day <= 45) info.kcalBonus = 150;
  info.waterWeightLikely = info.phase === "premenstrual" || (info.phase === "menstrual" && info.day <= 3);

  // safety & regularity (FIGO normal: 24–38 days, variation ≤ 7–9 days, bleeding ≤ 8 days)
  if (info.day > 45)
    info.flags.push({ level: "warn", text: `Son adetin üzerinden ${info.day - 1} gün geçti. Kalori açığını durdurdum. Gebelik ihtimali yoksa ve gecikme sürerse bir kadın doğum doktoruna görün; diyet sırasında adet kesilmesi düşük enerji işareti olabilir.` });
  else if (info.lateDays >= 7) info.flags.push({ level: "info", text: `Adetin ${info.lateDays} gün gecikti. Stres ve uyku da döngüyü kaydırabilir; birkaç gün daha takip edelim.` });
  if (lens.length >= 3) {
    const spread = Math.max(...lens) - Math.min(...lens);
    if (spread > 9) info.flags.push({ level: "info", text: `Döngü uzunlukların ${Math.min(...lens)}–${Math.max(...lens)} gün arasında değişiyor. Bu fark 7–9 günü aşınca düzensiz sayılır; sürerse doktoruna danış.` });
    if (Math.min(...lens) < 24 || Math.max(...lens) > 38) info.flags.push({ level: "info", text: "Bazı döngülerin normal aralığın (24–38 gün) dışında. Tekrar ederse doktoruna danış." });
  }
  if (plens.some((p) => p > 8)) info.flags.push({ level: "info", text: "Adetin 8 günden uzun sürmüş. Tekrar ederse doktoruna danış." });
  const heavyDays = sorted.filter((d) => d.flow === 3 && d.date >= last).length;
  if (heavyDays >= 3) info.flags.push({ level: "info", text: "Birkaç gündür yoğun kanama işaretledin. Demirden zengin beslen; çok yoğunsa (3 saatten kısa sürede ped dolması) doktoruna danış." });

  // personal patterns: symptoms and energy by phase (needs a few logged days)
  const byPhase: Partial<Record<PhaseKey, { n: number; sym: Record<string, number>; energy: number[] }>> = {};
  for (const d of sorted) {
    const s = [...starts].reverse().find((x) => x <= d.date);
    if (!s) continue;
    const cd = daysBetween(s, d.date) + 1;
    const ph = phaseFor(cd, info.avgLen, info.periodLen);
    const b = (byPhase[ph] ??= { n: 0, sym: {}, energy: [] });
    b.n++;
    for (const x of d.symptoms ?? []) b.sym[x] = (b.sym[x] ?? 0) + 1;
    if (d.energy) b.energy.push(d.energy);
  }
  for (const [ph, b] of Object.entries(byPhase) as [PhaseKey, NonNullable<(typeof byPhase)[PhaseKey]>][]) {
    if (b.energy.length >= 2) info.energyByPhase[ph] = Math.round((b.energy.reduce((a, c) => a + c, 0) / b.energy.length) * 10) / 10;
    const top = Object.entries(b.sym).sort((a, c) => c[1] - a[1])[0];
    if (top && top[1] >= 2) {
      const lab = SYMPTOMS.find((x) => x.id === top[0])?.label.toLocaleLowerCase("tr") ?? top[0];
      info.patterns.push(`${PHASES[ph].label} döneminde en sık "${lab}" işaretliyorsun.`);
    }
  }
  const ranked = Object.entries(info.energyByPhase).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
  if (ranked.length >= 2)
    info.patterns.push(`Kendini en enerjik hissettiğin dönem: ${PHASES[ranked[0][0] as PhaseKey].label}. Zor antrenmanları ve yeni rekor denemelerini bu günlere koy.`);
  return info;
}
