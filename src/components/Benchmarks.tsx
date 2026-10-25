"use client";
// Fitness tests: a baseline in week 1, then every 4 weeks; the first vs latest shows real progress.
import { useState } from "react";
import { useApp } from "./ui";
import { BENCHMARKS } from "@/lib/training";
import { daysBetween } from "@/lib/dates";

const UNIT: Record<string, string> = { reps: "tekrar", seconds: "sn", meters: "m", cm: "cm" };

export default function Benchmarks() {
  const { s, act } = useApp();
  const mine = BENCHMARKS.filter((b) => b.users.includes(s.user));
  const hist = s.bench as ({ date: string } & Record<string, number | string>)[];
  const [open, setOpen] = useState<string | null>(null);
  const [val, setVal] = useState("");
  const lastDate = hist.length ? hist[hist.length - 1].date : null;
  const due = !lastDate || daysBetween(lastDate, s.today) >= 28;

  return (
    <section className="panel">
      <div className="flex items-baseline justify-between">
        <h2 className="display text-xl font-bold">📏 Güç testleri</h2>
        <span className="label">{due ? (lastDate ? "test zamanı!" : "başlangıç testi") : `sonraki: ${28 - daysBetween(lastDate!, s.today)} gün`}</span>
      </div>
      <p className="text-sm mt-1" style={{ color: "var(--ink-2)" }}>
        4 haftada bir tekrarla. Tartı yavaş değişir, bu sayılar hızlı: ilerlemeni en net burada görürsün.
      </p>
      <ul className="mt-3 space-y-2">
        {mine.map((b) => {
          const vals = hist.filter((h) => typeof h[b.id] === "number").map((h) => ({ date: h.date, v: h[b.id] as number }));
          const first = vals[0],
            last = vals[vals.length - 1];
          const diff = first && last && last !== first ? last.v - first.v : null;
          return (
            <li key={b.id} className="rounded-2xl p-3" style={{ background: "var(--me-soft)" }}>
              <button className="w-full flex items-center gap-2 text-left" onClick={() => { setOpen(open === b.id ? null : b.id); setVal(""); }}>
                <span className="flex-1 min-w-0">
                  <span className="font-semibold block">{b.name}</span>
                  <span className="label">
                    {last ? `son: ${last.v} ${UNIT[b.unit]}` : "henüz yok"}
                    {diff !== null ? ` · başlangıçtan ${diff > 0 ? "+" : ""}${diff}` : ""}
                  </span>
                </span>
                {diff !== null && diff > 0 && <span aria-hidden>🏆</span>}
                <span className="label">{open === b.id ? "▲" : "▼"}</span>
              </button>
              {open === b.id && (
                <div className="mt-2">
                  <p className="text-sm">{b.how}</p>
                  <div className="flex gap-2 mt-2">
                    <input className="field num" inputMode="numeric" placeholder={UNIT[b.unit]} value={val} onChange={(e) => setVal(e.target.value.replace(/\D/g, "").slice(0, 4))} aria-label={`${b.name} sonucu`} />
                    <button
                      className="btn btn-me press shrink-0"
                      disabled={!val}
                      onClick={async () => {
                        const better = last && Number(val) > last.v;
                        if (await act({ action: "benchmark", id: b.id, value: Number(val) }, { toast: better ? "Yeni rekor! 🏆" : "Kaydedildi", celebrate: !!better })) setOpen(null);
                      }}
                    >
                      Kaydet
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
