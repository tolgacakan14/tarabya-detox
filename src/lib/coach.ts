// AI diet & training coach. Talks in Turkish, motivational-interviewing style,
// and updates the plan through tools. Every change passes engine guardrails.
import { runChat, extract, extractVision, hasAI, type ToolDef } from "./llm";
import { add, list, setDaily, type UserId } from "./store";
import { buildState, getProfile, saveProfile, type WorkoutLog } from "./state";
import { clampKcalAdjust, clampTargetWeight, type FoodEntry } from "./engine";
import { addDays, nowTime, today as todayFn, trDay } from "./dates";
import { PARTNER } from "./profiles";
import { FOODS } from "./foods";
import { PHASES, type PhaseKey } from "./cycle";
import { LOG_CUSTOM_TOOL, logCustomWorkout, sanitizeActivities } from "./workouts-server";

export { hasAI };

function normTr(s: string) {
  return s.toLocaleLowerCase("tr").replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c").trim();
}

function cycleLine(state: Awaited<ReturnType<typeof buildState>>) {
  const c = state.cycle;
  if (!c) return "";
  if (!c.hasData) return "\n- Döngü: henüz kayıt yok. Uygun bir anda son adetinin başlangıcını uygulamaya girmesini öner (İlerleme > Döngüm).";
  const ph = PHASES[c.phase as PhaseKey];
  return `\n- Döngü (özel, sadece ${state.profile.name} ile konuş, partnerine asla söyleme): ${c.day}. gün, ${ph.label}; ortalama döngü ${c.avgLen} gün; sonraki adet ${c.lateDays > 0 ? c.lateDays + " gün gecikmiş" : "~" + c.daysToNext + " gün sonra"}. Bu evre için: beslenme: ${ph.tips.food} Açlık: ${ph.tips.hunger} Antrenman: ${ph.tips.training} Tartı: ${ph.tips.scale}${c.flags.length ? " Uyarılar: " + c.flags.map((f) => f.text).join(" ") : ""}${c.patterns.length ? " Örüntüler: " + c.patterns.join(" ") : ""}. Adet öncesi iştah artışını ahlaki bir mesele gibi sunma; hormonal ve normal olduğunu söyle. Belirti ve enerji kaydı girmesini teşvik et ki örüntüsünü öğrenelim.`;
}

function bodyLine(state: Awaited<ReturnType<typeof buildState>>) {
  const b = state.body;
  if (!b.latest) return "henüz yok";
  const m = b.latest;
  const parts = [
    m.waist && `bel ${m.waist}`,
    m.hip && `kalça ${m.hip}`,
    m.chest && `göğüs ${m.chest}`,
    m.underbust && `göğüs alt ${m.underbust}`,
    m.arm && `kol ${m.arm}`,
    m.thigh && `üst bacak ${m.thigh}`,
  ].filter(Boolean);
  const ratios = [b.whtr && `bel/boy ${b.whtr}`, b.whr && `bel/kalça ${b.whr}`, b.rfm !== undefined && `tahmini yağ %${b.rfm} (${b.rfmBand})`].filter(Boolean);
  return `${parts.join(", ")} (${m.date}). ${ratios.join(", ")}`;
}

function prefNames(prefs: Record<string, number> | undefined, test: (v: number) => boolean) {
  return Object.entries(prefs ?? {})
    .filter(([, v]) => test(v))
    .map(([id]) => FOODS.find((f) => f.id === id)?.name)
    .filter(Boolean)
    .join(", ");
}

const foodItemSchema = {
  type: "object" as const,
  properties: {
    name: { type: "string", description: "Yemeğin Türkçe adı" },
    amount: { type: "string", description: "Porsiyon, örn. '1 kase', '2 dilim'" },
    kcal: { type: "number" },
    protein: { type: "number", description: "gram" },
    carbs: { type: "number", description: "gram" },
    fat: { type: "number", description: "gram" },
  },
  required: ["name", "amount", "kcal", "protein", "carbs", "fat"],
};

const TOOLS: ToolDef[] = [
  LOG_CUSTOM_TOOL,
  {
    name: "log_food",
    description:
      "Kullanıcının yediği/içtiği şeyleri bugünkü kayda ekler. Kullanıcı bir şey yediğini söylediğinde kullan. Türk mutfağı porsiyonlarını gerçekçi tahmin et; büyük porsiyonları küçük tahmin etme eğilimine karşı dikkatli ol.",
    input_schema: {
      type: "object",
      properties: {
        items: { type: "array", items: foodItemSchema },
        meal: { type: "string", enum: ["kahvaltı", "öğle", "akşam", "ara öğün"] },
        planned: { type: "boolean", description: "Plandaki bir öğün mü, yoksa plansız mı" },
      },
      required: ["items"],
    },
  },
  {
    name: "adjust_calories",
    description:
      "Günlük kalori hedefini kalıcı olarak kaydırır (delta, mevcut ayara eklenir). Toplam ayar -300..+300 (kilo alan için +500) ile sınırlıdır ve güvenlik tabanının altına inemez. Sadece kullanıcı onaylarsa ya da açık bir gerekçe varsa kullan.",
    input_schema: {
      type: "object",
      properties: { delta_kcal: { type: "number" }, reason: { type: "string" } },
      required: ["delta_kcal", "reason"],
    },
  },
  {
    name: "add_todo",
    description: "Kullanıcının bugünkü (veya belirtilen günkü) yapılacaklar listesine bir görev ekler. Her görev tamamlanınca 10 puan.",
    input_schema: {
      type: "object",
      properties: { text: { type: "string" }, date: { type: "string", description: "YYYY-MM-DD, boşsa bugün" } },
      required: ["text"],
    },
  },
  {
    name: "log_measurement",
    description: "Kilo, adım, uyku, su veya vücut ölçülerini kaydeder.",
    input_schema: {
      type: "object",
      properties: {
        weight_kg: { type: "number" },
        steps: { type: "number" },
        sleep_hours: { type: "number" },
        water_glasses: { type: "number", description: "Eklenecek bardak sayısı (250 ml)" },
        waist_cm: { type: "number" },
        arm_cm: { type: "number" },
        chest_cm: { type: "number" },
        thigh_cm: { type: "number" },
        hip_cm: { type: "number" },
        underbust_cm: { type: "number", description: "Göğüs altı (sadece Eylül)" },
      },
    },
  },
  {
    name: "log_workout",
    description: "Yapılan bir aktiviteyi kaydeder (kuvvet antrenmanı detaysız, mini antrenman, yürüyüş, koşu).",
    input_schema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["strength", "mini", "walk", "run"] },
        minutes: { type: "number" },
        with_partner: { type: "boolean" },
      },
      required: ["type"],
    },
  },
  {
    name: "update_preferences",
    description: "Kullanıcının sevdiği/sevmediği yiyecekleri, motivasyon nedenini ve eğer-ise planlarını günceller. Plan önerileri buna göre kişiselleşir.",
    input_schema: {
      type: "object",
      properties: {
        likes: { type: "string" },
        dislikes: { type: "string" },
        why: { type: "string" },
        if_then: { type: "array", items: { type: "string" }, description: "'Eğer ..., o zaman ...' cümleleri" },
      },
    },
  },
  {
    name: "set_food_pref",
    description: "Kullanıcının bir yiyeceği yiyip yemediğini kaydeder. Menü sadece yediklerinden kurulur. value: 2 = çok sever, 1 = yer, -1 = yemez.",
    input_schema: {
      type: "object",
      properties: { food: { type: "string", description: "Yiyecek adı, örn. 'menemen', 'kuru fasulye'" }, value: { type: "number", enum: [2, 1, -1] } },
      required: ["food", "value"],
    },
  },
  {
    name: "remember",
    description: "Koçun ileride hatırlaması gereken kısa bir notu kaydeder (program saatleri, sakatlık, tercih vb.).",
    input_schema: { type: "object", properties: { note: { type: "string" } }, required: ["note"] },
  },
  {
    name: "set_target_weight",
    description: "Hedef kiloyu değiştirir. Kilo verenler için BMI 18.5 altı engellenir.",
    input_schema: { type: "object", properties: { kg: { type: "number" } }, required: ["kg"] },
  },
  {
    name: "start_maintenance",
    description: "Kilo veren kullanıcı için 1-4 haftalık bakım dönemi (diyet arası) başlatır. Yorgunluk, motivasyon düşüklüğü veya plato durumunda öner.",
    input_schema: { type: "object", properties: { weeks: { type: "number" }, reason: { type: "string" } }, required: ["weeks"] },
  },
  {
    name: "report_warning_sign",
    description:
      "Sağlık uyarı işareti kaydeder: adet düzensizliği, baş dönmesi/bayılma, sürekli üşüme, saç dökülmesi, yemekle aşırı meşguliyet, tıkınırcasına yeme, kusma/müshil/aşırı egzersizle telafi, ruh hali çöküşü. Kaydedilince kilo verme açığı otomatik durur.",
    input_schema: { type: "object", properties: { type: { type: "string" } }, required: ["type"] },
  },
];

function systemPrompt(state: Awaited<ReturnType<typeof buildState>>) {
  const p = state.profile;
  const e = state.engine;
  const t = e.targets;
  const gain = p.goal === "gain";
  const tasks = state.todayScore.tasks.map((x) => `${x.done ? "[x]" : "[ ]"} ${x.label}`).join("\n");
  const foods = state.foods.map((f) => `- ${f.time ?? ""} ${f.name} (${f.amount ?? ""}): ${f.kcal} kcal, ${f.protein} g protein${f.planned === false ? ", plansız" : ""}`).join("\n") || "(henüz kayıt yok)";
  const week7 = e.week7.map((d) => `${d.date}: ${d.intake ?? "kayıt yok"}`).join(", ");

  return `Sen "${p.name}" için kişisel diyet ve antrenman koçusun. Uygulama "İkimiz": Tolga ve Eylül adında bir çiftin ortak sitesi. ${p.name} ${gain ? "sağlıklı kilo almak" : "sağlıklı şekilde yağ yakmak"} istiyor; partneri ${state.scores.partner.name} ise ${gain ? "kilo vermek" : "kilo almak"} istiyor.

DİL VE TON
- Türkçe, samimi, sen diliyle konuş. Kısa yaz: çoğu yanıt 2-5 cümle. Sonda tek somut sonraki adım.
- Motivasyonel görüşme: açık sorular sor, çabayı takdir et, seçenek sun, tavsiye vermeden önce gerekirse izin iste. Emir verme, ahlak dersi verme.
- Yiyecekleri "iyi/kötü" diye etiketleme. Suçlama, utandırma yok. "Yemeğini hak et" dili, oruç/telafi önerisi asla yok.
- Kaçırılan bir gün normaldir (alışkanlık ortalama ~66 günde oturur, tek gün bozmuyor).
- Kilo ve kalorilerini partnerininkiyle asla karşılaştırma. Rekabet sadece puan ve çaba üzerinden.

KANITA DAYALI KURALLAR (kendi kafandan değiştirme)
${gain
  ? `- Hedef: haftada vücut ağırlığının ~%0.5'i (0.25-0.3 kg). Fazla ~+300-400 kcal. Protein 1.6-2.2 g/kg, öğün başı ~25 g.
- Düzensiz yeme: "minimum gün" = 3 çapa öğün (her biri 600+ kcal, 25+ g protein) + 1 shake. Enerji yoğun seçenekler: tahin-pekmez, kuruyemiş, tam yağlı süt, shake.
- Antrenman: evde vücut ağırlığı + dambıl, tüm vücut A/B haftada 3. Tekrar aralığının üstüne çıkınca daha zor varyasyon. Koşu günlerinde ek kalori.
- Plato: 3 hafta trend yataysa +150 kcal öner.`
  : `- Hedef: haftada vücut ağırlığının %0.4-0.5'i (~0.25 kg), en fazla %0.7. Açık ~250 kcal (yarısı yemekten, yarısı adımdan).
- Güvenlik tabanı: ${e.floor} kcal'nin altını asla önerme. Hedef kilo BMI 18.5 (${(18.5 * (p.heightCm / 100) ** 2).toFixed(1)} kg) altına inemez. BMI 19.5 altına yaklaşırken doktor/diyetisyen kontrolü öner.
- 8 hafta açıktan sonra 2 hafta bakım (otomatik). Yorgunluk/motivasyon düşerse start_maintenance öner.
- Protein ~1.8 g/kg, lif 25+ g, yağ en az %25. Demir, kalsiyum, D vitamini için kan tahlili öner, doz yazma.
- Egzersiz kalorisi geri yenmez. Adımlar haftada +500 artar, sahil yürüyüşünden yürü-koşa geçiş.
- Tartıdaki sıçramalar (adet öncesi su tutma, tuzlu yemek) normaldir; trend önemli.`}
- Uyarı işareti duyarsan (adet düzensizliği, baş dönmesi, sürekli üşüme, saç dökülmesi, tıkınma, kusma/müshil, aşırı egzersizle telafi, yemekle aşırı meşguliyet): report_warning_sign aracını kullan, nazikçe bir doktor/diyetisyen/psikologla konuşmasını öner. Kriz durumunda 112.
- Tıbbi teşhis koyma, ilaç/takviye dozu verme.

ARAÇ KULLANIMI
- Kullanıcı bir şey yediğini/içtiğini söylerse log_food ile kaydet ve kalori ile proteini kısaca belirt. Porsiyonu bilmiyorsan orta porsiyon varsay ve bunu söyle.
- Adım, kilo, uyku, su, ölçü söylerse log_measurement. Yürüyüş/koşu/antrenman yaptıysa log_workout.
- Hedef değişikliklerini kullanıcıya açıklayarak yap. Araç sonucu bir sınır uyarısı verirse kullanıcıya söyle.

${p.name.toUpperCase()} HAKKINDA
- ${p.age} yaş, ${p.heightCm} cm, başlangıç ${p.startWeight} kg, şu anki trend ${e.currentWeight} kg, hedef ${p.targetWeight} kg.
- Program haftası: ${e.week}, gün ${state.habitDay}. Faz: ${e.phase}. Haftalık trend hızı: ${e.weeklyRate ?? "henüz yeterli veri yok"} kg/hafta.
- Tahmini harcama (TDEE): ${e.tdee} kcal (kendi verisinden öğrenme oranı %${Math.round(e.adaptiveWeight * 100)}).
- Bugünkü hedefler: ${t.kcal} kcal, ${t.protein} g protein, ${t.carbs} g karbonhidrat, ${t.fat} g yağ, ${t.steps} adım, ${8} bardak su. Haftada ${t.sessionsPerWeek} antrenman.
- Ekipman: ${p.equipment}
- Sevdikleri: ${p.likes || "bilinmiyor"} / Sevmedikleri: ${p.dislikes || "bilinmiyor"}
- Seçici yiyici. Yediği yiyecekler: ${prefNames(p.foodPrefs, (v) => v > 0) || "henüz bilinmiyor"}. Yemedikleri: ${prefNames(p.foodPrefs, (v) => v < 0) || "henüz bilinmiyor"}. Menü ve öneriler SADECE yediği yiyeceklerden olsun; yeni bir şey önereceksen tek bir küçük deneme olarak öner ve ısrar etme. Yeni bir tercih öğrenirsen set_food_pref ile kaydet.
- Neden istiyor: ${p.why || "henüz sormadın, uygun bir anda sor"}
- Eğer-ise planları: ${p.ifThen.join(" | ") || "yok"}
- Notlar: ${p.notes.join(" | ") || "yok"}
- Vücut ölçüleri (cm, son değerler): ${bodyLine(state)}
- Ölçü hedefleri: ${state.body.goals.map((g) => `${g.label} ${g.start ?? "?"} → ${g.target} (şimdi ${g.now ?? "?"})`).join("; ") || "henüz ölçü yok"}
- Ölçü yorumları: ${state.body.insights.join(" ") || "yok"}${cycleLine(state)}
- Kilo alırken bel her kg başına 1 cm'den hızlı büyürse fazla azaltılır. Kilo verirken tartı aynı ama bel inceliyorsa bu başarıdır, kaloriyi kesme. Ölçüleri 2-4 haftada bir, sabah aç karnına almasını hatırlat.

BUGÜN (${trDay(state.today)}, saat ${nowTime()})
Yenenler:
${foods}
Toplam: ${Math.round(state.totals.kcal)} kcal, ${Math.round(state.totals.protein)} g protein. Su: ${state.water} bardak. Adım: ${state.steps}.
Bugünkü antrenman planı: ${state.plan.training ? state.plan.session.title : "dinlenme / " + state.plan.cardio.title}.
Görevler:
${tasks}
Son 7 gün kalori: ${week7}

PUAN DURUMU
${p.name}: bu hafta ${state.scores.me.week} puan, toplam ${state.scores.me.total}, seviye ${state.scores.me.level.name}, haftalık seri ${state.scores.me.streak}.
${state.scores.partner.name}: bu hafta ${state.scores.partner.week} puan, toplam ${state.scores.partner.total}.
Biz Göstergesi (ikisinin haftalık ortalama tamamlama oranı): %${Math.round(state.scores.couple * 100)}. %85'e ulaşınca ortak ödül açılıyor.
Rekabeti eğlenceli tut; geride olan tarafa nasıl yetişebileceğini somut görevlerle göster.`;
}

async function runTool(user: UserId, name: string, input: Record<string, unknown>): Promise<string> {
  const date = todayFn();
  const { profile } = await getProfile(user);
  switch (name) {
    case "log_food": {
      const items = (input.items as FoodEntry[]) ?? [];
      for (const it of items) {
        await add<FoodEntry>(user, "food", date, {
          name: String(it.name),
          amount: String(it.amount ?? ""),
          kcal: Math.round(Number(it.kcal) || 0),
          protein: Math.round((Number(it.protein) || 0) * 10) / 10,
          carbs: Math.round((Number(it.carbs) || 0) * 10) / 10,
          fat: Math.round((Number(it.fat) || 0) * 10) / 10,
          meal: input.meal as string | undefined,
          planned: input.planned === true,
          time: nowTime(),
          source: "coach",
        });
      }
      const k = items.reduce((a, i) => a + (Number(i.kcal) || 0), 0);
      return `${items.length} kalem kaydedildi, toplam ${Math.round(k)} kcal.`;
    }
    case "adjust_calories": {
      const next = clampKcalAdjust(profile, profile.kcalAdjust + Number(input.delta_kcal || 0));
      const applied = next - profile.kcalAdjust;
      profile.kcalAdjust = next;
      profile.notes = [...profile.notes, `Kalori ayarı ${applied > 0 ? "+" : ""}${applied}: ${input.reason}`].slice(-20);
      await saveProfile(user, profile);
      return applied === Number(input.delta_kcal)
        ? `Ayar uygulandı. Toplam manuel ayar ${next} kcal. Güvenlik tabanı yine de geçerli.`
        : `Sınır nedeniyle sadece ${applied} kcal uygulanabildi (toplam ayar ${next}).`;
    }
    case "add_todo": {
      const d = (input.date as string) || date;
      await add(user, "todo", d, { text: String(input.text), done: false, from: "coach" });
      return "Görev eklendi.";
    }
    case "log_measurement": {
      const out: string[] = [];
      if (input.weight_kg) {
        await setDaily(user, "weight", date, { kg: Number(input.weight_kg) });
        out.push("kilo");
      }
      if (input.steps) {
        await setDaily(user, "steps", date, { steps: Math.round(Number(input.steps)) });
        out.push("adım");
      }
      if (input.sleep_hours) {
        await setDaily(user, "sleep", date, { hours: Number(input.sleep_hours) });
        out.push("uyku");
      }
      if (input.water_glasses) {
        await add(user, "water", date, { glasses: Math.round(Number(input.water_glasses)) });
        out.push("su");
      }
      const m: Record<string, number> = {};
      for (const k of ["waist_cm", "arm_cm", "chest_cm", "thigh_cm", "hip_cm", "underbust_cm"]) if (input[k]) m[k.replace("_cm", "")] = Number(input[k]);
      if (Object.keys(m).length) {
        const prev = (await list<Record<string, number>>(user, "measure", date, date))[0]?.data ?? {};
        await setDaily(user, "measure", date, { ...prev, ...m });
        out.push("ölçüler");
      }
      return out.length ? `Kaydedildi: ${out.join(", ")}.` : "Kaydedilecek değer yoktu.";
    }
    case "log_workout": {
      const w: WorkoutLog = { type: input.type as WorkoutLog["type"], minutes: Number(input.minutes) || undefined, withPartner: input.with_partner === true };
      await add(user, "workout", date, w);
      return "Aktivite kaydedildi.";
    }
    case "update_preferences": {
      if (input.likes) profile.likes = String(input.likes);
      if (input.dislikes) profile.dislikes = String(input.dislikes);
      if (input.why) profile.why = String(input.why);
      if (Array.isArray(input.if_then)) profile.ifThen = (input.if_then as string[]).slice(0, 6);
      await saveProfile(user, profile);
      return "Tercihler güncellendi.";
    }
    case "log_custom_workout": {
      const acts = sanitizeActivities(input.activities);
      if (!acts.length) return "Aktivite anlaşılamadı, süresini ve ne yaptığını sor.";
      const imp = await logCustomWorkout(user, acts, input.description ? String(input.description) : undefined, input.with_partner === true);
      const ms = Object.entries(imp.muscles).map(([m, v]) => `${m} ${v} set`).join(", ");
      return `Kaydedildi: ${imp.minutes} dk, ~${imp.kcal} kcal net yakım. ${imp.countsAs === "strength" ? "Kuvvet antrenmanı olarak sayıldı (haftalık antrenman sayısına işlendi)." : "Kardiyo olarak sayıldı."}${ms ? " Kas hacmi: " + ms + "." : ""} ${profile.goal === "gain" ? "Ekstra yakılan kalori bugünkü hedefe eklenir (plana denk gelen kuvvet seansı hariç)." : "Kilo verme planında egzersiz kalorisi geri yenmez; 250 kcal üstü seanslarda dörtte biri eklenir."}`;
    }
    case "set_food_pref": {
      const q = normTr(String(input.food));
      const f = FOODS.find((x) => normTr(x.name).includes(q) || q.includes(normTr(x.name).split(" ")[0]));
      const v = Number(input.value);
      if (!f || ![2, 1, -1].includes(v)) {
        profile.notes = [...profile.notes, `${v < 0 ? "Yemez" : "Yer"}: ${input.food}`].slice(-20);
        await saveProfile(user, profile);
        return "Listede yok, not olarak kaydedildi.";
      }
      profile.foodPrefs = { ...(profile.foodPrefs ?? {}), [f.id]: v };
      await saveProfile(user, profile);
      return `${f.name}: ${v < 0 ? "yemez" : v === 2 ? "çok sever" : "yer"} olarak kaydedildi.`;
    }
    case "remember": {
      profile.notes = [...profile.notes, String(input.note)].slice(-20);
      await saveProfile(user, profile);
      return "Not alındı.";
    }
    case "set_target_weight": {
      const r = clampTargetWeight(profile, Number(input.kg));
      if (profile.goal === "gain" && r.value <= profile.startWeight) return "Kilo alma hedefinde hedef başlangıç kilosundan yüksek olmalı.";
      profile.targetWeight = r.value;
      await saveProfile(user, profile);
      return r.note ? `Sınır uygulandı: ${r.note} Hedef ${r.value} kg yapıldı.` : `Hedef ${r.value} kg olarak güncellendi.`;
    }
    case "start_maintenance": {
      if (profile.goal !== "lose") return "Bakım dönemi sadece kilo verme planında kullanılır.";
      const weeks = Math.max(1, Math.min(4, Math.round(Number(input.weeks) || 2)));
      profile.maintenanceUntil = addDays(date, weeks * 7);
      profile.deficitStart = addDays(date, weeks * 7);
      await saveProfile(user, profile);
      return `${weeks} haftalık bakım dönemi başladı, ${profile.maintenanceUntil} tarihinde açık yeniden başlayacak.`;
    }
    case "report_warning_sign": {
      await add(user, "flag", date, { type: String(input.type) });
      return "Uyarı kaydedildi. Kilo verme açığı 14 gün boyunca durduruldu ve bakım kalorisine geçildi.";
    }
  }
  return "Bilinmeyen araç.";
}

export interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

export async function chat(user: UserId, message: string): Promise<{ reply: string; changed: boolean }> {
  const date = todayFn();
  await add<ChatMsg>(user, "chat", date, { role: "user", content: message });
  if (!hasAI()) {
    const reply = "Koçun henüz bağlı değil. Vercel'de GROQ_API_KEY (ücretsiz) ortam değişkeni eklenince seninle konuşmaya başlarım.";
    await add<ChatMsg>(user, "chat", date, { role: "assistant", content: reply });
    return { reply, changed: false };
  }
  const state = await buildState(user);
  const past = (await list<ChatMsg>(user, "chat", addDays(date, -7))).slice(-20);
  const messages = past.map((h) => ({ role: h.data.role, content: h.data.content }));
  while (messages.length && messages[0].role !== "user") messages.shift();

  let reply = "";
  let changed = false;
  try {
    const r = await runChat({
      system: systemPrompt(state),
      history: messages,
      tools: TOOLS,
      exec: (c) => runTool(user, c.name, c.input),
    });
    reply = r.text;
    changed = r.usedTools;
  } catch (e) {
    reply = (e as Error).message.startsWith("Ücretsiz kota") ? (e as Error).message : "Şu an cevap veremedim, birazdan tekrar dener misin?";
    console.error("coach error", e);
  }
  if (!reply) reply = "Tamam, kaydettim.";
  await add<ChatMsg>(user, "chat", date, { role: "assistant", content: reply });
  return { reply, changed };
}

/** Parses a free-text description of an unplanned meal into items with nutrition. */
const FOOD_SYSTEM =
  "Sen bir Türk diyetisyenisin. Yemekleri kalemlere ayır ve her biri için gerçekçi kalori ve makro tahmini yap. Türkiye'deki tipik restoran/ev porsiyonlarını kullan. Büyük porsiyonları küçük tahmin etme (yapay zeka tahminleri büyük porsiyonları sistematik olarak düşük buluyor; bunu telafi et). Porsiyon belirtilmemişse orta porsiyon varsay. Yağda pişen yemeklerin yağını hesaba kat.";

const FOOD_TOOL = {
  name: "food_items",
  description: "Tahmin edilen yemek kalemleri",
  input_schema: { type: "object", properties: { items: { type: "array", items: foodItemSchema } }, required: ["items"] },
};

function cleanItems(out: Record<string, unknown>): FoodEntry[] {
  return (((out as { items?: FoodEntry[] }).items ?? []) as FoodEntry[])
    .slice(0, 12)
    .map((i) => ({
      name: String(i.name ?? "Yemek").slice(0, 80),
      amount: String(i.amount ?? "").slice(0, 60),
      kcal: Math.min(5000, Math.max(0, Math.round(Number(i.kcal) || 0))),
      protein: Math.min(400, Math.max(0, Math.round((Number(i.protein) || 0) * 10) / 10)),
      carbs: Math.min(800, Math.max(0, Math.round((Number(i.carbs) || 0) * 10) / 10)),
      fat: Math.min(400, Math.max(0, Math.round((Number(i.fat) || 0) * 10) / 10)),
    }))
    .filter((i) => i.name.trim());
}

export async function estimateFood(text: string, image?: string): Promise<FoodEntry[]> {
  if (!hasAI()) throw new Error("AI anahtarı tanımlı değil");
  if (image) {
    const out = await extractVision(
      FOOD_SYSTEM +
        " Fotoğraftaki her yemeği ayrı kalem yap. Porsiyonu tabak (yaklaşık 26 cm), kase, çatal-kaşık ve bardak boyutuna göre gram olarak tahmin et ve amount alanına yaz (örn. '1 tabak, ~250 g'). Göremediğin yağ/sos için makul pay ekle. Emin olmadığın bir yemeği en olası Türk yemeği olarak adlandır.",
      text,
      image,
      FOOD_TOOL
    ).catch((e) => {
      if (text.trim()) return null; // photo failed but we have words: use them
      throw e;
    });
    if (out) return cleanItems(out);
  }
  return cleanItems(await extract(FOOD_SYSTEM, text, FOOD_TOOL));
}

export async function history(user: UserId) {
  const recs = await list<ChatMsg>(user, "chat", addDays(todayFn(), -14));
  return recs.slice(-40).map((r) => ({ id: r.id, ...r.data, at: r.created_at }));
}

export { PARTNER };
