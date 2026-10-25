"use client";
// "I trained my own way": describe it, the engine estimates burn + muscle volume and shows the effect on the plan.
import { useState } from "react";
import { useApp } from "./ui";
import { eatBack, workoutImpact, MUSCLE_LABEL, type Activity, type Intensity, type Muscle } from "@/lib/activity";

const EXAMPLES = ["45 dk şınav, squat, plank devresi yaptım", "Sahilde 5 km'yi 35 dakikada koştum", "1 saat halı saha maçı", "30 dk yoga"];
const INT: [Intensity, string][] = [
  ["light", "Hafif"],
  ["moderate", "Orta"],
  ["vigorous", "Zor"],
];

export function CustomWorkout() {
  const { s, act } = useApp();
  const [text, setText] = useState("");
  const [acts, setActs] = useState<Activity[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [together, setTogether] = useState(false);
  const kg = s.lastWeight ?? s.profile.startWeight;
  const imp = acts ? workoutImpact(acts, kg) : null;

  async function parse(t: string) {
    if (!t.trim()) return;
    setBusy(true);
    const r = await fetch("/api/parse-workout", { method: "POST", body: JSON.stringify({ text: t }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    setBusy(false);
    setActs(j.activities ?? []);
  }

  // what this does to today's plan (mirrors the server logic)
  const strengthDone = s.plan.sessionsDoneThisWeek;
  const replacesPlan = imp?.countsAs === "strength" && strengthDone < s.engine.targets.sessionsPerWeek;
  const extra = imp ? (replacesPlan ? imp.kcal - Math.round(acts!.filter((a) => a.category === "strength").reduce((t, a) => t + (imp.kcal * a.minutes) / Math.max(1, imp.minutes), 0)) : imp.kcal) : 0;
  const added = eatBack(s.profile.goal, Math.max(0, extra));

  return (
    <section className="panel">
      <h2 className="display text-xl font-bold">🏃 Kendi antrenmanımı yaptım</h2>
      <p className="text-sm mt-1" style={{ color: "var(--ink-2)" }}>
        Plan dışında ne yaptıysan anlat; kaloriyi, çalışan kasları ve planına etkisini hesaplayayım.
      </p>
      {!acts && (
        <>
          <textarea className="field min-h-20 mt-3" value={text} onChange={(e) => setText(e.target.value)} placeholder="Örn: 40 dk evde şınav, squat, lunge; sonra 10 dk ip atladım" />
          <div className="flex gap-1.5 scroll-x mt-2 max-w-full">
            {EXAMPLES.map((x) => (
              <button key={x} className="chip whitespace-nowrap !text-[13px] !py-1 press" onClick={() => setText(x)}>
                {x}
              </button>
            ))}
          </div>
          <button className="btn btn-me w-full mt-3 press" disabled={!text.trim() || busy} onClick={() => parse(text)}>
            {busy ? "Anlıyorum…" : "Hesapla"}
          </button>
        </>
      )}

      {acts && (
        <div className="mt-3">
          {acts.length === 0 && <p className="text-sm">Anlayamadım, biraz daha ayrıntı yazar mısın?</p>}
          <ul className="space-y-2">
            {acts.map((a, i) => (
              <li key={i} className="rounded-2xl p-3" style={{ background: "var(--mist)" }}>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{a.name}</p>
                  <button className="label underline" onClick={() => setActs(acts.filter((_, k) => k !== i))}>
                    Çıkar
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    className="field num !w-20 !py-1.5 text-center"
                    inputMode="numeric"
                    value={a.minutes}
                    aria-label="Dakika"
                    onChange={(e) => setActs(acts.map((x, k) => (k === i ? { ...x, minutes: Number(e.target.value.replace(/\D/g, "")) || 0 } : x)))}
                  />
                  <span className="label">dk</span>
                  <div className="flex gap-1 ml-auto">
                    {INT.map(([v, l]) => (
                      <button key={v} className="chip !px-2.5 !py-1 !text-[13px] press" aria-pressed={a.intensity === v} onClick={() => setActs(acts.map((x, k) => (k === i ? { ...x, intensity: v } : x)))}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                {a.muscles && a.muscles.length > 0 && <p className="label mt-1.5">{a.muscles.map((m) => MUSCLE_LABEL[m]).join(", ")}</p>}
              </li>
            ))}
          </ul>

          {imp && imp.minutes > 0 && (
            <div className="rounded-2xl p-3 mt-3 space-y-1 text-sm" style={{ background: "var(--me-soft)" }}>
              <p className="display text-2xl font-bold">
                ~{imp.kcal} kcal <span className="text-sm font-normal">({imp.minutes} dk)</span>
              </p>
              <p>{imp.countsAs === "strength" ? (replacesPlan ? "✅ Bugünkü planlı antrenmanın yerine sayılır." : "💪 Planın üstüne ekstra kuvvet seansı.") : "🫀 Kardiyo olarak sayılır."}</p>
              {Object.keys(imp.muscles).length > 0 && (
                <p>
                  🧱 Kas hacmi:{" "}
                  {Object.entries(imp.muscles)
                    .map(([m, v]) => `${MUSCLE_LABEL[m as Muscle]} +${v}`)
                    .join(", ")}{" "}
                  set
                </p>
              )}
              <p>
                🍽️{" "}
                {s.profile.goal === "gain"
                  ? added > 0
                    ? `Bugünkü hedefine +${added} kcal eklenecek ki kilo almaya devam et.`
                    : "Planlı seans yerine geçtiği için hedefin değişmiyor."
                  : added > 0
                    ? `Büyük seans: hedefine +${added} kcal eklenecek, gerisi yağ yakımına.`
                    : "Hedefin değişmiyor; bu açık doğrudan yağ yakımına gidiyor."}
              </p>
              <p>⭐ +{imp.countsAs === "strength" ? 40 : 20} puan</p>
            </div>
          )}

          <label className="flex items-center gap-2 mt-3">
            <input type="checkbox" checked={together} onChange={(e) => setTogether(e.target.checked)} className="w-5 h-5" />
            <span>{s.scores.partner.name} ile birlikte</span>
          </label>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <button className="btn btn-ghost press" onClick={() => setActs(null)}>
              Geri
            </button>
            <button
              className="btn btn-me press"
              disabled={!acts.length || !imp?.minutes}
              onClick={async () => {
                const ok = await act({ action: "customWorkout", activities: acts, desc: text, withPartner: together }, { toast: "Antrenman kaydedildi 💪", points: imp?.countsAs === "strength" ? 40 : 20, celebrate: true });
                if (ok) {
                  setActs(null);
                  setText("");
                }
              }}
            >
              Kaydet
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export function MuscleVolume() {
  const { s } = useApp();
  const order: Muscle[] = s.profile.goal === "gain" ? ["chest", "back", "arms", "shoulders", "legs", "glutes", "core"] : ["legs", "glutes", "back", "chest", "shoulders", "arms", "core"];
  const t = s.muscleTarget;
  return (
    <section className="panel">
      <div className="flex items-baseline justify-between">
        <h2 className="display text-xl font-bold">Bu haftaki kas hacmi</h2>
        <span className="label">hedef ~{t} set / kas</span>
      </div>
      <ul className="mt-3 space-y-2">
        {order.map((m) => {
          const v = s.weekMuscles[m] ?? 0;
          return (
            <li key={m} className="grid grid-cols-[72px_1fr_44px] items-center gap-2 text-sm">
              <span>{MUSCLE_LABEL[m]}</span>
              <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "var(--line)" }}>
                <div className="h-full rounded-full grad-me transition-[width] duration-700" style={{ width: `${Math.min(100, (v / t) * 100)}%` }} />
              </div>
              <span className="num text-right" style={{ color: v >= t ? "var(--good)" : "var(--ink-2)" }}>
                {Math.round(v)}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="text-xs mt-2" style={{ color: "var(--ink-3)" }}>
        Planlı antrenmanların ve kendi antrenmanların birlikte sayılır. Haftalık set hedefi Schoenfeld 2017 ve Pelland 2026 meta-analizlerine göre.
      </p>
    </section>
  );
}
