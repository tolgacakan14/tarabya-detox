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
import { Confetti } from "./fx";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "bugun", label: "Bugün", icon: "🏠" },
  { id: "yemek", label: "Yemek", icon: "🍽️" },
  { id: "antrenman", label: "Spor", icon: "💪" },
  { id: "koc", label: "Koç", icon: "💬" },
  { id: "yaris", label: "Yarış", icon: "🏆" },
  { id: "ilerleme", label: "İlerleme", icon: "📈" },
];

export default function Dashboard({ user }: { user: "tolga" | "eylul" }) {
  const router = useRouter();
  const [s, setS] = useState<AppState | null>(null);
  const [tab, setTab] = useState<TabId>("bugun");
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const [err, setErr] = useState("");
  const [loadErr, setLoadErr] = useState(false);
  const [fire, setFire] = useState(0);

  const reload = useCallback(async () => {
    let r: Response;
    try {
      r = await fetch("/api/state", { cache: "no-store" });
    } catch {
      setLoadErr(true);
      return;
    }
    if (r.status === 401) {
      router.replace("/");
      return;
    }
    if (r.ok) {
      setS(await r.json());
      setLoadErr(false);
    } else setLoadErr(true);
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

  const celebrate = useCallback(() => setFire((f) => f + 1), []);

  const act = useCallback(
    async (body: Record<string, unknown>, opts?: { toast?: string; points?: number; celebrate?: boolean }) => {
      setErr("");
      const r = await fetch("/api/act", { method: "POST", body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(j.error ?? "Bir şey ters gitti");
        return false;
      }
      if (opts?.toast) toast(opts.points ? `${opts.toast}  +${opts.points}` : opts.toast);
      if (opts?.celebrate || (opts?.points ?? 0) >= 20) celebrate();
      await reload();
      return true;
    },
    [reload, toast, celebrate]
  );

  const go = useCallback((t: TabId) => {
    setTab(t);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  if (!s) {
    return (
      <main data-user={user} className="min-h-dvh grid place-items-center">
        <div className="blobs" aria-hidden>
          <span />
          <span />
          <span />
        </div>
        {loadErr ? (
          <div className="relative z-10 text-center px-6">
            <p className="display text-2xl font-bold">Sunucuya ulaşamadım</p>
            <p className="mt-1" style={{ color: "var(--ink-2)" }}>İnternetini kontrol edip tekrar dene.</p>
            <button className="btn btn-me mt-4 press" onClick={() => reload()}>
              Tekrar dene
            </button>
          </div>
        ) : (
          <p className="display text-2xl font-bold text-grad">Plan hazırlanıyor…</p>
        )}
      </main>
    );
  }

  return (
    <AppCtx.Provider value={{ s, act, reload, toast, celebrate, go }}>
      <div data-user={user} className="min-h-dvh pb-28">
        <div className="blobs" aria-hidden>
          <span />
          <span />
          <span />
        </div>
        <header className="relative z-10 max-w-md mx-auto px-4 pt-5 flex items-center justify-between gap-3">
          <h1 className="display text-3xl font-bold leading-tight">
            Selam <span className="text-grad">{s.profile.name}</span>
          </h1>
          <div className="flex items-center gap-2">
            <span className="chip num font-semibold" title="Toplam puan">
              ⭐ {s.scores.me.total.toLocaleString("tr-TR")}
            </span>
            <button
              className="chip"
              onClick={async () => {
                await fetch("/api/act", { method: "POST", body: JSON.stringify({ action: "logout" }) });
                router.replace("/");
              }}
              aria-label="Profil değiştir"
            >
              ⇄
            </button>
          </div>
        </header>


        {err && (
          <div className="max-w-md mx-auto px-4 mt-3">
            <p className="panel !py-3" role="alert" style={{ background: "var(--warn-soft)", color: "var(--warn)" }}>
              {err}
            </p>
          </div>
        )}

        <main className="relative z-10 max-w-md mx-auto px-4 mt-4">
          {tab === "bugun" && <Today />}
          {tab === "yemek" && <Food />}
          {tab === "antrenman" && <Workout />}
          {tab === "koc" && <Coach />}
          {tab === "yaris" && <Race />}
          {tab === "ilerleme" && <Progress />}
        </main>

        <nav
          className="fixed bottom-3 left-3 right-3 mx-auto max-w-[424px] grid grid-cols-6 rounded-3xl shadow-xl z-40"
          style={{ background: "var(--paper)", paddingBottom: "env(safe-area-inset-bottom)" }}
          aria-label="Bölümler"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => go(t.id)}
              className="min-h-[56px] py-2 flex flex-col items-center justify-center gap-0.5 press"
              aria-current={tab === t.id ? "page" : undefined}
            >
              <span className={`text-xl leading-none transition-transform ${tab === t.id ? "scale-125" : "opacity-60"}`} aria-hidden>
                {t.icon}
              </span>
              <span className="text-[11px] font-semibold" style={{ color: tab === t.id ? "var(--me-ink)" : "var(--ink-3)" }}>
                {t.label}
              </span>
            </button>
          ))}
        </nav>

        <div className="fixed top-4 inset-x-0 flex flex-col items-center gap-2 pointer-events-none z-50" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className="pop rounded-full px-5 py-2.5 font-bold shadow-lg grad-me text-white">
              {t.text}
            </div>
          ))}
        </div>
        <Confetti fire={fire} />

        {!s.profile.onboarded && <Onboarding />}
      </div>
    </AppCtx.Provider>
  );
}
