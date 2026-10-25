"use client";
// "Ne yedim?" history: 14 days of intake vs target, tap a day to see (and fix) what you ate.
import { useCallback, useEffect, useState } from "react";
import { useApp, fmt } from "./ui";
import QuickLog from "./QuickLog";
import { addDays } from "@/lib/dates";
import type { FoodEntry } from "@/lib/engine";

type Day = { date: string; foods: (FoodEntry & { id: string })[]; water: number; weight?: number; workouts: number };
const dShort = (d: string) => new Intl.DateTimeFormat("tr-TR", { weekday: "short", timeZone: "UTC" }).format(new Date(d + "T12:00:00Z"));
const dLong = (d: string) => new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(d + "T12:00:00Z"));
const MEALS = ["kahvaltı", "öğle", "ara öğün", "akşam"];

export default function History() {
  const { s, act } = useApp();
  const days = s.eating14;
  const [sel, setSel] = useState(s.today);
  const [day, setDay] = useState<Day | null>(null);
  const [adding, setAdding] = useState(false);
  const gain = s.profile.goal === "gain";

  const load = useCallback(async (d: string) => {
    setDay(null);
    try {
      const r = await fetch(`/api/history?date=${d}`, { cache: "no-store" });
      if (r.ok) setDay(await r.json());
    } catch {
      /* offline */
    }
  }, []);
  useEffect(() => {
    load(sel);
  }, [sel, load, s.eating14]);

  const max = Math.max(...days.map((d) => Math.max(d.kcal, d.target ?? 0)), 1);
  const logged = days.filter((d) => d.items > 0 && d.date < s.today);
  const inRange = logged.filter((d) => d.target && (gain ? d.kcal >= d.target * 0.95 : d.kcal <= d.target * 1.05 && d.kcal >= d.target * 0.8)).length;
  const avg = logged.length ? Math.round(logged.reduce((a, d) => a + d.kcal, 0) / logged.length) : 0;
  const total = day?.foods.reduce((a, f) => a + f.kcal, 0) ?? 0;
  const prot = day?.foods.reduce((a, f) => a + (f.protein || 0), 0) ?? 0;
  const target = days.find((d) => d.date === sel)?.target;
  const canAdd = sel >= addDays(s.today, -7);

  return (
    <section className="panel">
      <div className="flex items-baseline justify-between">
        <h2 className="display text-xl font-bold">📅 Ne yedim?</h2>
        <span className="label">son 14 gün</span>
      </div>
      {logged.length > 0 && (
        <p className="text-sm mt-1" style={{ color: "var(--ink-2)" }}>
          Ortalama <b style={{ color: "var(--ink)" }}>{fmt(avg)} kcal</b> · {logged.length} günün {inRange}&apos;inde hedefteydin
        </p>
      )}

      {/* bars: intake vs target, tap to open a day */}
      <div className="flex items-end gap-1 mt-3 h-28" role="group" aria-label="Son 14 günün kalorisi">
        {days.map((d) => {
          const h = Math.round((d.kcal / max) * 100);
          const th = d.target ? Math.round((d.target / max) * 100) : null;
          const ok = d.target ? (gain ? d.kcal >= d.target * 0.95 : d.kcal <= d.target * 1.05) : true;
          const isSel = d.date === sel;
          return (
            <button key={d.date} className="relative flex-1 h-full flex flex-col justify-end items-center press" onClick={() => setSel(d.date)} aria-pressed={isSel} aria-label={`${dLong(d.date)}: ${d.kcal} kcal`}>
              {th !== null && <span className="absolute left-0 right-0 border-t-2 border-dashed" style={{ bottom: `${th}%`, borderColor: "var(--ink-3)" }} />}
              <span className="w-full rounded-t-md transition-all" style={{ height: `${Math.max(d.items ? 4 : 1, h)}%`, background: d.items ? (ok ? "var(--me)" : "var(--warn, #e76f51)") : "var(--line)", opacity: isSel ? 1 : 0.55, outline: isSel ? "2px solid var(--ink)" : undefined }} />
            </button>
          );
        })}
      </div>
      <div className="flex gap-1 mt-1">
        {days.map((d) => (
          <span key={d.date} className="flex-1 text-center text-[9px]" style={{ color: d.date === sel ? "var(--ink)" : "var(--ink-3)", fontWeight: d.date === sel ? 800 : 400 }}>
            {d.date === s.today ? "bgn" : dShort(d.date).slice(0, 2)}
          </span>
        ))}
      </div>

      {/* selected day */}
      <div className="mt-4 rounded-3xl p-3" style={{ background: "var(--me-soft)" }}>
        <div className="flex items-center gap-2">
          <button className="chip press !px-3" onClick={() => setSel(addDays(sel, -1))} disabled={sel <= addDays(s.today, -365)} aria-label="Önceki gün">
            ‹
          </button>
          <p className="font-bold flex-1 text-center">{sel === s.today ? "Bugün" : dLong(sel)}</p>
          <button className="chip press !px-3" onClick={() => setSel(addDays(sel, 1))} disabled={sel >= s.today} aria-label="Sonraki gün">
            ›
          </button>
        </div>
        {!day ? (
          <p className="label text-center py-4">Yükleniyor…</p>
        ) : (
          <>
            <p className="text-center mt-2">
              <span className="display text-3xl font-bold num">{fmt(total)}</span> kcal
              {target ? <span className="label"> / hedef {fmt(target)}</span> : null}
              <span className="label"> · {Math.round(prot)} g protein</span>
            </p>
            <p className="label text-center">
              {day.weight ? `⚖️ ${day.weight.toLocaleString("tr-TR")} kg · ` : ""}💧 {day.water} bardak{day.workouts ? ` · 💪 ${day.workouts} antrenman` : ""}
            </p>
            {day.foods.length === 0 ? (
              <p className="text-sm text-center py-3" style={{ color: "var(--ink-2)" }}>
                Bu güne kayıt yok.
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                {[...MEALS, undefined].map((m) => {
                  const fs = day.foods.filter((f) => (m ? f.meal === m : !f.meal || !MEALS.includes(f.meal)));
                  if (!fs.length) return null;
                  return (
                    <div key={m ?? "other"}>
                      <p className="label capitalize">
                        {m ?? "diğer"} · {fmt(fs.reduce((a, f) => a + f.kcal, 0))} kcal
                      </p>
                      <ul className="mt-0.5">
                        {fs.map((f) => (
                          <li key={f.id} className="flex items-center gap-2 py-1 text-sm">
                            <span className="label w-10 num">{f.time ?? ""}</span>
                            <span className="flex-1 min-w-0">
                              {f.name}
                              {f.amount ? <span className="label"> · {f.amount}</span> : null}
                            </span>
                            <span className="num">{f.kcal}</span>
                            <button
                              className="label underline"
                              onClick={async () => {
                                if (confirm(`${f.name} silinsin mi?`) && (await act({ action: "delete", id: f.id }, { toast: "Silindi" }))) load(sel);
                              }}
                              aria-label={`${f.name} sil`}
                            >
                              ✕
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
            {canAdd && sel !== s.today && (
              <button className="btn btn-ghost w-full mt-3 press" onClick={() => setAdding(!adding)}>
                {adding ? "Kapat" : "＋ Bu güne unuttuğumu ekle"}
              </button>
            )}
          </>
        )}
      </div>
      {adding && canAdd && sel !== s.today && (
        <div className="mt-3">
          <QuickLog
            date={sel}
            title={`${dShort(sel)} ne yemiştin?`}
            onDone={() => {
              setAdding(false);
              load(sel);
            }}
          />
        </div>
      )}
    </section>
  );
}
