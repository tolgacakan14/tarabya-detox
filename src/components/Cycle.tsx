"use client";
// Eylül's cycle: "inner seasons", one-tap check-in, an interactive wheel and a 2-week strip,
// tiny phase quests and phase-aware guidance. Private to her (the API never sends it to Tolga).
import { useState } from "react";
import { useApp } from "./ui";
import { PHASES, SEASONS, SYMPTOMS, phaseFor, type PhaseKey } from "@/lib/cycle";
import { addDays } from "@/lib/dates";

const trDate = (d?: string) => (d ? new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(d + "T12:00:00Z")) : "");
const trShort = (d: string) => new Intl.DateTimeFormat("tr-TR", { weekday: "short", timeZone: "UTC" }).format(new Date(d + "T12:00:00Z"));
const ENERGY = ["😩", "😕", "🙂", "😊", "🤩"];

type Log = { flow?: number; symptoms?: string[]; energy?: number; quests?: string[] };

/** cycle day → predicted phase, wrapping into the next predicted cycle */
function predict(day: number, avgLen: number, periodLen: number): { phase: PhaseKey; day: number } {
  const d = ((day - 1) % avgLen) + 1;
  return { phase: phaseFor(d, avgLen, periodLen), day: d };
}

function PhaseBlob({ phase, size = 64 }: { phase: PhaseKey; size?: number }) {
  const ph = PHASES[phase];
  return (
    <span
      className="cycle-blob grid place-items-center shrink-0"
      style={{ width: size, height: size, background: `radial-gradient(circle at 30% 25%, #fff, ${ph.color}55 45%, ${ph.color})`, fontSize: size * 0.45 }}
      aria-hidden
    >
      {ph.emoji}
    </span>
  );
}

function statusText(c: NonNullable<ReturnType<typeof useApp>["s"]["cycle"]>) {
  if (c.inPeriod) return `Adetinin ${c.day}. günü`;
  if (c.lateDays > 0) return `${c.lateDays} gün gecikti`;
  if ((c.daysToNext ?? 99) <= 3) return `Adetin ${c.daysToNext === 0 ? "bugün" : `${c.daysToNext} gün içinde`} bekleniyor`;
  return `${c.day}. gün · adete ~${c.daysToNext} gün`;
}

export function CycleMini() {
  const { s, act, go } = useApp();
  const c = s.cycle;
  if (!c || s.profile.cycleTracking === false) return null;
  if (!c.hasData) {
    return (
      <button className="panel w-full text-left press flex items-center gap-3" onClick={() => go("ilerleme")}>
        <PhaseBlob phase="follicular" size={52} />
        <span>
          <span className="display text-lg font-bold block">Döngünü takip edelim 🌸</span>
          <span className="text-sm" style={{ color: "var(--ink-2)" }}>Son adetinin başladığı günü bir kez gir, planın döngüne göre ayarlansın.</span>
        </span>
      </button>
    );
  }
  const phase = c.phase as PhaseKey;
  const se = SEASONS[phase];
  const log = c.today as Log;
  return (
    <section className="panel relative overflow-hidden">
      <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full" style={{ background: PHASES[phase].color, opacity: 0.12 }} aria-hidden />
      <div className="flex items-center gap-3 relative">
        <button className="press rounded-full" onClick={() => go("ilerleme")} aria-label="Döngü kartını aç">
          <PhaseBlob phase={phase} size={56} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="display text-lg font-bold leading-tight">
            {se.season} <span className="text-sm font-semibold" style={{ color: PHASES[phase].color }}>· {PHASES[phase].label}</span>
          </p>
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            {statusText(c)}
          </p>
        </div>
        <button
          className="btn btn-ghost press !px-3 !py-2 text-sm shrink-0"
          onClick={() => act(c.inPeriod ? { action: "cycle", end: true } : { action: "cycle", start: true }, { toast: c.inPeriod ? "Adetin bitti, ilkbahar geliyor 🌱" : "Kaydedildi, kendine iyi bak 🌸", celebrate: !c.inPeriod ? false : true })}
        >
          {c.inPeriod ? "Bitti" : "Başladı"}
        </button>
      </div>
      <div className="mt-3 relative">
        <span className="text-sm font-semibold">Bugün nasılsın?</span>
        <div className="flex justify-between mt-1">
          {ENERGY.map((e, i) => (
            <button
              key={i}
              className={`w-10 h-10 rounded-full grid place-items-center text-xl press transition-transform ${log.energy === i + 1 ? "scale-125" : "opacity-70"}`}
              style={log.energy === i + 1 ? { background: PHASES[phase].color + "33" } : undefined}
              aria-pressed={log.energy === i + 1}
              aria-label={`Enerji ${i + 1}/5`}
              onClick={() => act({ action: "cycle", energy: log.energy === i + 1 ? null : i + 1 }, log.energy ? undefined : { toast: "Not ettim 💜", points: 10 })}
            >
              {e}
            </button>
          ))}
        </div>
      </div>
      <p className="text-sm mt-2 relative">{c.waterWeightLikely ? PHASES[phase].tips.scale : se.power}</p>
    </section>
  );
}

function Wheel({ day, avgLen, periodLen, sel, onSel }: { day: number; avgLen: number; periodLen: number; sel: number; onSel: (d: number) => void }) {
  const size = 200,
    r = 78,
    cx = size / 2,
    cy = size / 2,
    stroke = 22;
  const ang = (d: number) => ((d - 1) / avgLen) * 2 * Math.PI - Math.PI / 2;
  const pt = (a: number, rr = r) => [cx + rr * Math.cos(a), cy + rr * Math.sin(a)];
  const cur = Math.min(day, avgLen);
  const [mx, my] = pt(ang(cur + 0.5));
  const selP = predict(sel, avgLen, periodLen);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="group" aria-label={`Döngü çarkı, bugün ${day}. gün. Bir güne dokun.`}>
      {Array.from({ length: avgLen }, (_, i) => {
        const d = i + 1;
        const a0 = ang(d) + 0.012,
          a1 = ang(d + 1) - 0.012;
        const [x0, y0] = pt(a0);
        const [x1, y1] = pt(a1);
        const ph = phaseFor(d, avgLen, periodLen);
        const isSel = selP.day === d;
        return (
          <path
            key={d}
            d={`M${x0} ${y0} A${r} ${r} 0 0 1 ${x1} ${y1}`}
            stroke={PHASES[ph].color}
            strokeWidth={isSel ? stroke + 8 : stroke}
            opacity={d < cur ? 0.45 : 0.95}
            fill="none"
            className="cursor-pointer transition-all"
            onClick={() => onSel(d)}
          >
            <title>{`${d}. gün: ${PHASES[ph].label}`}</title>
          </path>
        );
      })}
      <circle cx={mx} cy={my} r="13" fill="#fff" stroke="var(--ink)" strokeWidth="3" className="cycle-pulse" />
      <text x={cx} y={cy - 10} textAnchor="middle" fontSize="13" fill="var(--ink-2)">
        {selP.day === cur ? "bugün" : `${selP.day}. gün`}
      </text>
      <text x={cx} y={cy + 20} textAnchor="middle" fontSize="34">
        {PHASES[selP.phase].emoji}
      </text>
      <text x={cx} y={cy + 42} textAnchor="middle" fontSize="12" fontWeight="700" fill={PHASES[selP.phase].color}>
        {SEASONS[selP.phase].season}
      </text>
    </svg>
  );
}

export default function CycleCard() {
  const { s, act, celebrate } = useApp();
  const c = s.cycle;
  const [startDate, setStartDate] = useState(s.today);
  const [pickOther, setPickOther] = useState(false);
  const [sel, setSel] = useState<number | null>(null);
  const [tip, setTip] = useState<"food" | "hunger" | "training" | "scale">("food");
  if (!c || s.profile.cycleTracking === false) return null;
  const log = c.today as Log;
  const syms = log.symptoms ?? [];
  const quests = log.quests ?? [];

  if (!c.hasData || pickOther) {
    return (
      <section className="panel">
        <div className="flex items-center gap-3">
          <PhaseBlob phase="menstrual" size={56} />
          <div>
            <h2 className="display text-xl font-bold">Döngüm</h2>
            <p className="text-sm" style={{ color: "var(--ink-2)" }}>
              Son adetin hangi gün başladı? Bir kez girmen yeter, sonrası tek dokunuş.
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <input type="date" className="field" value={startDate} max={s.today} min={addDays(s.today, -200)} onChange={(e) => setStartDate(e.target.value)} aria-label="Adet başlangıç tarihi" />
          <button
            className="btn btn-me press shrink-0"
            onClick={async () => {
              if (await act({ action: "cycle", date: startDate, start: true }, { toast: "Kaydedildi 🌸" })) setPickOther(false);
            }}
          >
            Kaydet
          </button>
        </div>
        {pickOther && (
          <button className="label underline mt-2" onClick={() => setPickOther(false)}>
            Vazgeç
          </button>
        )}
      </section>
    );
  }

  const phase = c.phase as PhaseKey;
  const ph = PHASES[phase];
  const se = SEASONS[phase];
  const day = c.day ?? 1;
  const selDay = sel ?? day;
  const selPred = predict(selDay, c.avgLen, c.periodLen);
  const strip = Array.from({ length: 14 }, (_, i) => ({ date: addDays(s.today, i), ...predict(day + i, c.avgLen, c.periodLen) }));
  const doneCount = se.quests.filter((q) => quests.includes(q.id)).length;

  return (
    <section className="panel relative overflow-hidden">
      <div className="absolute -left-10 -top-10 w-44 h-44 rounded-full" style={{ background: ph.color, opacity: 0.1 }} aria-hidden />
      <div className="flex items-center gap-3 relative">
        <PhaseBlob phase={phase} size={64} />
        <div className="flex-1 min-w-0">
          <p className="label">İç mevsimin</p>
          <h2 className="display text-2xl font-bold leading-tight">{se.season}</h2>
          <p className="text-sm font-semibold" style={{ color: ph.color }}>
            {ph.label} · {se.mood}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center mt-3 relative">
        <Wheel day={day} avgLen={c.avgLen} periodLen={c.periodLen} sel={selDay} onSel={(d) => setSel(d === day ? null : d)} />
        <p className="text-sm text-center mt-1" style={{ color: "var(--ink-2)" }}>
          {sel === null ? statusText(c) : `${selPred.day}. gün ${PHASES[selPred.phase].label.toLocaleLowerCase("tr")}: ${SEASONS[selPred.phase].mood.toLocaleLowerCase("tr")}`}
        </p>
      </div>

      {/* next two weeks */}
      <div className="flex gap-1.5 overflow-x-auto scroll-x mt-3 pb-1 relative">
        {strip.map((d, i) => (
          <button
            key={d.date}
            className="shrink-0 w-11 rounded-2xl py-1.5 text-center press"
            style={{ background: i === 0 ? PHASES[d.phase].color : PHASES[d.phase].color + "1f", color: i === 0 ? "#fff" : "var(--ink)" }}
            onClick={() => setSel(d.day === day ? null : d.day)}
            aria-label={`${trDate(d.date)}: ${PHASES[d.phase].label}`}
          >
            <span className="block text-[10px] font-semibold opacity-80">{i === 0 ? "Bugün" : trShort(d.date)}</span>
            <span className="block text-base leading-tight">{PHASES[d.phase].emoji}</span>
            <span className="block text-[11px] num font-bold">{d.date.slice(8)}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3 relative">
        <button
          className="btn btn-me press"
          onClick={() => act(c.inPeriod ? { action: "cycle", end: true } : { action: "cycle", start: true }, { toast: c.inPeriod ? "Adetin bitti, ilkbahar geliyor 🌱" : "Kaydedildi, kendine iyi bak 🌸", celebrate: c.inPeriod })}
        >
          {c.inPeriod ? "Adetim bitti" : "Adetim başladı"}
        </button>
        <button className="btn btn-ghost press" onClick={() => setPickOther(true)}>
          Başka tarih
        </button>
      </div>
      <p className="label text-center mt-1.5">
        Sonraki adet {c.lateDays > 0 ? `${c.lateDays} gün gecikti` : `${trDate(c.nextStart)}`} · ortalama {c.avgLen} gün döngü, ~{c.periodLen} gün adet
      </p>

      {c.flags.map((f, i) => (
        <p key={i} className="text-sm mt-3 rounded-xl px-3 py-2" style={{ background: f.level === "warn" ? "var(--warn-soft)" : "var(--me-soft)", color: f.level === "warn" ? "var(--warn)" : "var(--ink)" }}>
          {f.text}
        </p>
      ))}

      {/* check-in */}
      <div className="mt-4 rounded-3xl p-3" style={{ background: "var(--bg-2, #faf8ff)" }}>
        <p className="font-bold">Bugün nasılsın?</p>
        <div className="flex justify-between mt-2">
          {ENERGY.map((e, i) => (
            <button
              key={i}
              className={`w-12 h-12 rounded-full grid place-items-center text-2xl press transition-transform ${log.energy === i + 1 ? "scale-125" : "opacity-70"}`}
              style={log.energy === i + 1 ? { background: ph.color + "33" } : undefined}
              aria-pressed={log.energy === i + 1}
              aria-label={`Enerji ${i + 1}/5`}
              onClick={() => act({ action: "cycle", energy: log.energy === i + 1 ? null : i + 1 }, log.energy ? undefined : { toast: "Not ettim 💜", points: 10 })}
            >
              {e}
            </button>
          ))}
        </div>
        {c.inPeriod && (
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[
              [1, "Hafif", "💧"],
              [2, "Orta", "💧💧"],
              [3, "Yoğun", "💧💧💧"],
            ].map(([v, l, icon]) => (
              <button key={v} className="chip justify-center press" aria-pressed={log.flow === v} onClick={() => act({ action: "cycle", flow: log.flow === v ? null : v })}>
                {icon} {l}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {SYMPTOMS.map((x) => {
            const on = syms.includes(x.id);
            return (
              <button
                key={x.id}
                className={`chip press !text-[13px] ${on ? "cycle-pop" : ""}`}
                aria-pressed={on}
                style={on ? { background: ph.color, borderColor: ph.color } : undefined}
                onClick={() => act({ action: "cycle", symptoms: on ? syms.filter((y) => y !== x.id) : [...syms, x.id] })}
              >
                {x.emoji} {x.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* phase quests */}
      <div className="mt-4">
        <div className="flex items-baseline justify-between">
          <p className="font-bold">
            {se.season} görevleri {doneCount === 3 ? "🏅" : ""}
          </p>
          <span className="label num">{doneCount}/3</span>
        </div>
        <p className="text-sm" style={{ color: "var(--ink-2)" }}>
          {se.power}
        </p>
        <ul className="mt-2 space-y-1.5">
          {se.quests.map((q) => {
            const on = quests.includes(q.id);
            return (
              <li key={q.id}>
                <button
                  className="w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left press border-2 transition-colors"
                  style={{ borderColor: on ? ph.color : "var(--line)", background: on ? ph.color + "18" : "transparent" }}
                  onClick={async () => {
                    const next = on ? quests.filter((x) => x !== q.id) : [...quests, q.id];
                    const ok = await act({ action: "cycle", quests: next });
                    if (ok && !on && se.quests.every((x) => next.includes(x.id))) celebrate();
                  }}
                  aria-pressed={on}
                >
                  <span className="text-xl" aria-hidden>
                    {on ? "✅" : q.emoji}
                  </span>
                  <span className={`flex-1 text-sm ${on ? "line-through opacity-70" : ""}`}>{q.text}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* guide as tabs instead of a wall of text */}
      <div className="mt-4 rounded-3xl p-3" style={{ background: ph.color + "14" }}>
        <div className="grid grid-cols-4 gap-1">
          {(
            [
              ["food", "🍽️", "Yemek"],
              ["hunger", "😋", "İştah"],
              ["training", "💪", "Spor"],
              ["scale", "⚖️", "Tartı"],
            ] as const
          ).map(([k, e, l]) => (
            <button key={k} className="chip justify-center !px-1 !text-[12px] press" aria-pressed={tip === k} onClick={() => setTip(k)}>
              {e} {l}
            </button>
          ))}
        </div>
        <p className="text-sm mt-2.5 min-h-[3.5em]">{ph.tips[tip]}</p>
      </div>

      {c.patterns.length > 0 && (
        <div className="mt-3 space-y-1 text-sm">
          <p className="font-semibold">Senin örüntün</p>
          {c.patterns.map((t, i) => (
            <p key={i}>💡 {t}</p>
          ))}
        </div>
      )}

      {c.cycles.length > 1 && (
        <details className="mt-3">
          <summary className="text-sm font-semibold cursor-pointer">Geçmiş döngüler</summary>
          <ul className="text-sm mt-2 space-y-1">
            {[...c.cycles].reverse().map((x) => (
              <li key={x.start} className="flex justify-between">
                <span>{trDate(x.start)}</span>
                <span style={{ color: "var(--ink-2)" }}>
                  {x.length ? `${x.length} gün döngü` : "devam ediyor"}
                  {x.periodLength ? ` · ${x.periodLength} gün adet` : ""}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
      <p className="text-[11px] mt-3" style={{ color: "var(--ink-3)" }}>
        Sadece sen görürsün. Tahminler senin kayıtlarından hesaplanır, doğum kontrolü için kullanılamaz. Dayanak: FIGO normal döngü aralıkları; Tucker 2024 (luteal fazda iştah); Benton 2020 (metabolizma); McNulty 2020 (antrenman).
      </p>
    </section>
  );
}
