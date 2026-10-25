"use client";
// Weigh-in + weight charts for both of us. Daily weights are noisy (water, salt, food in the gut, cycle),
// so the line we judge by is the smoothed trend; dots are the raw scale readings.
import { useEffect, useMemo, useRef, useState } from "react";
import { useApp, kg } from "./ui";
import { addDays } from "@/lib/dates";

const round1 = (x: number) => Math.round(x * 10) / 10;

/** Rolling digits: each character slides into place when the value changes. */
function Roll({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className={`inline-flex num ${className}`} aria-label={text}>
      {text.split("").map((c, i) => (
        <span key={`${i}-${c}`} className="roll-digit" style={{ animationDelay: `${i * 35}ms` }} aria-hidden>
          {c}
        </span>
      ))}
    </span>
  );
}

/** A scale ruler you swipe like a real dial: 0.1 kg per tick, snaps, haptic tick every 0.5 kg. */
function Ruler({ value, onChange, min, max, trend, yesterday }: { value: number; onChange: (v: number) => void; min: number; max: number; trend?: number; yesterday?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pad, setPad] = useState(170);
  useEffect(() => {
    if (ref.current) setPad(ref.current.clientWidth / 2);
  }, []);
  const STEP = 12; // px per 0.1 kg
  const n = Math.round((max - min) * 10);
  const last = useRef(value);
  const syncing = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const target = Math.round((value - min) * 10) * STEP;
    if (Math.abs(el.scrollLeft - target) > STEP / 2) {
      syncing.current = true;
      el.scrollLeft = target;
      requestAnimationFrame(() => (syncing.current = false));
    }
  }, [value, min]);
  return (
    <div className="relative mt-3 select-none">
      <div
        ref={ref}
        className="ruler overflow-x-auto scroll-x"
        style={{ scrollSnapType: "x mandatory" }}
        onScroll={(e) => {
          if (syncing.current) return;
          const v = Math.round((min + Math.round(e.currentTarget.scrollLeft / STEP) / 10) * 10) / 10;
          if (v !== last.current) {
            if (Math.round(v * 2) !== Math.round(last.current * 2)) navigator.vibrate?.(4);
            last.current = v;
            onChange(Math.min(max, Math.max(min, v)));
          }
        }}
        role="slider"
        aria-label="Kiloyu kaydırarak ayarla"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") e.preventDefault();
          if (e.key === "ArrowRight") onChange(Math.min(max, round1(value + 0.1)));
          if (e.key === "ArrowLeft") onChange(Math.max(min, round1(value - 0.1)));
        }}
      >
        <div className="relative flex items-end h-16" style={{ paddingLeft: pad - STEP / 2, paddingRight: pad - STEP / 2, width: "max-content" }}>
          {/* ghost markers: the normal wobble around your trend, and yesterday's reading */}
          {trend !== undefined && (
            <span className="absolute bottom-0 h-full rounded-xl" style={{ left: pad - STEP / 2 + (trend - 0.3 - min) * 10 * STEP + STEP / 2, width: 6 * STEP, background: "var(--me-soft)" }} title="Trend ± 0,3 kg" />
          )}
          {yesterday !== undefined && (
            <span className="absolute w-3 h-3 rounded-full border-2" style={{ bottom: 40, left: pad - STEP / 2 + (yesterday - min) * 10 * STEP + STEP / 2 - 6, borderColor: "var(--ink-2)" }} title="Dün" />
          )}
          {Array.from({ length: n + 1 }, (_, i) => {
            const kgv = min + i / 10;
            const major = i % 10 === 0,
              half = i % 5 === 0;
            const dist = Math.abs(kgv - value);
            return (
              <div key={i} className="relative shrink-0 flex justify-center" style={{ width: STEP, scrollSnapAlign: "center" }}>
                <span
                  className="block rounded-full"
                  style={{ width: major ? 3 : 2, height: major ? 34 : half ? 24 : 14, background: "var(--ink)", opacity: Math.max(0.15, 1 - dist / 2.2) }}
                />
                {major && (
                  <span className="absolute -top-4 text-[11px] font-bold num" style={{ opacity: Math.max(0.25, 1 - dist / 3) }}>
                    {Math.round(kgv)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {/* center needle + fades */}
      <div className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 flex flex-col items-center justify-end">
        <span className="w-[5px] h-12 rounded-full grad-me shadow-[0_0_12px_var(--me)]" />
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16" style={{ background: "linear-gradient(90deg, var(--paper, #fff), transparent)" }} />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16" style={{ background: "linear-gradient(270deg, var(--paper, #fff), transparent)" }} />
    </div>
  );
}

/** 14-day trend ribbon: soft gradient band = daily noise, bold line = trend. */
function Ribbon({ pts, height = 54 }: { pts: { date: string; weight: number; trend: number }[]; height?: number }) {
  if (pts.length < 2) return null;
  const W = 320,
    H = height;
  const vals = pts.flatMap((p) => [p.weight, p.trend]);
  const lo = Math.min(...vals) - 0.2,
    hi = Math.max(...vals) + 0.2;
  const x = (i: number) => (i / (pts.length - 1)) * W;
  const y = (v: number) => H - 4 - ((v - lo) / (hi - lo || 1)) * (H - 8);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.trend).toFixed(1)}`).join(" ");
  const area = `${line} L${W} ${H} L0 ${H} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto mt-2" aria-hidden>
      <defs>
        <linearGradient id="ribbonFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--me)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--me)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="ribbonLine" x1="0" x2="1">
          <stop offset="0%" stopColor="var(--me-2, var(--me))" />
          <stop offset="100%" stopColor="var(--me)" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#ribbonFill)" />
      {pts.map((p, i) => (
        <circle key={p.date} cx={x(i)} cy={y(p.weight)} r="2.2" fill="var(--me)" opacity="0.3" />
      ))}
      <path d={line} fill="none" stroke="url(#ribbonLine)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="ribbon-draw" />
      <circle cx={x(pts.length - 1)} cy={y(last.trend)} r="4.5" fill="var(--me)" stroke="#fff" strokeWidth="2" className="cycle-pulse" />
    </svg>
  );
}

export function WeighIn() {
  const { s, act } = useApp();
  const log = s.weightLog;
  const yesterday = [...log].reverse().find((w) => w.date < s.today);
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(s.today);
  const [w, setW] = useState<number>(s.weighedToday ?? s.lastWeight ?? s.profile.startWeight);
  const [typed, setTyped] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const open = !s.weighedToday || editing;
  const parsed = typed !== null ? Number(typed.replace(",", ".")) : w;
  const value = Number.isFinite(parsed) ? parsed : w;
  const valid = Number.isFinite(parsed) && parsed >= 30 && parsed <= 200;
  const center = s.engine.trend.length ? s.engine.currentWeight : s.profile.startWeight;
  const rMin = Math.max(30, Math.floor(Math.min(center, value) - 8)),
    rMax = Math.min(200, Math.ceil(Math.max(center, value) + 8));
  const pick = (d: string) => {
    setDate(d);
    setTyped(null);
    const known = log.find((x) => x.date === d)?.kg;
    if (known) setW(known);
  };
  const recent = s.engine.trend.slice(-14);
  const goalDir = s.profile.goal === "gain" ? 1 : -1;

  async function save() {
    if (!valid) return;
    // one typo (e.g. 155 instead of 55) would reshape the whole plan
    const ref = s.engine.trend.length ? s.engine.currentWeight : s.profile.startWeight;
    if (Math.abs(value - ref) / ref > 0.05 && !confirm(`${kg(value)} kg, trendinden (${kg(ref)} kg) çok farklı. Doğru mu?`)) return;
    const ok = await act(
      { action: "weight", kg: round1(value), ...(date !== s.today ? { date } : {}) },
      { toast: date === s.today ? `${kg(value)} kg kaydedildi` : "Geçmiş tartı kaydedildi", points: date === s.today && !s.weighedToday ? 10 : undefined }
    );
    if (ok) {
      setEditing(false);
      setTyped(null);
      setDate(s.today);
      setJustSaved(true);
      navigator.vibrate?.([10, 40, 10]);
      setTimeout(() => setJustSaved(false), 2400);
    }
  }

  if (!open) {
    const delta = yesterday ? round1(s.weighedToday! - yesterday.kg) : null;
    const rate = s.engine.weeklyRate;
    const onTrack = rate !== null && rate * goalDir > 0.05;
    return (
      <section className={`panel weigh-card relative overflow-hidden cursor-pointer ${justSaved ? "weigh-pop" : ""}`} onClick={() => setEditing(true)} role="button" aria-label="Tartıyı düzelt">
        <div className="weigh-aurora" aria-hidden />
        {justSaved && <span className="weigh-ripple" aria-hidden />}
        <div className="relative flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="label">Trend kilon</p>
            <p className="display font-bold leading-none mt-0.5">
              <Roll text={kg(s.engine.currentWeight)} className="text-5xl text-grad" />
              <span className="text-lg ml-1">kg</span>
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {rate !== null && (
                <span className="text-[12px] font-bold rounded-full px-2.5 py-1" style={{ background: onTrack ? "var(--me)" : "var(--line)", color: onTrack ? "#fff" : "var(--ink)" }}>
                  {rate > 0 ? "↗ +" : rate < 0 ? "↘ " : "→ "}
                  {kg(rate)} kg/hafta
                </span>
              )}
              <span className="text-[12px] font-semibold rounded-full px-2.5 py-1" style={{ background: "var(--line)" }}>
                ⚖️ tartı {kg(s.weighedToday!)}
                {delta !== null && delta !== 0 ? ` (${delta > 0 ? "+" : ""}${kg(delta)})` : ""}
              </span>
            </div>
          </div>
          <span className="label shrink-0 mt-1">düzelt ›</span>
        </div>
        <div className="relative">
          <Ribbon pts={recent} />
        </div>
        <p className="relative label mt-1">
          {Math.abs(s.weighedToday! - s.engine.currentWeight) > 0.5
            ? s.cycle?.waterWeightLikely
              ? "Döngüden su tutulumu olabilir; trend neredeyse kımıldamadı."
              : "Tek günlük oynama; kararı çizgi verir, nokta değil."
            : onTrack
              ? s.profile.goal === "gain"
                ? "Çizgi yukarı, tam istediğimiz gibi 💪"
                : "Çizgi aşağı, harika gidiyorsun 🔥"
              : "Noktalar günlük tartı, çizgi gerçek yönün."}
        </p>
      </section>
    );
  }

  return (
    <section className="panel weigh-card relative overflow-hidden">
      <div className="weigh-aurora" aria-hidden />
      <div className="relative flex items-baseline justify-between gap-2">
        <div>
          <h2 className="display text-xl font-bold">Tartıldın mı?</h2>
          <p className="label">Sabah, tuvaletten sonra, kahvaltıdan önce.</p>
        </div>
        {editing && (
          <button className="label underline" onClick={() => setEditing(false)}>
            Vazgeç
          </button>
        )}
      </div>

      <div className="relative text-center mt-4">
        <label className="inline-flex items-baseline justify-center gap-1">
          <input
            className="weigh-input display num font-bold text-center bg-transparent outline-none text-grad"
            inputMode="decimal"
            aria-label="Kilo (kg)"
            value={typed ?? kg(w)}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setTyped(e.target.value.replace(/[^\d.,]/g, "").slice(0, 5))}
            onBlur={() => {
              if (typed !== null && valid) {
                setW(round1(parsed));
                setTyped(null);
              }
            }}
            onKeyDown={(e) => e.key === "Enter" && save()}
          />
          <span className="text-xl font-bold">kg</span>
        </label>
        {s.engine.trend.length > 0 && (
          <p className="label num">
            trend {kg(s.engine.currentWeight)} · fark {value - s.engine.currentWeight > 0 ? "+" : ""}
            {kg(round1(value - s.engine.currentWeight))}
          </p>
        )}
      </div>

      <Ruler
        value={value}
        min={rMin}
        max={rMax}
        trend={s.engine.trend.length ? s.engine.currentWeight : undefined}
        yesterday={yesterday?.kg}
        onChange={(v) => {
          setTyped(null);
          setW(v);
        }}
      />
      <p className="label text-center mt-1">
        {s.engine.trend.length ? "← kaydır · renkli bant normal oynama →" : "← kaydır ya da sayıya dokunup yaz →"}
      </p>

      <div className="relative flex gap-2 mt-3 overflow-x-auto scroll-x">
        {[0, 1, 2, 3, 4, 5, 6].map((back) => {
          const d = addDays(s.today, -back);
          const day = new Intl.DateTimeFormat("tr-TR", { weekday: "long", timeZone: "UTC" }).format(new Date(d + "T12:00:00Z"));
          const has = log.some((x) => x.date === d);
          return (
            <button key={d} className="chip press shrink-0" aria-pressed={date === d} onClick={() => pick(d)}>
              {back === 0 ? "Bugün" : back === 1 ? "Dün" : day}
              {has ? " ✓" : ""}
            </button>
          );
        })}
      </div>
      <button className="btn btn-me w-full mt-3 press !py-4 text-lg relative" disabled={!valid} onClick={save}>
        Kaydet
      </button>
    </section>
  );
}

type Pt = { date: string; v: number; raw?: number };
type Series = { pts: Pt[]; color: string; label: string };

function Chart({ series, goal, start, unit, band, projection }: { series: Series[]; goal?: number; start?: number; unit: string; band?: [string, string][]; projection?: { date: string; v: number } }) {
  const all = series.flatMap((s) => s.pts);
  if (all.length < 2) return <p className="text-sm py-6 text-center" style={{ color: "var(--ink-2)" }}>Birkaç sabah tartıl, çizgi burada belirecek.</p>;
  const W = 340,
    H = 190,
    L = 34,
    R = 12,
    T = 14,
    B = 24;
  const dates = all.map((p) => p.date).concat(projection ? [projection.date] : []).sort();
  const d0 = dates[0],
    d1 = dates[dates.length - 1];
  const span = Math.max(1, (Date.parse(d1) - Date.parse(d0)) / 864e5);
  const x = (d: string) => L + ((Date.parse(d) - Date.parse(d0)) / 864e5 / span) * (W - L - R);
  const dataVals = all.flatMap((p) => [p.v, p.raw ?? p.v]);
  const dMin = Math.min(...dataVals),
    dMax = Math.max(...dataVals);
  // keep the curve readable: only pull the goal/start lines in when they're near the data
  const near = (v?: number) => v !== undefined && (unit === "%" || (v >= dMin - 1.5 && v <= dMax + 1.5));
  const showGoal = near(goal);
  const vals = dataVals.concat(showGoal ? [goal!] : [], near(start) ? [start!] : [], projection && unit !== "%" && near(projection.v) ? [projection.v] : []);
  let lo = Math.min(...vals),
    hi = Math.max(...vals);
  const pad = Math.max(0.4, (hi - lo) * 0.12);
  lo -= pad;
  hi += pad;
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const ticks =
    unit === "%"
      ? [0, 50, 100].filter((t) => t >= lo && t <= hi)
      : (() => {
          const step = hi - lo > 4 ? 1 : 0.5;
          const out: number[] = [];
          for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) out.push(Math.round(t * 10) / 10);
          return out.length > 5 ? out.filter((_, i) => i % 2 === 0) : out;
        })();
  const fmtv = (v: number) => (unit === "%" ? `%${Math.round(v)}` : kg(round1(v)));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Kilo grafiği">
      {band?.map(([a, b]) => (a <= d1 && b >= d0 ? <rect key={a} x={x(a < d0 ? d0 : a)} y={T} width={Math.max(3, x(b > d1 ? d1 : b) - x(a < d0 ? d0 : a))} height={H - T - B} fill="#ff4d6d" opacity="0.08" /> : null))}
      {ticks.map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--line)" />
          <text x={L - 5} y={y(t) + 4} fontSize="10" textAnchor="end" fill="var(--ink-3)">
            {fmtv(t)}
          </text>
        </g>
      ))}
      {near(start) && <line x1={L} x2={W - R} y1={y(start!)} y2={y(start!)} stroke="var(--ink-3)" strokeDasharray="2 4" opacity="0.6" />}
      {goal !== undefined && !showGoal && (
        <text x={W - R} y={T + 2} fontSize="11" textAnchor="end" fill="var(--ink-2)" fontWeight="700">
          hedef {fmtv(goal)} {goal > dMax ? "↑" : "↓"}
        </text>
      )}
      {goal !== undefined && showGoal && (
        <g>
          <line x1={L} x2={W - R} y1={y(goal)} y2={y(goal)} stroke="var(--ink-2)" strokeDasharray="5 4" />
          <text x={W - R} y={y(goal) - 5} fontSize="10.5" textAnchor="end" fill="var(--ink-2)" fontWeight="700">
            hedef {fmtv(goal)}
          </text>
        </g>
      )}
      {series.map((s) => {
        const path = s.pts.map((p, i) => `${i ? "L" : "M"}${x(p.date).toFixed(1)} ${y(p.v).toFixed(1)}`).join(" ");
        const last = s.pts[s.pts.length - 1];
        return (
          <g key={s.label}>
            {s.pts.map((p) => (p.raw !== undefined ? <circle key={p.date} cx={x(p.date)} cy={y(p.raw)} r="3" fill={s.color} opacity="0.28" /> : null))}
            <path d={path} fill="none" stroke={s.color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            {last && projection && s.label === "me" && (
              <line x1={x(last.date)} y1={y(last.v)} x2={x(projection.date)} y2={y(Math.max(lo, Math.min(hi, projection.v)))} stroke={s.color} strokeWidth="2.5" strokeDasharray="3 5" opacity="0.6" />
            )}
            {last && (
              <>
                <circle cx={x(last.date)} cy={y(last.v)} r="5" fill={s.color} stroke="#fff" strokeWidth="2" />
              </>
            )}
          </g>
        );
      })}
      <text x={L} y={H - 6} fontSize="10" fill="var(--ink-3)">
        {d0.slice(8)}.{d0.slice(5, 7)}
      </text>
      <text x={W - R} y={H - 6} fontSize="10" fill="var(--ink-3)" textAnchor="end">
        {d1.slice(8)}.{d1.slice(5, 7)}
      </text>
    </svg>
  );
}

const RANGES = [
  { id: "7", label: "7 gün", days: 7 },
  { id: "30", label: "30 gün", days: 30 },
  { id: "all", label: "Tümü", days: 3650 },
] as const;

function eta(goal: "gain" | "lose", current: number, target: number, rate: number | null) {
  if (rate === null) return null;
  const left = target - current;
  if ((goal === "gain" && left <= 0) || (goal === "lose" && left >= 0)) return "Hedefe ulaştın 🎉";
  if ((goal === "gain" && rate <= 0.02) || (goal === "lose" && rate >= -0.02)) return null;
  const weeks = Math.ceil(left / rate);
  return weeks > 104 ? null : `Bu hızla hedefe ~${weeks} hafta`;
}

export function WeightCharts({ compact = false }: { compact?: boolean }) {
  const { s } = useApp();
  const pp = s.partnerProgress;
  const myColor = "var(--me)";
  const partnerColor = s.user === "tolga" ? "var(--eylul)" : "var(--tolga)";
  const [view, setView] = useState<"me" | "partner" | "both">("me");
  const [range, setRange] = useState<(typeof RANGES)[number]["id"]>("30");
  const from = addDays(s.today, -(RANGES.find((r) => r.id === range)!.days - 1));

  const mine: Pt[] = useMemo(() => s.engine.trend.filter((t) => t.date >= from).map((t) => ({ date: t.date, v: t.trend, raw: t.weight })), [s.engine.trend, from]);
  const theirs: Pt[] = useMemo(() => pp.trend.filter((t) => t.date >= from).map((t) => ({ date: t.date, v: t.trend })), [pp.trend, from]);
  const pct = (v: number, start: number, target: number) => Math.max(-50, Math.min(150, ((v - start) / (target - start || 1)) * 100));

  // Eylül sees her own period days shaded: those weigh-ins usually carry water, not fat
  const bands: [string, string][] =
    view === "me" && s.cycle
      ? (s.cycle.recent as { date: string; start?: boolean }[]).filter((c) => c.start).map((c) => [c.date, addDays(c.date, (s.cycle?.periodLen ?? 5) - 1)])
      : [];

  const p = s.profile;
  // dashed look-ahead (4 weeks) only when we have enough weigh-ins and the pace points the right way
  const rate = s.engine.weeklyRate;
  const lastT = s.engine.trend[s.engine.trend.length - 1];
  const projection =
    lastT && rate !== null && s.engine.trend.length >= 7 && ((p.goal === "gain" && rate > 0.02) || (p.goal === "lose" && rate < -0.02)) && range !== "7"
      ? (() => {
          // keep the look-ahead to ~25% of the chart so real data stays the hero
          const first = mine[0]?.date ?? lastT.date;
          const days = Math.max(5, Math.min(28, Math.round((Date.parse(lastT.date) - Date.parse(first)) / 864e5 / 3)));
          const v = lastT.trend + (rate * days) / 7;
          return { date: addDays(lastT.date, days), v: p.goal === "gain" ? Math.min(p.targetWeight, v) : Math.max(p.targetWeight, v) };
        })()
      : undefined;
  const myEta = eta(p.goal, s.engine.currentWeight, p.targetWeight, s.engine.weeklyRate);
  const theirEta = eta(pp.goal, pp.current, pp.target, pp.weeklyRate);
  const change = (cur: number, start: number) => round1(cur - start);

  return (
    <section className="panel">
      <div className="flex items-center justify-between gap-2">
        <h2 className="display text-xl font-bold">Kilo grafiği</h2>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button key={r.id} className="chip !min-h-[40px] !px-2.5 !text-[12px] press" aria-pressed={range === r.id} onClick={() => setRange(r.id)}>
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5 mt-3">
        {(
          [
            ["me", "Ben"],
            ["partner", pp.name],
            ["both", "İkimiz"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} className="chip justify-center press" aria-pressed={view === id} onClick={() => setView(id)}>
            {label}
          </button>
        ))}
      </div>

      <div className="mt-3">
        {view === "me" && <Chart series={[{ pts: mine, color: myColor, label: "me" }]} goal={p.targetWeight} start={p.startWeight} unit="kg" band={bands} projection={projection} />}
        {view === "partner" && <Chart series={[{ pts: theirs, color: partnerColor, label: "partner" }]} goal={pp.target} start={pp.start} unit="kg" />}
        {view === "both" && (
          <Chart
            series={[
              { pts: mine.map((x) => ({ date: x.date, v: pct(x.v, p.startWeight, p.targetWeight) })), color: myColor, label: "me" },
              { pts: theirs.map((x) => ({ date: x.date, v: pct(x.v, pp.start, pp.target) })), color: partnerColor, label: "partner" },
            ]}
            goal={100}
            start={0}
            unit="%"
          />
        )}
      </div>

      {view === "me" && s.engine.trend.length > 0 && (
        <p className="text-sm mt-2" style={{ color: "var(--ink-2)" }}>
          <b style={{ color: "var(--ink)" }}>
            {change(s.engine.currentWeight, p.startWeight) > 0 ? "+" : ""}
            {kg(change(s.engine.currentWeight, p.startWeight))} kg
          </b>{" "}
          başlangıçtan beri
          {s.engine.weeklyRate !== null ? `, haftada ${s.engine.weeklyRate > 0 ? "+" : ""}${kg(s.engine.weeklyRate)} kg` : ""}
          {myEta ? `. ${myEta}.` : "."}
          {!compact && " Noktalar tartı, çizgi trend. Tek günlük oynamalar su ve yemekten; kararı çizgi verir."}
          {!compact && bands.length > 0 && " Pembe alanlar adet günlerin: o günlerdeki artış genelde su."}
        </p>
      )}
      {view === "partner" && pp.trend.length > 0 && (
        <p className="text-sm mt-2" style={{ color: "var(--ink-2)" }}>
          {pp.name}:{" "}
          <b style={{ color: "var(--ink)" }}>
            {change(pp.current, pp.start) > 0 ? "+" : ""}
            {kg(change(pp.current, pp.start))} kg
          </b>
          {theirEta ? `. ${theirEta}.` : "."} Ona destek olmanın en iyi yolu sonucu değil emeği övmek.
        </p>
      )}
      {view === "both" && (
        <p className="text-sm mt-2" style={{ color: "var(--ink-2)" }}>
          Biri alıyor biri veriyor, o yüzden ikinizi de kendi hedefinize göre yüzde olarak gösteriyorum: %100 = hedef.
        </p>
      )}
    </section>
  );
}

export function WeightHistory() {
  const { s, act } = useApp();
  const rows = [...s.weightLog].reverse().slice(0, 21);
  if (!rows.length) return null;
  return (
    <details className="panel">
      <summary className="display text-xl font-semibold cursor-pointer">📋 Tartı geçmişi</summary>
      <ul className="mt-3 divide-y" style={{ borderColor: "var(--line)" }}>
        {rows.map((r, i) => {
          const prev = rows[i + 1];
          const d = prev ? round1(r.kg - prev.kg) : null;
          return (
            <li key={r.id} className="flex items-center gap-3 py-2">
              <span className="label w-20">
                {r.date.slice(8)}.{r.date.slice(5, 7)}
              </span>
              <span className="num font-semibold flex-1">{kg(r.kg)} kg</span>
              {d !== null && (
                <span className="label num w-12 text-right">
                  {d > 0 ? "+" : ""}
                  {kg(d)}
                </span>
              )}
              <button
                className="chip press !text-[13px]"
                onClick={() => confirm(`${r.date.slice(8)}.${r.date.slice(5, 7)} tartısı silinsin mi?`) && act({ action: "delete", id: r.id }, { toast: "Silindi" })}
                aria-label={`${r.date} tartısını sil`}
              >
                Sil
              </button>
            </li>
          );
        })}
      </ul>
      <p className="label mt-2">Geçmiş bir günü eklemek ya da düzeltmek için ana sayfadaki tartı kartında Düzelt'e dokunup günü seç (son 7 gün).</p>
    </details>
  );
}
