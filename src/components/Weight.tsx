"use client";
// Weigh-in + weight charts for both of us. Daily weights are noisy (water, salt, food in the gut, cycle),
// so the line we judge by is the smoothed trend; dots are the raw scale readings.
import { useMemo, useState } from "react";
import { useApp, kg } from "./ui";
import { addDays } from "@/lib/dates";

const round1 = (x: number) => Math.round(x * 10) / 10;

export function WeighIn() {
  const { s, act } = useApp();
  const log = s.weightLog;
  const yesterday = [...log].reverse().find((w) => w.date < s.today);
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(s.today);
  const [w, setW] = useState<number>(s.weighedToday ?? s.lastWeight ?? s.profile.startWeight);
  const [typed, setTyped] = useState<string | null>(null);

  const open = !s.weighedToday || editing;
  const parsed = typed !== null ? Number(typed.replace(",", ".")) : w;
  const value = Number.isFinite(parsed) ? parsed : w;
  const valid = Number.isFinite(parsed) && parsed >= 30 && parsed <= 200;
  const pick = (d: string) => {
    setDate(d);
    setTyped(null);
    const known = log.find((x) => x.date === d)?.kg;
    if (known) setW(known);
  };

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
    }
  }

  if (!open) {
    const delta = yesterday ? round1(s.weighedToday! - yesterday.kg) : null;
    return (
      <section className="panel !py-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden>
            ⚖️
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-bold">
              Trend <span className="num">{kg(s.engine.currentWeight)}</span> kg
              {s.engine.weeklyRate !== null && (
                <span className="label num">
                  {" "}
                  · haftada {s.engine.weeklyRate > 0 ? "+" : ""}
                  {kg(s.engine.weeklyRate)}
                </span>
              )}
            </p>
            <p className="label">
              Tartı <span className="num">{kg(s.weighedToday!)}</span> kg
              {delta !== null && delta !== 0 ? ` (dünden ${delta > 0 ? "+" : ""}${kg(delta)})` : ""}
              {Math.abs(s.weighedToday! - s.engine.currentWeight) > 0.5
                ? s.cycle?.waterWeightLikely
                  ? ". Döngüden su tutulumu olabilir, trend neredeyse kımıldamadı."
                  : ". Tek günlük oynama; trend neredeyse kımıldamadı."
                : ""}
            </p>
          </div>
          <button className="chip press" onClick={() => setEditing(true)}>
            Düzelt
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="display text-xl font-bold">⚖️ Tartıldın mı?</h2>
        {editing && (
          <button className="label underline" onClick={() => setEditing(false)}>
            Vazgeç
          </button>
        )}
      </div>
      <p className="label mt-0.5">Sabah, tuvaletten sonra, kahvaltıdan önce. Her gün aynı koşulda.</p>
      <div className="flex items-center gap-3 mt-3">
        <button className="btn btn-ghost !w-14 !h-14 !p-0 text-2xl press" onClick={() => { setTyped(null); setW(round1(value - 0.1)); }} aria-label="0,1 kg azalt">
          −
        </button>
        <input
          className="field num display !text-4xl font-bold text-center !py-2 flex-1 min-w-0"
          inputMode="decimal"
          aria-label="Kilo (kg)"
          value={typed ?? kg(w)}
          onFocus={(e) => e.target.select()}
          onChange={(e) => setTyped(e.target.value.replace(/[^\d.,]/g, "").slice(0, 5))}
          onKeyDown={(e) => e.key === "Enter" && save()}
        />
        <button className="btn btn-ghost !w-14 !h-14 !p-0 text-2xl press" onClick={() => { setTyped(null); setW(round1(value + 0.1)); }} aria-label="0,1 kg artır">
          +
        </button>
      </div>
      <div className="flex gap-2 mt-2 overflow-x-auto scroll-x">
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
      <button className="btn btn-me w-full mt-3 press" disabled={!valid} onClick={save}>
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
  const ticks = [lo + pad, (lo + hi) / 2, hi - pad];
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
      ? { date: addDays(lastT.date, 28), v: p.goal === "gain" ? Math.min(p.targetWeight, lastT.trend + rate * 4) : Math.max(p.targetWeight, lastT.trend + rate * 4) }
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
