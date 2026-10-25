"use client";
// Energy spent in training, tied to the sessions that burned it, and what it did to today's plan.
import { useState } from "react";
import { useApp, fmt } from "./ui";

const dShort = (d: string) => new Intl.DateTimeFormat("tr-TR", { weekday: "short", timeZone: "UTC" }).format(new Date(d + "T12:00:00Z"));
const dLong = (d: string) => new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(d + "T12:00:00Z"));
const ICON: Record<string, string> = { strength: "💪", mini: "⚡", walk: "🌊", run: "🏃", custom: "🏅" };

export default function EnergyPanel() {
  const { s } = useApp();
  const days = s.activity14;
  const [sel, setSel] = useState(s.today);
  const week = days.slice(-7);
  const prevWeek = days.slice(0, 7);
  const wEx = week.reduce((a, d) => a + d.exercise, 0);
  const wSteps = week.reduce((a, d) => a + d.stepKcal, 0);
  const pEx = prevWeek.reduce((a, d) => a + d.exercise, 0);
  const sessions = week.flatMap((d) => d.sessions);
  const strength = sessions.filter((x) => x.kind === "strength").length;
  const cardioMin = sessions.filter((x) => x.kind === "walk" || x.kind === "run").reduce((a, x) => a + (x.minutes ?? 0), 0);
  const prs = sessions.reduce((a, x) => a + x.prs, 0);
  const max = Math.max(...days.map((d) => d.exercise + d.stepKcal), 1);
  const day = days.find((d) => d.date === sel) ?? days[days.length - 1];
  const gain = s.profile.goal === "gain";
  const intense = s.profile.intensity !== "standard";
  const todayExtra = s.extraBurnToday;
  const added = s.engine.exerciseAdded;

  return (
    <section className="panel">
      <div className="flex items-baseline justify-between">
        <h2 className="display text-xl font-bold">⚡ Harcadığın enerji</h2>
        <span className="label">son 7 gün</span>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3">
        <div className="rounded-2xl p-2.5 text-center" style={{ background: "var(--me-soft)" }}>
          <p className="display text-2xl font-bold num">{fmt(wEx)}</p>
          <p className="label leading-tight">kcal antrenman</p>
        </div>
        <div className="rounded-2xl p-2.5 text-center" style={{ background: "var(--line)" }}>
          <p className="display text-2xl font-bold num">{fmt(wSteps)}</p>
          <p className="label leading-tight">kcal adım</p>
        </div>
        <div className="rounded-2xl p-2.5 text-center" style={{ background: "var(--line)" }}>
          <p className="display text-2xl font-bold num">{sessions.length}</p>
          <p className="label leading-tight">seans</p>
        </div>
      </div>
      <p className="text-sm mt-2" style={{ color: "var(--ink-2)" }}>
        {strength} kuvvet seansı · {cardioMin} dk kardiyo{prs ? ` · ${prs} rekor 🏆` : ""}
        {pEx > 0 ? ` · geçen haftaya göre ${wEx >= pEx ? "+" : ""}${Math.round(((wEx - pEx) / pEx) * 100)}%` : ""}
        {wEx + wSteps >= 280 ? ` · ≈ ${Math.round((wEx + wSteps) / 280)} simit kadar enerji` : ""}
      </p>

      {/* 14 days: training (solid) + steps (light) */}
      <div className="flex items-end gap-1 mt-3 h-24" role="group" aria-label="Son 14 günün enerji harcaması">
        {days.map((d) => {
          const isSel = d.date === sel;
          const hEx = (d.exercise / max) * 100,
            hSt = (d.stepKcal / max) * 100;
          return (
            <button key={d.date} className="flex-1 h-full flex flex-col justify-end press" onClick={() => setSel(d.date)} aria-pressed={isSel} aria-label={`${dLong(d.date)}: ${d.exercise} kcal antrenman`}>
              <span className="w-full rounded-t-md" style={{ height: `${hSt}%`, background: "var(--me)", opacity: isSel ? 0.35 : 0.18 }} />
              <span className="w-full" style={{ height: `${Math.max(d.exercise ? 4 : 0, hEx)}%`, background: "var(--me)", opacity: isSel ? 1 : 0.6, outline: isSel ? "2px solid var(--ink)" : undefined }} />
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

      {/* sessions of the selected day */}
      <div className="mt-3 rounded-3xl p-3" style={{ background: "var(--me-soft)" }}>
        <p className="font-bold">{sel === s.today ? "Bugün" : dLong(sel)}</p>
        {day.sessions.length === 0 ? (
          <p className="text-sm mt-1" style={{ color: "var(--ink-2)" }}>
            Antrenman yok{day.steps ? `, ${day.steps.toLocaleString("tr-TR")} adım (~${day.stepKcal} kcal)` : ""}.
          </p>
        ) : (
          <ul className="mt-1.5 space-y-1.5">
            {day.sessions.map((x) => (
              <li key={x.id} className="flex items-center gap-2 text-sm">
                <span aria-hidden>{ICON[x.kind] ?? "🏅"}</span>
                <span className="flex-1 min-w-0">
                  {x.name}
                  <span className="label">
                    {x.minutes ? ` · ${x.minutes} dk` : ""}
                    {x.sets ? ` · ${x.sets} set` : ""}
                    {x.prs ? ` · ${x.prs} rekor` : ""}
                    {x.together ? " · birlikte" : ""}
                  </span>
                </span>
                <span className="num font-semibold">~{x.kcal}</span>
              </li>
            ))}
            {day.steps > 0 && (
              <li className="flex items-center gap-2 text-sm">
                <span aria-hidden>👟</span>
                <span className="flex-1">{day.steps.toLocaleString("tr-TR")} adım</span>
                <span className="num font-semibold">~{day.stepKcal}</span>
              </li>
            )}
          </ul>
        )}
      </div>

      {/* what it did to the plan */}
      <p className="text-sm mt-3">
        <b>Planına etkisi:</b>{" "}
        {todayExtra < 40
          ? "Bugün planın dışında ekstra yakım yok; programdaki kuvvet antrenmanları zaten günlük hedefinin içinde."
          : gain
            ? `Bugün ekstra ~${todayExtra} kcal yaktın; kilo almaya devam etmen için hedefine +${added} kcal eklendi. O kadar fazla ye 🍽️`
            : added > 0
              ? `Ekstra ~${todayExtra} kcal yaktın; hedefine sadece +${added} kcal eklendi, gerisi yağ yakımına gidiyor.`
              : `Ekstra ~${todayExtra} kcal yaktın ve hepsi yağ yakımına gidiyor; hedefine geri eklenmedi${intense ? " (yoğun mod)" : ""}. 🔥`}
      </p>
      <p className="text-[11px] mt-2" style={{ color: "var(--ink-3)" }}>
        Değerler dinlenme harcaması çıkarılmış net tahminlerdir (2024 Fiziksel Aktivite Kompendiyumu MET değerleri × kilon × süre). Akıllı saat değerleri genelde daha yüksek çıkar.
      </p>
    </section>
  );
}
