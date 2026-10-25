"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AppState } from "@/lib/state";
import { AppCtx, type TabId } from "./ui";
import Today from "./Today";
import Food from "./Food";
import Workout from "./Workout";
import Coach from "./Coach";
import Race from "./Race";
import Progress from "./Progress";
import Onboarding from "./Onboarding";
import CoupleMeter from "./CoupleMeter";

const TABS: { id: TabId; label: string }[] = [
  { id: "bugun", label: "Bugün" },
  { id: "yemek", label: "Yemek" },
  { id: "antrenman", label: "Spor" },
  { id: "koc", label: "Koç" },
  { id: "yaris", label: "Yarış" },
  { id: "ilerleme", label: "İlerleme" },
];

export default function Dashboard({ user }: { user: "tolga" | "eylul" }) {
  const router = useRouter();
  const [s, setS] = useState<AppState | null>(null);
  const [tab, setTab] = useState<TabId>("bugun");
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const [err, setErr] = useState("");

  const reload = useCallback(async () => {
    const r = await fetch("/api/state", { cache: "no-store" });
    if (r.status === 401) {
      router.replace("/");
      return;
    }
    setS(await r.json());
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
    const t = setInterval(reload, 60000);
    return () => clearInterval(t);
  }, [reload]);

  const toast = useCallback((text: string) => {
    const id = Date.now() + Math.random();
    setToasts((x) => [...x, { id, text }]);
    setTimeout(() => setToasts((x) => x.filter((y) => y.id !== id)), 2600);
  }, []);

  const act = useCallback(
    async (body: Record<string, unknown>, opts?: { toast?: string; points?: number }) => {
      setErr("");
      const r = await fetch("/api/act", { method: "POST", body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(j.error ?? "Bir şey ters gitti");
        return false;
      }
      if (opts?.toast) toast(opts.points ? `${opts.toast}  +${opts.points}` : opts.toast);
      await reload();
      return true;
    },
    [reload, toast]
  );

  if (!s) {
    return (
      <main data-user={user} className="min-h-dvh grid place-items-center">
        <p className="display text-2xl" style={{ color: "var(--ink-2)" }}>Plan hazırlanıyor…</p>
      </main>
    );
  }

  return (
    <AppCtx.Provider value={{ s, act, reload, toast, go: setTab }}>
      <div data-user={user} className="min-h-dvh pb-24 sm:pb-10">
        <header className="max-w-6xl mx-auto px-4 pt-5 sm:pt-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="label">
                {s.engine.week}. hafta, {s.habitDay}. gün
              </p>
              <h1 className="display text-3xl sm:text-4xl font-bold leading-tight">Selam {s.profile.name}</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="chip num" title="Toplam puan">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--me)" }} />
                {s.scores.me.total.toLocaleString("tr-TR")} puan
              </span>
              <button
                className="chip"
                onClick={async () => {
                  await fetch("/api/act", { method: "POST", body: JSON.stringify({ action: "logout" }) });
                  router.replace("/");
                }}
              >
                Profil değiştir
              </button>
            </div>
          </div>
          <CoupleMeter />
          <nav className="hidden sm:flex gap-1 mt-5" aria-label="Bölümler">
            {TABS.map((t) => (
              <button key={t.id} className="chip" aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </nav>
        </header>

        {err && (
          <div className="max-w-6xl mx-auto px-4 mt-3">
            <p className="panel" role="alert" style={{ background: "var(--warn-soft)", color: "var(--warn)" }}>
              {err}
            </p>
          </div>
        )}

        <main className="max-w-6xl mx-auto px-4 mt-4">
          {tab === "bugun" && <Today />}
          {tab === "yemek" && <Food />}
          {tab === "antrenman" && <Workout />}
          {tab === "koc" && <Coach />}
          {tab === "yaris" && <Race />}
          {tab === "ilerleme" && <Progress />}
        </main>

        <nav
          className="sm:hidden fixed bottom-0 inset-x-0 grid grid-cols-6 border-t"
          style={{ background: "var(--paper)", borderColor: "var(--line)", paddingBottom: "env(safe-area-inset-bottom)" }}
          aria-label="Bölümler"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="py-3 text-[13px] font-semibold"
              style={{ color: tab === t.id ? "var(--me-ink)" : "var(--ink-3)", borderTop: tab === t.id ? "3px solid var(--me)" : "3px solid transparent" }}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="fixed top-4 inset-x-0 flex flex-col items-center gap-2 pointer-events-none z-50" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className="pop rounded-full px-4 py-2 font-semibold shadow-lg" style={{ background: "var(--ink)", color: "var(--paper)" }}>
              {t.text}
            </div>
          ))}
        </div>

        {!s.profile.onboarded && <Onboarding />}
      </div>
    </AppCtx.Provider>
  );
}
