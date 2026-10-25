"use client";
// Manual day: for a late sleeper the day ends when he says so, not at midnight.
import { useState } from "react";
import { createPortal } from "react-dom";
import { useApp, fmt } from "./ui";

const dayName = (d: string) => new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(d + "T12:00:00Z"));

export function DayBar() {
  const { s, act } = useApp();
  const [later, setLater] = useState(false);
  const [sheet, setSheet] = useState(false);
  if (!s.day.manual) return null;
  const hour = new Date().getHours();
  const t = s.engine.targets;
  const kcal = s.totals.kcal;
  const prot = s.totals.protein;

  const summary = sheet && (
    createPortal(
      <div className="fixed inset-0 z-[70] flex items-end" role="dialog" aria-modal="true" aria-label="Günü bitir">
        <button className="absolute inset-0 bg-black/40" aria-label="Kapat" onClick={() => setSheet(false)} />
        <div className="relative w-full max-w-md mx-auto panel !rounded-b-none pb-[max(16px,env(safe-area-inset-bottom))]">
          <p className="label">{dayName(s.today)}</p>
          <h2 className="display text-2xl font-bold">Günün özeti 🌙</h2>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[
              [fmt(kcal), `/ ${fmt(t.kcal)} kcal`],
              [`${Math.round(prot)}`, `/ ${t.protein} g protein`],
              [`${s.todayScore.points}`, "puan"],
            ].map(([v, l]) => (
              <div key={l} className="rounded-2xl p-2.5 text-center" style={{ background: "var(--me-soft)" }}>
                <p className="display text-xl font-bold num">{v}</p>
                <p className="label leading-tight">{l}</p>
              </div>
            ))}
          </div>
          <p className="text-sm mt-3">
            {s.profile.goal === "gain"
              ? kcal >= t.kcal * 0.95
                ? "Hedefi tutturdun, kas için tam gereken buydu 💪"
                : `Hedefe ${fmt(t.kcal - kcal)} kcal kaldı. Yatmadan bir shake ya da tahin-pekmezli ekmek bunu kapatır.`
              : kcal <= t.kcal * 1.05
                ? "Planın içinde kaldın 👏"
                : "Bugün biraz fazla oldu, sorun değil; yarın plana devam."}
          </p>
          <p className="label mt-2">Yeni güne başlayınca bundan sonraki kayıtların yeni güne yazılır. Bugünün kayıtları geçmişte durur.</p>
          <div className="grid grid-cols-[auto_1fr] gap-2 mt-4">
            <button className="btn btn-ghost press" onClick={() => setSheet(false)}>
              Vazgeç
            </button>
            <button
              className="btn btn-me press"
              onClick={async () => {
                if (await act({ action: "newDay" }, { toast: "Günaydın! Yeni gün başladı ☀️", celebrate: true })) setSheet(false);
              }}
            >
              Günü bitir, yeni gün ☀️
            </button>
          </div>
        </div>
      </div>,
      document.body
    )
  );

  if (s.day.pending && !later) {
    return (
      <section className="panel !py-3" style={{ background: "linear-gradient(120deg,#1d1b3a,#3b2f6b)", color: "#fff" }}>
        {summary}
        <p className="font-bold">🌙 Hâlâ {dayName(s.today).split(" ")[0]} gecesi mi?</p>
        <p className="text-sm opacity-80">Takvimde yeni gün başladı. Sen uyuyup kalktıysan yeni güne geç; hâlâ ayaktaysan kayıtlar bugüne yazılmaya devam eder.</p>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <button className="btn press !bg-white/15 !text-white !border-white/20" onClick={() => setLater(true)}>
            Hâlâ aynı gün
          </button>
          <button className="btn btn-me press" onClick={() => setSheet(true)}>
            Yeni güne başla
          </button>
        </div>
      </section>
    );
  }
  if (hour >= 20 || hour < 5) {
    return (
      <>
        {summary}
        <button className="panel !py-2.5 w-full flex items-center gap-3 text-left press" onClick={() => setSheet(true)}>
          <span className="text-2xl" aria-hidden>
            🌙
          </span>
          <span className="flex-1">
            <span className="font-bold block">Günü bitir</span>
            <span className="label">Yatmadan önce özetine bak, yeni güne geç.</span>
          </span>
          <span className="label">›</span>
        </button>
      </>
    );
  }
  return null;
}
