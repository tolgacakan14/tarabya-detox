"use client";
import { CustomWorkout, MuscleVolume } from "./CustomWorkout";
import { useState } from "react";
import { useApp, Section } from "./ui";
import { EXERCISES, LADDERS, CARDIO } from "@/lib/training";
import { IntervalPlayer, StrengthPlayer } from "./WorkoutPlayer";
import EnergyPanel from "./Energy";
import Benchmarks from "./Benchmarks";

const DAY_SHORT: Record<string, string> = { pzt: "Pzt", sal: "Sal", car: "Çar", per: "Per", cum: "Cum", cmt: "Cmt", paz: "Paz" };
const KIND_ICON: Record<string, string> = { strength: "💪", cardio: "🏃", circuit: "🔥", walk: "🌊", rest: "😴" };

function ProgramCard() {
  const { s } = useApp();
  const pg = s.program;
  const [player, setPlayer] = useState<"strength" | "cardio" | null>(null);
  const sess = pg.session;
  const todayKind = pg.todayEntry?.kind;
  const strengthDay = todayKind === "strength";
  const cardioToday = pg.cardio ?? null;
  const circuitToday = pg.circuit ?? null;

  return (
    <section className="panel relative overflow-hidden">
      <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full grad-me opacity-15" aria-hidden />
      <p className="label relative">{pg.title}</p>
      <div className="flex items-baseline justify-between gap-2 relative">
        <h2 className="display text-2xl font-bold">
          {pg.week}. hafta · {pg.phase.name}
        </h2>
        <span className="label num shrink-0">
          {pg.sessionsDone}/{pg.sessionsPlanned} antrenman
        </span>
      </div>
      <p className="text-sm mt-1 relative" style={{ color: "var(--ink-2)" }}>
        {pg.coachNote}
      </p>

      {/* week strip */}
      <div className="grid grid-cols-7 gap-1 mt-3 relative">
        {pg.schedule.map((d) => {
          const isToday = d.date === s.today;
          return (
            <div
              key={d.date}
              className="rounded-2xl py-1.5 text-center"
              style={{ background: isToday ? "var(--me)" : d.done ? "var(--me-soft)" : "var(--line)", color: isToday ? "#fff" : "var(--ink)", opacity: d.optional && !d.done && !isToday ? 0.7 : 1 }}
              title={d.label}
            >
              <span className="block text-[10px] font-semibold">{DAY_SHORT[d.day]}</span>
              <span className="block text-lg leading-tight">{d.done ? "✅" : KIND_ICON[d.kind]}</span>
            </div>
          );
        })}
      </div>
      <p className="text-sm mt-2 relative">
        <b>Bugün:</b> {pg.todayEntry?.label ?? "Dinlen"}
        {pg.todayEntry?.together ? " 💑" : ""}
      </p>

      {/* main action */}
      {sess && (strengthDay || !cardioToday) && !pg.strengthDoneToday ? (
        <div className="mt-3 rounded-3xl p-3 relative" style={{ background: "var(--me-soft)" }}>
          <div className="flex items-baseline justify-between">
            <p className="font-bold">{sess.title}</p>
            <span className="label">~{sess.estMinutes} dk</span>
          </div>
          <ol className="mt-2 space-y-1 text-sm">
            {sess.exercises.map((e, i) => {
              const ex = EXERCISES[e.exerciseId];
              const unit = ex.unit === "seconds" ? "sn" : "";
              return (
                <li key={i} className="flex justify-between gap-2">
                  <span className="min-w-0 truncate">
                    {e.pair ? <span className="label">{e.pair} </span> : null}
                    {ex.name}
                    {e.change === "level_up" && <span title="Seviye atladın"> ⬆️</span>}
                  </span>
                  <span className="num shrink-0" style={{ color: "var(--ink-2)" }}>
                    {e.sets}×{e.targets[0]}
                    {unit}
                  </span>
                </li>
              );
            })}
          </ol>
          <button className="btn btn-me w-full mt-3 press !py-4 text-lg" onClick={() => setPlayer("strength")}>
            ▶ Antrenmanı başlat
          </button>
          {!strengthDay && <p className="label mt-1.5 text-center">Bugün planda yok ama yapmak istersen sıradaki seans bu.</p>}
        </div>
      ) : pg.strengthDoneToday ? (
        <p className="mt-3 rounded-2xl p-3 text-sm font-semibold" style={{ background: "var(--me-soft)" }}>
          ✅ Bugünün antrenmanı tamam. Kas dinlenirken büyür; bol protein ve uyku.
        </p>
      ) : !sess ? (
        <p className="mt-3 rounded-2xl p-3 text-sm font-semibold" style={{ background: "var(--me-soft)" }}>
          🎉 Bu haftanın tüm antrenmanları bitti. Yürüyüş ve adımlarla devam.
        </p>
      ) : null}

      {(cardioToday || circuitToday) && (
        <div className="mt-3 rounded-3xl p-3 border-2 relative" style={{ borderColor: "var(--line)" }}>
          <p className="font-bold">{cardioToday?.title ?? circuitToday?.title}</p>
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            {cardioToday?.feel ?? circuitToday?.feel}
          </p>
          <button className={`btn ${strengthDay ? "btn-ghost" : "btn-me"} w-full mt-3 press !py-3`} onClick={() => setPlayer("cardio")}>
            ▶ Sesli zamanlayıcıyla başlat
          </button>
        </div>
      )}

      {player === "strength" && sess && <StrengthPlayer session={sess} onClose={() => setPlayer(null)} />}
      {player === "cardio" && <IntervalPlayer cardio={cardioToday} circuit={cardioToday ? null : circuitToday} onClose={() => setPlayer(null)} />}
    </section>
  );
}

function Ladders() {
  const { s } = useApp();
  const sess = s.program.session;
  if (!sess) return null;
  return (
    <details className="panel">
      <summary className="display text-xl font-semibold cursor-pointer">🪜 Seviye merdivenlerin</summary>
      <ul className="mt-3 space-y-3">
        {sess.exercises.map((e) => {
          const steps = LADDERS[e.ladder].steps;
          return (
            <li key={e.ladder}>
              <p className="font-semibold">{LADDERS[e.ladder].name}</p>
              <div className="flex gap-1 mt-1">
                {steps.map((id, k) => (
                  <span key={id} className="h-2 flex-1 rounded-full" title={EXERCISES[id].name} style={{ background: k <= e.step ? "var(--me)" : "var(--line)" }} />
                ))}
              </div>
              <p className="label mt-0.5">
                Şu an: {EXERCISES[steps[e.step]].name}
                {e.step < steps.length - 1 ? ` · sonraki: ${EXERCISES[steps[e.step + 1]].name}` : " · zirvedesin"}
              </p>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

export default function Workout() {
  const { s, act } = useApp();
  const plan = s.plan;
  const [walkMin, setWalkMin] = useState(String(plan.cardio.minutes));
  const [together, setTogether] = useState(false);
  const [cardioType, setCardioType] = useState<"walk" | "run">("walk");
  const [free, setFree] = useState<"walk" | null>(null);
  const doneToday = s.workoutsToday;

  return (
    <div className="grid grid-cols-1 gap-4">
      <ProgramCard />
      <EnergyPanel />
      <CustomWorkout />

      <Section title={plan.mini.title}>
        <p className="text-sm" style={{ color: "var(--ink-2)" }}>
          Günün çok yoğunsa bunu yap. Hiç yapmamaktan çok daha iyi ve seriyi korur.
        </p>
        <ol className="list-decimal pl-5 mt-2 space-y-0.5">
          {plan.mini.steps.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ol>
        <button className="btn mt-3 press" onClick={() => act({ action: "workout", log: { type: "mini", minutes: 5 } }, { toast: "Mini antrenman tamam", points: 15 })}>
          Mini antrenmanı yaptım
        </button>
      </Section>

      <Section title="Yürüyüş / koşu kaydet">
        <div className="flex gap-2">
          <button className="chip press" aria-pressed={cardioType === "walk"} onClick={() => setCardioType("walk")}>
            Yürüyüş
          </button>
          <button className="chip press" aria-pressed={cardioType === "run"} onClick={() => setCardioType("run")}>
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
        <p className="label mt-1">İkiniz de &quot;birlikte&quot; olarak kaydedince ikinize de +20 puan.</p>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <button className="btn btn-me press" disabled={!walkMin} onClick={() => act({ action: "workout", log: { type: cardioType, minutes: Number(walkMin), withPartner: together } }, { toast: "Kaydedildi", points: 20 })}>
            Kaydet
          </button>
          <button className="btn btn-ghost press" onClick={() => setFree("walk")}>
            ⏱ Zamanlayıcı
          </button>
        </div>
        {free && <IntervalPlayer cardio={CARDIO.walk_brisk_30} onClose={() => setFree(null)} />}
        {s.profile.goal === "gain" && <p className="label mt-2">Koştuğun gün bir shake ya da bir avuç kuruyemiş ekle, yoksa yaktığın enerji kilo almayı yavaşlatır.</p>}
      </Section>

      {doneToday.length > 0 && (
        <Section title="Bugün yaptıkların">
          <ul className="space-y-1.5">
            {doneToday.map((w) => (
              <li key={w.id} className="flex justify-between gap-2">
                <span>
                  {w.custom
                    ? w.activities?.map((a) => a.name).join(" + ") || "Kendi antrenmanım"
                    : w.v2
                      ? `Program antrenmanı ${w.v2.template.replace(/^[te]_/, "")}`
                      : { strength: "Kuvvet antrenmanı", mini: "Mini antrenman", walk: "Yürüyüş", run: "Koşu" }[w.type]}
                  {w.minutes ? `, ${w.minutes} dk` : ""}
                  {w.kcal ? `, ~${w.kcal} kcal` : ""}
                  {w.v2?.prs ? `, ${w.v2.prs} rekor 🏆` : ""}
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
      <Benchmarks />
      <Ladders />
      <MuscleVolume />
    </div>
  );
}
