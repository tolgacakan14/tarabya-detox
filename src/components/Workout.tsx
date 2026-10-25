"use client";
import { useState } from "react";
import { useApp, Section } from "./ui";
import { EXERCISES, SESSIONS } from "@/lib/programs";

type Row = { id: string; level: number; sets: string[] };

export default function Workout() {
  const { s, act } = useApp();
  const plan = s.plan;
  const [sessionKey, setSessionKey] = useState(plan.session.key);
  const session = SESSIONS[s.user].find((x) => x.key === sessionKey) ?? plan.session;
  const sets = plan.phase.sets;

  const init = (): Row[] =>
    session.exercises.map((id) => {
      const m = plan.exerciseMemory[id];
      const def = EXERCISES[id];
      const lvl = m ? Math.min(def.ladder.length - 1, m.level) : 0;
      return { id, level: lvl, sets: Array(sets).fill("") };
    });
  const [rows, setRows] = useState<Row[]>(init);
  const [open, setOpen] = useState<string | null>(null);
  const [walkMin, setWalkMin] = useState(String(plan.cardio.minutes));
  const [together, setTogether] = useState(false);
  const [cardioType, setCardioType] = useState<"walk" | "run">("walk");
  const doneToday = s.workoutsToday;

  const switchSession = (k: string) => {
    setSessionKey(k);
    const sess = SESSIONS[s.user].find((x) => x.key === k)!;
    setRows(
      sess.exercises.map((id) => {
        const m = plan.exerciseMemory[id];
        return { id, level: m ? Math.min(EXERCISES[id].ladder.length - 1, m.level) : 0, sets: Array(sets).fill("") };
      })
    );
  };

  return (
    <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
      <Section
        title={session.title}
        aside={
          <div className="flex gap-1">
            {SESSIONS[s.user].map((x) => (
              <button key={x.key} className="chip !py-1" aria-pressed={x.key === sessionKey} onClick={() => switchSession(x.key)}>
                {x.key}
              </button>
            ))}
          </div>
        }
      >
        <p className="text-sm" style={{ color: "var(--ink-2)" }}>
          {s.engine.week}. hafta: {sets} set, her sette {plan.phase.rir} tekrar yedekte bırak. {plan.phase.note}
        </p>
        <p className="label mt-1">Bu hafta {plan.sessionsDoneThisWeek}/{s.engine.targets.sessionsPerWeek} antrenman. Bir günü kaçırırsan sıradaki gün devam et; iki antrenmanı bir güne sıkıştırma.</p>

        <ol className="mt-4 space-y-3">
          {rows.map((r, i) => {
            const def = EXERCISES[r.id];
            const v = def.ladder[r.level];
            const mem = plan.exerciseMemory[r.id];
            const unit = def.seconds ? "sn" : "tekrar";
            return (
              <li key={r.id + i} className="rounded-xl border-[1.5px] p-3" style={{ borderColor: "var(--line)" }}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="label">{def.muscle}</p>
                    <p className="font-semibold">{v.name}</p>
                    <p className="label">
                      Hedef {def.repMin}-{def.repMax} {unit}
                      {def.perSide ? " (her taraf)" : ""}
                      {mem ? `, geçen sefer: ${mem.sets.filter(Boolean).join(" / ")}` : ""}
                    </p>
                  </div>
                  <button className="label underline whitespace-nowrap" onClick={() => setOpen(open === r.id ? null : r.id)}>
                    {open === r.id ? "Kapat" : "Nasıl?"}
                  </button>
                </div>
                {open === r.id && <p className="text-sm mt-2">{v.how}</p>}
                {mem?.levelUp && r.level === mem.level && r.level < def.ladder.length - 1 && (
                  <p className="text-sm mt-2 rounded-lg px-3 py-2" style={{ background: "var(--me-soft)", color: "var(--me-ink)" }}>
                    Geçen sefer tüm setlerde üst sınıra ulaştın. Seviye atlama zamanı.
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {r.sets.map((val, k) => (
                    <input
                      key={k}
                      className="field num !w-16 text-center"
                      inputMode="numeric"
                      placeholder={`${k + 1}. set`}
                      aria-label={`${v.name} ${k + 1}. set ${unit}`}
                      value={val}
                      onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, sets: x.sets.map((y, m) => (m === k ? e.target.value.replace(/\D/g, "") : y)) } : x)))}
                    />
                  ))}
                  <span className="label">{unit}</span>
                  <div className="ml-auto flex gap-1">
                    <button className="chip !py-1" disabled={r.level === 0} onClick={() => setRows(rows.map((x, j) => (j === i ? { ...x, level: x.level - 1 } : x)))} aria-label="Daha kolay varyasyon">
                      Kolaylaştır
                    </button>
                    <button className="chip !py-1" disabled={r.level >= def.ladder.length - 1} onClick={() => setRows(rows.map((x, j) => (j === i ? { ...x, level: x.level + 1 } : x)))} aria-label="Daha zor varyasyon">
                      Zorlaştır
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
        <button
          className="btn btn-me mt-4 w-full"
          disabled={!rows.some((r) => r.sets.some(Boolean))}
          onClick={async () => {
            const ok = await act(
              { action: "workout", log: { type: "strength", session: session.key, exercises: rows.map((r) => ({ id: r.id, level: r.level, sets: r.sets.map((x) => Number(x) || 0) })) } },
              { toast: "Antrenman kaydedildi", points: 40 }
            );
            if (ok) setRows(init());
          }}
        >
          Antrenmanı bitir
        </button>
      </Section>

      <div className="space-y-4">
        <Section title={plan.mini.title}>
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            Günün çok yoğunsa bunu yap. Hiç yapmamaktan çok daha iyi ve seriyi korur.
          </p>
          <ol className="list-decimal pl-5 mt-2 space-y-0.5">
            {plan.mini.steps.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ol>
          <button className="btn mt-3" onClick={() => act({ action: "workout", log: { type: "mini", minutes: 5 } }, { toast: "Mini antrenman tamam", points: 15 })}>
            Mini antrenmanı yaptım
          </button>
        </Section>

        <Section title={plan.cardio.title}>
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>{plan.cardio.detail}</p>
          <div className="flex gap-2 mt-3">
            <button className="chip" aria-pressed={cardioType === "walk"} onClick={() => setCardioType("walk")}>
              Yürüyüş
            </button>
            <button className="chip" aria-pressed={cardioType === "run"} onClick={() => setCardioType("run")}>
              Koşu / yürü-koş
            </button>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <input className="field num !w-24" inputMode="numeric" value={walkMin} onChange={(e) => setWalkMin(e.target.value.replace(/\D/g, ""))} aria-label="Dakika" />
            <span className="label">dakika</span>
          </div>
          <label className="flex items-center gap-2 mt-3">
            <input type="checkbox" checked={together} onChange={(e) => setTogether(e.target.checked)} className="w-5 h-5 accent-[var(--me)]" />
            <span>{s.scores.partner.name} ile birlikte</span>
          </label>
          <p className="label mt-1">İkiniz de "birlikte" olarak kaydedince ikinize de +20 puan.</p>
          <button
            className="btn btn-me mt-3"
            disabled={!walkMin}
            onClick={() => act({ action: "workout", log: { type: cardioType, minutes: Number(walkMin), withPartner: together } }, { toast: "Kaydedildi", points: 20 })}
          >
            Kaydet
          </button>
          {s.profile.goal === "gain" && <p className="label mt-2">Koştuğun gün bir shake ya da bir avuç kuruyemiş ekle, yoksa yaktığın enerji kilo almayı yavaşlatır.</p>}
        </Section>

        {doneToday.length > 0 && (
          <Section title="Bugün yaptıkların">
            <ul className="space-y-1.5">
              {doneToday.map((w) => (
                <li key={w.id} className="flex justify-between gap-2">
                  <span>
                    {{ strength: "Kuvvet antrenmanı", mini: "Mini antrenman", walk: "Yürüyüş", run: "Koşu" }[w.type]}
                    {w.session ? ` ${w.session}` : ""}
                    {w.minutes ? `, ${w.minutes} dk` : ""}
                    {w.withPartner ? ", birlikte" : ""}
                  </span>
                  <button className="label underline" onClick={() => act({ action: "delete", id: w.id })}>
                    Sil
                  </button>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    </div>
  );
}
