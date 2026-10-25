"use client";
// Eylül's cycle tracker: one-tap logging, predictions, phase-aware guidance, personal patterns.
import { useState } from "react";
import { useApp } from "./ui";
import { PHASES, SYMPTOMS, type PhaseKey } from "@/lib/cycle";

const trDate = (d?: string) => (d ? new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(d + "T12:00:00Z")) : "");

export function CycleMini() {
  const { s, act, go } = useApp();
  const c = s.cycle;
  if (!c) return null;
  if (!c.hasData) {
    return (
      <button className="panel w-full text-left press flex items-center gap-3" onClick={() => go("ilerleme")}>
        <span className="text-3xl" aria-hidden>🌸</span>
        <span>
          <span className="display text-lg font-bold block">Döngünü takip edelim</span>
          <span className="text-sm" style={{ color: "var(--ink-2)" }}>Son adetinin başladığı günü gir, planın döngüne göre ayarlansın.</span>
        </span>
      </button>
    );
  }
  const ph = PHASES[c.phase as PhaseKey];
  return (
    <section className="panel">
      <div className="flex items-center gap-3">
        <span className="w-12 h-12 rounded-full grid place-items-center text-2xl shrink-0" style={{ background: ph.color + "22" }} aria-hidden>
          {ph.emoji}
        </span>
        <div className="flex-1 min-w-0">
          <p className="display text-lg font-bold leading-tight">{ph.label}</p>
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            {c.day}. gün ·{" "}
            {c.inPeriod ? "adet devam ediyor" : c.lateDays > 0 ? `${c.lateDays} gün gecikti` : `adete ~${c.daysToNext} gün`}
          </p>
        </div>
        <button
          className="btn btn-ghost press !px-3 !py-2 text-sm shrink-0"
          onClick={() => act(c.inPeriod ? { action: "cycle", end: true } : { action: "cycle", start: true }, { toast: c.inPeriod ? "Adetin bitti olarak işaretlendi" : "Adetin başladı olarak işaretlendi 🌸" })}
        >
          {c.inPeriod ? "Bitti" : "Başladı"}
        </button>
      </div>
      <p className="text-sm mt-2">{c.waterWeightLikely ? ph.tips.scale : ph.tips.hunger}</p>
    </section>
  );
}

function Wheel({ day, avgLen, periodLen }: { day: number; avgLen: number; periodLen: number }) {
  const size = 168,
    r = 66,
    cx = size / 2,
    cy = size / 2,
    stroke = 16;
  const ovu = Math.max(periodLen + 3, avgLen - 14);
  const segs: [PhaseKey, number, number][] = [
    ["menstrual", 1, periodLen],
    ["follicular", periodLen + 1, ovu - 2],
    ["ovulatory", ovu - 1, ovu + 1],
    ["luteal", ovu + 2, avgLen - 7],
    ["premenstrual", avgLen - 6, avgLen],
  ];
  const ang = (d: number) => ((d - 1) / avgLen) * 2 * Math.PI - Math.PI / 2;
  const pt = (a: number, rr = r) => [cx + rr * Math.cos(a), cy + rr * Math.sin(a)];
  const arc = (a0: number, a1: number) => {
    const [x0, y0] = pt(a0);
    const [x1, y1] = pt(a1);
    return `M${x0} ${y0} A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1} ${y1}`;
  };
  const d = Math.min(day, avgLen);
  const [mx, my] = pt(ang(d + 0.5));
  return (
    <svg width={size} height={size} role="img" aria-label={`Döngünün ${day}. günü`}>
      {segs.map(([k, a, b]) =>
        b >= a ? <path key={k} d={arc(ang(a), ang(b + 1) - 0.03)} stroke={PHASES[k].color} strokeWidth={stroke} fill="none" strokeLinecap="butt" opacity={0.85} /> : null
      )}
      <circle cx={mx} cy={my} r="12" fill="#fff" stroke="var(--ink)" strokeWidth="3" />
      <text x={cx} y={cy - 4} textAnchor="middle" className="display" fontSize="30" fontWeight="800" fill="var(--ink)">
        {day}
      </text>
      <text x={cx} y={cy + 18} textAnchor="middle" fontSize="12" fill="var(--ink-2)">
        / {avgLen} gün
      </text>
    </svg>
  );
}

export default function CycleCard() {
  const { s, act } = useApp();
  const c = s.cycle;
  const [startDate, setStartDate] = useState(s.today);
  const [pickOther, setPickOther] = useState(false);
  if (!c) return null;
  const todayLog = c.today as { flow?: number; symptoms?: string[]; energy?: number };
  const syms = todayLog.symptoms ?? [];

  if (!c.hasData || pickOther) {
    return (
      <section className="panel">
        <h2 className="display text-xl font-bold">🌸 Döngüm</h2>
        <p className="text-sm mt-1" style={{ color: "var(--ink-2)" }}>
          Son adetin hangi gün başladı? Bir kez girmen yeter; sonrası tek dokunuş.
        </p>
        <div className="flex gap-2 mt-3">
          <input type="date" className="field" value={startDate} max={s.today} onChange={(e) => setStartDate(e.target.value)} aria-label="Adet başlangıç tarihi" />
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

  const ph = PHASES[c.phase as PhaseKey];
  return (
    <section className="panel">
      <div className="flex items-baseline justify-between">
        <h2 className="display text-xl font-bold">🌸 Döngüm</h2>
        <span className="text-sm font-semibold" style={{ color: ph.color }}>
          {ph.emoji} {ph.label}
        </span>
      </div>

      <div className="flex items-center gap-4 mt-2">
        <Wheel day={c.day ?? 1} avgLen={c.avgLen} periodLen={c.periodLen} />
        <dl className="text-sm space-y-1.5 flex-1">
          <div>
            <dt className="label">Sonraki adet</dt>
            <dd className="font-semibold">{c.lateDays > 0 ? `${c.lateDays} gün gecikti` : `${trDate(c.nextStart)} (~${c.daysToNext} gün)`}</dd>
          </div>
          <div>
            <dt className="label">Ortalama döngü</dt>
            <dd className="font-semibold">{c.avgLen} gün</dd>
          </div>
          <div>
            <dt className="label">Adet süresi</dt>
            <dd className="font-semibold">~{c.periodLen} gün</dd>
          </div>
        </dl>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <button
          className="btn btn-me press"
          onClick={() => act(c.inPeriod ? { action: "cycle", end: true } : { action: "cycle", start: true }, { toast: c.inPeriod ? "Bitti olarak işaretlendi" : "Başladı olarak işaretlendi 🌸" })}
        >
          {c.inPeriod ? "Adetim bitti" : "Adetim başladı"}
        </button>
        <button className="btn btn-ghost press" onClick={() => setPickOther(true)}>
          Başka tarih
        </button>
      </div>

      {c.flags.map((f, i) => (
        <p key={i} className="text-sm mt-3 rounded-xl px-3 py-2" style={{ background: f.level === "warn" ? "var(--warn-soft)" : "var(--me-soft)", color: f.level === "warn" ? "var(--warn)" : "var(--ink)" }}>
          {f.text}
        </p>
      ))}

      <div className="mt-4">
        <p className="font-semibold">Bugün nasılsın?</p>
        {c.inPeriod && (
          <div className="flex gap-2 mt-2">
            {[
              [1, "Hafif"],
              [2, "Orta"],
              [3, "Yoğun"],
            ].map(([v, l]) => (
              <button key={v} className="chip press" aria-pressed={todayLog.flow === v} onClick={() => act({ action: "cycle", flow: todayLog.flow === v ? null : v })}>
                🩸 {l}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {SYMPTOMS.map((x) => {
            const on = syms.includes(x.id);
            return (
              <button key={x.id} className="chip press !text-[13px] !py-1.5" aria-pressed={on} onClick={() => act({ action: "cycle", symptoms: on ? syms.filter((y) => y !== x.id) : [...syms, x.id] })}>
                {x.emoji} {x.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1.5 mt-2">
          <span className="label mr-1">Enerji</span>
          {["😩", "😕", "🙂", "😊", "🤩"].map((e, i) => (
            <button key={i} className="chip press !px-2.5" aria-pressed={todayLog.energy === i + 1} aria-label={`Enerji ${i + 1}`} onClick={() => act({ action: "cycle", energy: todayLog.energy === i + 1 ? null : i + 1 })}>
              {e}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-2xl p-3 space-y-2 text-sm" style={{ background: ph.color + "14" }}>
        <p className="font-bold" style={{ color: ph.color }}>
          {ph.emoji} {ph.label} rehberi
        </p>
        <p>🍽️ {ph.tips.food}</p>
        <p>😋 {ph.tips.hunger}</p>
        <p>💪 {ph.tips.training}</p>
        <p>⚖️ {ph.tips.scale}</p>
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
        Tahminler senin kayıtlarından hesaplanır, doğum kontrolü için kullanılamaz. Dayanak: FIGO normal döngü aralıkları; Tucker 2024 (luteal fazda iştah artışı); Benton 2020 (metabolizma); McNulty 2020 (antrenman).
      </p>
    </section>
  );
}
