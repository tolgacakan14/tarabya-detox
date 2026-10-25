"use client";
// Guided workout player: readiness → warm-up → one exercise at a time with set logging and an
// automatic rest timer → cool-down → summary with PRs. Plus an interval player for walk/run and circuits.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "./ui";
import type { AppState } from "@/lib/state";
import { EXERCISES, LADDERS, ROUTINES, detectPR, netKcal, readiness, type CardioSession, type CircuitSession, type Effort, type Segment } from "@/lib/training";
import { MUSCLE_LABEL } from "@/lib/activity";
import ExerciseDemo from "./ExerciseDemo";

type Session = NonNullable<AppState["program"]["session"]>;
type Rx = Session["exercises"][number];
type Row = { ladder: string; step: number; targets: number[]; done: (number | null)[]; effort?: Effort };

// ---------- small device helpers ----------
let audioCtx: AudioContext | null = null;
function beep(freq = 880, ms = 160) {
  try {
    audioCtx = audioCtx ?? new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const o = audioCtx.createOscillator(),
      g = audioCtx.createGain();
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.15, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + ms / 1000);
    o.connect(g).connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + ms / 1000);
  } catch {
    /* no audio */
  }
}
function say(text: string) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "tr-TR";
    u.rate = 1.02;
    window.speechSynthesis?.cancel();
    window.speechSynthesis?.speak(u);
  } catch {
    /* no speech */
  }
}
function useWakeLock(on: boolean) {
  useEffect(() => {
    if (!on) return;
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as unknown as { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    return () => {
      lock?.release().catch(() => {});
    };
  }, [on]);
}
const mmss = (s: number) => {
  const t = Math.max(0, Math.ceil(s - 0.05));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

function Sheet({ children, onClose, label }: { children: React.ReactNode; onClose?: () => void; label: string }) {
  return createPortal(
    <div className="fixed inset-0 z-[70] flex flex-col" role="dialog" aria-modal="true" aria-label={label} style={{ background: "var(--paper, #fff)" }}>
      {children}
      {onClose && <span className="hidden" />}
    </div>,
    document.body
  );
}

// ---------- rest timer ----------
function RestTimer({ seconds, next, onDone }: { seconds: number; next: string; onDone: () => void }) {
  const [end, setEnd] = useState(() => Date.now() + seconds * 1000);
  const [now, setNow] = useState(Date.now());
  const fired = useRef(false);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, (end - now) / 1000);
  useEffect(() => {
    if (left <= 3.2 && left > 0 && Math.abs(left - Math.round(left)) < 0.13) beep(660, 90);
    if (left <= 0 && !fired.current) {
      fired.current = true;
      beep(990, 260);
      navigator.vibrate?.([120, 60, 120]);
      onDone();
    }
  }, [left, onDone]);
  const pct = Math.min(1, left / seconds);
  const R = 70,
    C = 2 * Math.PI * R;
  return (
    <div className="fixed inset-x-0 bottom-0 z-[80] rounded-t-3xl shadow-2xl p-5 pb-[max(20px,env(safe-area-inset-bottom))]" style={{ background: "var(--paper, #fff)" }} role="timer" aria-live="polite">
      <p className="label text-center">Dinlen</p>
      <div className="relative mx-auto mt-1" style={{ width: 168, height: 168 }}>
        <svg width="168" height="168" viewBox="0 0 168 168">
          <circle cx="84" cy="84" r={R} stroke="var(--line)" strokeWidth="12" fill="none" />
          <circle cx="84" cy="84" r={R} stroke="var(--me)" strokeWidth="12" fill="none" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} transform="rotate(-90 84 84)" style={{ transition: "stroke-dashoffset .25s linear" }} />
        </svg>
        <p className="absolute inset-0 grid place-items-center display text-5xl font-bold num">{mmss(left)}</p>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3">
        <button className="btn btn-ghost press" onClick={() => setEnd((e) => Math.max(Date.now() + 1000, e - 15000))}>
          −15
        </button>
        <button className="btn btn-me press" onClick={onDone}>
          Atla
        </button>
        <button className="btn btn-ghost press" onClick={() => setEnd((e) => e + 15000)}>
          +15
        </button>
      </div>
      <p className="text-sm text-center mt-3" style={{ color: "var(--ink-2)" }}>
        Sıradaki: <b style={{ color: "var(--ink)" }}>{next}</b>
      </p>
    </div>
  );
}

// ---------- routine (warm-up / cool-down) ----------
function RoutineRunner({ id, onDone, onSkip }: { id: string; onDone: () => void; onSkip: () => void }) {
  const r = ROUTINES[id];
  const [i, setI] = useState(0);
  const [left, setLeft] = useState<number | null>(null);
  const step = r?.steps[i];
  const ex = step ? EXERCISES[step.exercise] : undefined;
  const total = step?.seconds ? step.seconds * (step.perSide ? 2 : 1) : 0;
  const next = useCallback(() => {
    setLeft(null);
    if (!r || i >= r.steps.length - 1) onDone();
    else setI(i + 1);
  }, [i, r, onDone]);
  useEffect(() => {
    if (left === null) return;
    if (left <= 0) {
      beep(990, 200);
      navigator.vibrate?.(100);
      next();
      return;
    }
    const t = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(t);
  }, [left, next]);
  if (!r || !step || !ex) return null;
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <p className="label">{r.title} · {i + 1}/{r.steps.length}</p>
      <div className="flex gap-1 mt-2">
        {r.steps.map((_, k) => (
          <span key={k} className="h-1.5 flex-1 rounded-full" style={{ background: k <= i ? "var(--me)" : "var(--line)" }} />
        ))}
      </div>
      <div className="panel mt-4">
        <div className="rounded-2xl grid place-items-center mb-2" style={{ background: "var(--me-soft)" }}>
          <ExerciseDemo key={ex.id} pattern={ex.pattern} size={0.8} />
        </div>
        <h3 className="display text-2xl font-bold">{ex.name}</h3>
        <p className="mt-1 text-lg font-semibold">
          {step.reps ? `${step.reps} tekrar` : `${step.seconds} sn`}
          {step.perSide ? " · her taraf" : ""}
        </p>
        <p className="text-sm mt-2" style={{ color: "var(--ink-2)" }}>
          {ex.how}
        </p>
        <ul className="text-sm mt-2 space-y-0.5">
          {ex.cues.map((c) => (
            <li key={c}>✓ {c}</li>
          ))}
        </ul>
        {step.seconds ? (
          <button className="btn btn-me w-full mt-4 press !py-4 text-lg" onClick={() => (left === null ? setLeft(total) : next())}>
            {left === null ? `▶ Başlat (${mmss(total)})` : `${mmss(left)} · geç`}
          </button>
        ) : (
          <button className="btn btn-me w-full mt-4 press !py-4 text-lg" onClick={next}>
            Tamam ✓
          </button>
        )}
      </div>
      {i === r.steps.length - 1 && r.closing && (
        <p className="text-sm mt-3" style={{ color: "var(--ink-2)" }}>
          💡 {r.closing}
        </p>
      )}
      <button className="label underline mt-4 block mx-auto" onClick={onSkip}>
        Bu bölümü atla
      </button>
    </div>
  );
}

// ---------- strength player ----------
export function StrengthPlayer({ session, onClose }: { session: Session; onClose: () => void }) {
  const { s, act } = useApp();
  const key = `player-${s.user}-${s.today}-${session.templateId}`;
  const [phase, setPhase] = useState<"ready" | "warmup" | "work" | "cooldown" | "done">("ready");
  const [mode, setMode] = useState<"normal" | "light">("normal");
  const [rows, setRows] = useState<Row[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "null");
      if (saved?.rows) return saved.rows;
    } catch {
      /* fresh */
    }
    return session.exercises.map((e) => ({ ladder: e.ladder, step: e.step, targets: e.targets, done: e.targets.map(() => null) }));
  });
  const [idx, setIdx] = useState(0);
  const [rest, setRest] = useState<{ sec: number; next: string; id: number } | null>(null);
  const [startedAt] = useState(() => Date.now());
  const [doneAt, setDoneAt] = useState<number | null>(null);
  const [openHow, setOpenHow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  useWakeLock(phase !== "done");

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify({ rows }));
    } catch {
      /* private mode */
    }
  }, [rows, key]);

  const rx: Rx = session.exercises[idx];
  const row = rows[idx];
  const ex = EXERCISES[LADDERS[row.ladder].steps[row.step]];
  const unit = ex.unit === "seconds" ? "sn" : "tekrar";
  const setsHere = mode === "light" ? Math.max(1, row.targets.length - 1) : row.targets.length;
  const update = (patch: Partial<Row>) => setRows(rows.map((r, k) => (k === idx ? { ...r, ...patch } : r)));
  const nextName = idx < rows.length - 1 ? EXERCISES[LADDERS[rows[idx + 1].ladder].steps[rows[idx + 1].step]].name : "Soğuma";

  const minutes = Math.min(180, Math.max(5, Math.round(((doneAt ?? Date.now()) - startedAt) / 60000)));
  useEffect(() => {
    if (phase === "done" && doneAt === null) setDoneAt(Date.now());
  }, [phase, doneAt]);
  const kg = s.engine.currentWeight;
  const items = rows.map((r) => ({ ladder: r.ladder, step: r.step, sets: r.done.slice(0, mode === "light" ? Math.max(1, r.targets.length - 1) : r.targets.length).map((x) => x ?? 0), effort: r.effort }));
  const prs = useMemo(
    () =>
      phase === "done"
        ? session.exercises.flatMap((e, k) => {
            const pr = detectPR(e.best ?? undefined, e.ladder, items[k].step, items[k].sets);
            return pr ? [pr] : [];
          })
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phase]
  );
  const totalSets = items.reduce((a, i) => a + i.sets.filter((x) => x > 0).length, 0);
  const totalReps = items.reduce((a, i) => a + i.sets.reduce((x, y) => x + y, 0), 0);

  async function save() {
    setSaving(true);
    const ok = await act(
      { action: "workout", log: { type: "strength", minutes, v2: { template: session.templateId, week: s.program.week, items, prs: prs.length, readiness: mode } } },
      { toast: prs.length ? `Antrenman kaydedildi, ${prs.length} rekor! 🏆` : "Antrenman kaydedildi 💪", points: 40, celebrate: true }
    );
    setSaving(false);
    if (ok) {
      setSaved(true);
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    }
  }

  return (
    <Sheet label={session.title}>
      {/* top bar */}
      <div className="sticky top-0 z-10 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-2 border-b" style={{ background: "var(--paper, #fff)", borderColor: "var(--line)" }}>
        <div className="flex items-center gap-3">
          <button className="w-11 h-11 rounded-full grid place-items-center press" style={{ background: "var(--line)" }} onClick={onClose} aria-label="Kapat">
            ✕
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-bold truncate">{session.title}</p>
            <p className="label">
              {s.program.week}. hafta · {s.program.phase.name}
              {mode === "light" ? " · hafif gün" : ""}
            </p>
          </div>
        </div>
        {phase === "work" && (
          <div className="flex gap-1 mt-2">
            {rows.map((r, k) => (
              <button key={k} className="h-2 flex-1 rounded-full" aria-label={`${k + 1}. hareket`} onClick={() => setIdx(k)} style={{ background: r.done.some((x) => x !== null) ? "var(--me)" : k === idx ? "var(--ink-3)" : "var(--line)" }} />
            ))}
          </div>
        )}
      </div>

      {phase === "ready" && (
        <Readiness
          female={s.profile.sex === "f"}
          sleep={s.sleep ?? undefined}
          onStart={(m) => {
            setMode(m);
            setPhase("warmup");
          }}
          onSwap={onClose}
          session={session}
        />
      )}
      {phase === "warmup" && <RoutineRunner id={session.warmup} onDone={() => setPhase("work")} onSkip={() => setPhase("work")} />}
      {phase === "cooldown" && <RoutineRunner id={session.cooldown} onDone={() => setPhase("done")} onSkip={() => setPhase("done")} />}

      {phase === "work" && (
        <div className="flex-1 overflow-y-auto p-4 pb-40">
          <div className="panel">
            <div className="rounded-2xl grid place-items-center -mx-1 -mt-1 mb-2" style={{ background: "var(--me-soft)" }}>
              <ExerciseDemo key={ex.id} pattern={ex.pattern} />
            </div>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="label">
                  {idx + 1}/{rows.length} · {LADDERS[row.ladder].name}
                  {rx.pair ? ` · süperset ${rx.pair}` : ""}
                </p>
                <h3 className="display text-2xl font-bold leading-tight mt-0.5">{ex.name}</h3>
              </div>
              <span className="chip !min-h-[30px] !text-[12px] shrink-0">{"●".repeat(ex.difficulty)}</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {ex.primary.map((m) => (
                <span key={m} className="text-[12px] font-semibold rounded-full px-2 py-0.5" style={{ background: "var(--me-soft)", color: "var(--me-ink)" }}>
                  {MUSCLE_LABEL[m]}
                </span>
              ))}
              {ex.secondary.map((m) => (
                <span key={m} className="text-[12px] rounded-full px-2 py-0.5" style={{ background: "var(--line)" }}>
                  {MUSCLE_LABEL[m]}
                </span>
              ))}
            </div>
            <p className="font-semibold mt-3">
              {setsHere} set · {ex.min}-{ex.max} {unit}
              {ex.perSide ? " (her taraf)" : ""} · {rx.rir[0]}-{rx.rir[1]} tekrar yedek
              {ex.tempo ? ` · tempo ${ex.tempo}` : ""}
            </p>
            <p className="text-sm mt-1" style={{ color: "var(--ink-2)" }}>
              {rx.message}
            </p>
            <button className="label underline mt-2" onClick={() => setOpenHow(!openHow)}>
              {openHow ? "Gizle" : "Nasıl yapılır?"}
            </button>
            {openHow && (
              <div className="text-sm mt-2 rounded-2xl p-3" style={{ background: "var(--me-soft)" }}>
                <p>{ex.how}</p>
                <ul className="mt-1.5 space-y-0.5">
                  {ex.cues.map((c) => (
                    <li key={c}>✓ {c}</li>
                  ))}
                </ul>
              </div>
            )}
            {/* ladder */}
            <div className="flex items-center gap-2 mt-3">
              <button
                className="chip press !min-h-[40px]"
                disabled={row.step === 0}
                onClick={() => {
                  const ns = row.step - 1;
                  const nx = EXERCISES[LADDERS[row.ladder].steps[ns]];
                  if (row.done.some((x) => x !== null) && !confirm("Bu harekette işaretli setler sıfırlansın mı?")) return;
                  update({ step: ns, targets: row.targets.map(() => Math.round((nx.min + nx.max) / 2)), done: row.done.map(() => null) });
                }}
              >
                ‹ Daha kolay
              </button>
              <div className="flex-1 flex justify-center gap-1">
                {LADDERS[row.ladder].steps.map((_, k) => (
                  <span key={k} className="w-2 h-2 rounded-full" style={{ background: k === row.step ? "var(--me)" : k < row.step ? "var(--ink-3)" : "var(--line)" }} />
                ))}
              </div>
              <button
                className="chip press !min-h-[40px]"
                disabled={row.step >= LADDERS[row.ladder].steps.length - 1}
                onClick={() => {
                  const ns = row.step + 1;
                  const nx = EXERCISES[LADDERS[row.ladder].steps[ns]];
                  if (row.done.some((x) => x !== null) && !confirm("Bu harekette işaretli setler sıfırlansın mı?")) return;
                  update({ step: ns, targets: row.targets.map(() => nx.min), done: row.done.map(() => null) });
                }}
              >
                Daha zor ›
              </button>
            </div>
          </div>

          {/* sets */}
          <ul className="mt-3 space-y-2">
            {row.targets.slice(0, setsHere).map((t, k) => {
              const v = row.done[k];
              const ticked = v !== null;
              const lastV = rx.last && rx.last.step === row.step ? rx.last.sets[k] : undefined;
              return (
                <li key={k} className="panel !p-3 flex items-center gap-2" style={ticked ? { background: "var(--me-soft)" } : undefined}>
                  <span className="w-7 text-center font-bold">{k + 1}</span>
                  <span className="label w-14 leading-tight">{lastV !== undefined ? `geçen: ${lastV}` : "ilk"}</span>
                  <button className="btn btn-ghost !w-11 !h-11 !p-0 text-xl press" aria-label="Azalt" onClick={() => update({ targets: row.targets.map((x, j) => (j === k ? Math.max(0, x - (ex.unit === "seconds" ? 5 : 1)) : x)) })}>
                    −
                  </button>
                  <span className="flex-1 text-center display text-2xl font-bold num">
                    {ticked ? v : t}
                    <span className="text-sm font-normal"> {unit}</span>
                  </span>
                  <button className="btn btn-ghost !w-11 !h-11 !p-0 text-xl press" aria-label="Artır" onClick={() => update({ targets: row.targets.map((x, j) => (j === k ? x + (ex.unit === "seconds" ? 5 : 1) : x)) })}>
                    +
                  </button>
                  <button
                    className={`w-12 h-12 rounded-full grid place-items-center text-xl press ${ticked ? "text-white" : ""}`}
                    style={{ background: ticked ? "var(--me)" : "var(--line)" }}
                    aria-label={ticked ? "Seti geri al" : "Seti tamamla"}
                    aria-pressed={ticked}
                    onClick={() => {
                      const done = row.done.map((x, j) => (j === k ? (ticked ? null : t) : x));
                      update({ done });
                      if (!ticked) {
                        navigator.vibrate?.(15);
                        const lastSet = k === setsHere - 1;
                        setRest({ sec: rx.restSec, next: lastSet ? nextName : `${k + 2}. set`, id: Date.now() });
                      }
                    }}
                  >
                    ✓
                  </button>
                </li>
              );
            })}
          </ul>

          {row.done.slice(0, setsHere).every((x) => x !== null) && (
            <div className="panel mt-3">
              <p className="font-semibold">Nasıl geldi?</p>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {(
                  [
                    ["easy", "😌 Kolay"],
                    ["right", "💪 Tam kıvamında"],
                    ["hard", "🥵 Zor"],
                  ] as const
                ).map(([e, l]) => (
                  <button key={e} className="chip justify-center press !text-[13px] !px-1" aria-pressed={row.effort === e} onClick={() => update({ effort: e })}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="fixed inset-x-0 bottom-0 p-4 pb-[max(16px,env(safe-area-inset-bottom))] grid grid-cols-[auto_1fr] gap-2 z-10" style={{ background: "linear-gradient(transparent, var(--paper, #fff) 30%)" }}>
            <button className="btn btn-ghost press" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>
              ‹ Geri
            </button>
            <button
              className="btn btn-me press !py-4"
              onClick={() => {
                setRest(null);
                if (idx < rows.length - 1) {
                  setIdx(idx + 1);
                  setOpenHow(false);
                } else setPhase("cooldown");
              }}
            >
              {idx < rows.length - 1 ? `Sonraki: ${nextName} ›` : "Soğumaya geç ›"}
            </button>
          </div>
        </div>
      )}

      {rest && phase === "work" && <RestTimer key={rest.id} seconds={rest.sec} next={rest.next} onDone={() => setRest(null)} />}

      {phase === "done" && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="text-center mt-2">
            <p className="text-5xl" aria-hidden>
              {prs.length ? "🏆" : "💪"}
            </p>
            <h3 className="display text-3xl font-bold mt-2 text-grad">Antrenman tamam!</h3>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4">
            {[
              [`${minutes}`, "dakika"],
              [`${totalSets}`, "set"],
              [`~${netKcal(session.met, kg, minutes)}`, "kcal"],
            ].map(([v, l]) => (
              <div key={l} className="panel !p-3 text-center">
                <p className="display text-2xl font-bold num">{v}</p>
                <p className="label">{l}</p>
              </div>
            ))}
          </div>
          <p className="text-center label mt-2">{totalReps} toplam tekrar/saniye</p>
          {prs.length > 0 && (
            <div className="panel mt-3">
              <p className="font-bold">Yeni rekorlar</p>
              <ul className="mt-2 space-y-1.5">
                {prs.map((p) => (
                  <li key={p.ladder} className="flex items-center gap-2">
                    <span aria-hidden>{p.kind === "new_level" ? "⬆️" : "🏅"}</span>
                    <span className="flex-1">{EXERCISES[p.exerciseId].name}</span>
                    <span className="font-bold num">
                      {p.kind === "new_level" ? "yeni seviye" : `${p.previous} → ${p.value}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-sm mt-3" style={{ color: "var(--ink-2)" }}>
            Bu hafta {Math.min(s.program.sessionsPlanned, s.program.sessionsDone + (saved ? 0 : 1))}/{s.program.sessionsPlanned} antrenman. Bir sonraki seansta hedeflerin otomatik ayarlanacak.
          </p>
          {!saved ? (
            <button className="btn btn-me w-full mt-4 press !py-4 text-lg" disabled={saving} onClick={save}>
              {saving ? "Kaydediliyor…" : "Kaydet ve bitir"}
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button className="btn btn-ghost press" onClick={() => act({ action: "react", type: "proud" }, { toast: `${s.scores.partner.name}'e haber verdin 💛` })}>
                💛 Haber ver
              </button>
              <button className="btn btn-me press" onClick={onClose}>
                Kapat
              </button>
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}

function Readiness({ female, sleep, onStart, onSwap, session }: { female: boolean; sleep?: number; onStart: (m: "normal" | "light") => void; onSwap: () => void; session: Session }) {
  const [energy, setEnergy] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [sore, setSore] = useState<0 | 1 | 2>(0);
  const [period, setPeriod] = useState(false);
  const [pain, setPain] = useState(false);
  const r = readiness({ energy, soreness: sore, sleepHours: sleep, periodSymptoms: period, pain });
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="panel">
        <p className="label">{session.subtitle}</p>
        <h3 className="display text-2xl font-bold">Bugün nasılsın?</h3>
        <p className="text-sm" style={{ color: "var(--ink-2)" }}>
          ~{session.estMinutes} dk · {session.exercises.length} hareket. Cevabına göre seansı ayarlarım.
        </p>
        <p className="font-semibold mt-4">Enerji</p>
        <div className="flex justify-between mt-1">
          {(["😩", "😕", "🙂", "😊", "🤩"] as const).map((e, i) => (
            <button key={e} className={`w-12 h-12 rounded-full grid place-items-center text-2xl press ${energy === i + 1 ? "scale-125" : "opacity-60"}`} style={energy === i + 1 ? { background: "var(--me-soft)" } : undefined} aria-pressed={energy === i + 1} onClick={() => setEnergy((i + 1) as 1 | 2 | 3 | 4 | 5)} aria-label={`Enerji ${i + 1}`}>
              {e}
            </button>
          ))}
        </div>
        <p className="font-semibold mt-4">Kas ağrısı</p>
        <div className="grid grid-cols-3 gap-2 mt-1">
          {(["Yok", "Hafif", "Belirgin"] as const).map((l, i) => (
            <button key={l} className="chip justify-center press" aria-pressed={sore === i} onClick={() => setSore(i as 0 | 1 | 2)}>
              {l}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {female && (
            <button className="chip press" aria-pressed={period} onClick={() => setPeriod(!period)}>
              🌸 Adet ağrım var
            </button>
          )}
          <button className="chip press" aria-pressed={pain} onClick={() => setPain(!pain)}>
            ⚠️ Eklem / keskin ağrı
          </button>
        </div>
        <p className="text-sm mt-4 rounded-2xl p-3" style={{ background: r.mode === "normal" ? "var(--me-soft)" : "var(--warn-soft)" }}>
          {r.message}
        </p>
      </div>
      {r.mode === "rest" ? (
        <button className="btn btn-me w-full mt-4 press !py-4" onClick={onSwap}>
          Tamam, bugün dinleneceğim
        </button>
      ) : r.mode === "swap_walk" ? (
        <div className="grid grid-cols-2 gap-2 mt-4">
          <button className="btn btn-ghost press" onClick={() => onStart("light")}>
            Yine de hafif yap
          </button>
          <button className="btn btn-me press" onClick={onSwap}>
            Tamam, bugün değil
          </button>
        </div>
      ) : (
        <button className="btn btn-me w-full mt-4 press !py-4 text-lg" onClick={() => onStart(r.mode === "light" ? "light" : "normal")}>
          ▶ Isınmayla başla
        </button>
      )}
    </div>
  );
}

// ---------- interval player (walk/run, circuits) ----------
const SEG_LABEL: Record<string, string> = { walk: "Yürü", brisk: "Tempolu yürü", jog: "Hafif koş", easy_run: "Kolay koş", stride: "Hızlan", rest: "Dinlen", work: "Çalış" };

export function IntervalPlayer({ cardio, circuit, onClose }: { cardio?: CardioSession | null; circuit?: CircuitSession | null; onClose: () => void }) {
  const { s, act } = useApp();
  const segs: (Segment | { kind: "work" | "rest"; sec: number; cue?: string })[] = useMemo(() => {
    if (cardio) return cardio.segments;
    if (!circuit) return [];
    const out: { kind: "work" | "rest"; sec: number; cue?: string }[] = [];
    for (let r = 0; r < circuit.rounds; r++) {
      circuit.moves.forEach((m, i) => {
        out.push({ kind: "work", sec: circuit.workSec, cue: EXERCISES[m]?.name ?? m });
        if (i < circuit.moves.length - 1) out.push({ kind: "rest", sec: circuit.restSec });
      });
      if (r < circuit.rounds - 1) out.push({ kind: "rest", sec: circuit.restBetweenRoundsSec, cue: "Tur arası" });
    }
    return out;
  }, [cardio, circuit]);
  const total = segs.reduce((a, x) => a + x.sec, 0);
  const [i, setI] = useState(0);
  const [segEnd, setSegEnd] = useState<number | null>(null);
  const [paused, setPaused] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [together, setTogether] = useState(false);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  useWakeLock(segEnd !== null && !done);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  const running = segEnd !== null && paused === null && !done;
  const left = segEnd === null ? segs[i]?.sec ?? 0 : paused !== null ? (segEnd - paused) / 1000 : (segEnd - now) / 1000;
  const announce = useCallback((k: number) => {
    const sg = segs[k];
    if (!sg) return;
    say(`${SEG_LABEL[sg.kind] ?? ""}. ${Math.round(sg.sec / 60) >= 1 ? `${Math.round(sg.sec / 60)} dakika` : `${sg.sec} saniye`}. ${sg.cue ?? ""}`);
  }, [segs]);
  useEffect(() => {
    if (!running || left > 0) return;
    beep(990, 250);
    navigator.vibrate?.([150, 80, 150]);
    if (i >= segs.length - 1) {
      setDone(true);
      say("Tebrikler, bitti!");
      return;
    }
    setI(i + 1);
    setSegEnd(Date.now() + segs[i + 1].sec * 1000);
    announce(i + 1);
  }, [running, left, i, segs, announce]);
  const elapsed = segs.slice(0, i).reduce((a, x) => a + x.sec, 0) + ((segs[i]?.sec ?? 0) - Math.max(0, left));
  const seg = segs[i];
  const title = cardio?.title ?? circuit?.title ?? "";
  const minutes = Math.max(1, Math.round(elapsed / 60));
  const isRun = segs.some((x) => x.kind === "jog" || x.kind === "easy_run");
  const hot = seg && (seg.kind === "jog" || seg.kind === "easy_run" || seg.kind === "work" || seg.kind === "stride");

  return (
    <Sheet label={title}>
      <div className="px-4 pt-[max(12px,env(safe-area-inset-top))] pb-2 flex items-center gap-3">
        <button className="w-11 h-11 rounded-full grid place-items-center press" style={{ background: "var(--line)" }} onClick={onClose} aria-label="Kapat">
          ✕
        </button>
        <p className="font-bold flex-1 truncate">{title}</p>
      </div>
      <div className="px-4">
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--line)" }}>
          <div className="h-full" style={{ width: `${Math.min(100, (elapsed / total) * 100)}%`, background: "var(--me)" }} />
        </div>
        <p className="label mt-1 text-right num">
          {mmss(elapsed)} / {mmss(total)}
        </p>
      </div>
      {!done ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center" style={{ background: hot ? "var(--me-soft)" : undefined }}>
          <p className="label">
            {i + 1}/{segs.length}
          </p>
          <p className="display text-4xl font-bold mt-1">{seg ? SEG_LABEL[seg.kind] ?? seg.kind : ""}</p>
          {seg?.cue && <p className="mt-1 text-lg">{seg.cue}</p>}
          <p className="display font-bold num mt-4" style={{ fontSize: 88, lineHeight: 1 }}>
            {mmss(left)}
          </p>
          {segs[i + 1] && (
            <p className="text-sm mt-4" style={{ color: "var(--ink-2)" }}>
              Sonra: {SEG_LABEL[segs[i + 1].kind]} {mmss(segs[i + 1].sec)}
            </p>
          )}
          {cardio?.feel && i === 0 && segEnd === null && (
            <p className="text-sm mt-4 max-w-xs" style={{ color: "var(--ink-2)" }}>
              {cardio.feel}
            </p>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <p className="text-6xl" aria-hidden>
            🌊
          </p>
          <p className="display text-3xl font-bold mt-2 text-grad">Harika, bitti!</p>
          <p className="mt-1">{minutes} dakika</p>
          <label className="flex items-center gap-2 mt-4">
            <input type="checkbox" checked={together} onChange={(e) => setTogether(e.target.checked)} className="w-5 h-5 accent-[var(--me)]" />
            <span>{s.scores.partner.name} ile birlikteydik</span>
          </label>
        </div>
      )}
      <div className="p-4 pb-[max(16px,env(safe-area-inset-bottom))] grid grid-cols-2 gap-2">
        {done ? (
          <>
            <button className="btn btn-ghost press" onClick={onClose}>
              Kaydetme
            </button>
            <button
              className="btn btn-me press"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                const ok = circuit
                  ? await act({ action: "customWorkout", activities: [{ name: circuit.title, category: "cardio", kind: "hiit", minutes, intensity: "moderate" }], desc: circuit.title, withPartner: together }, { toast: "Kaydedildi 🔥", points: 20, celebrate: true })
                  : await act({ action: "workout", log: { type: isRun ? "run" : "walk", minutes, withPartner: together } }, { toast: "Kaydedildi 🌊", points: 20, celebrate: true });
                setSaving(false);
                if (ok) onClose();
              }}
            >
              Kaydet
            </button>
          </>
        ) : segEnd === null ? (
          <button
            className="btn btn-me press col-span-2 !py-4 text-lg"
            onClick={() => {
              beep(880, 120);
              setSegEnd(Date.now() + segs[0].sec * 1000);
              announce(0);
            }}
          >
            ▶ Başla
          </button>
        ) : (
          <>
            <button
              className="btn btn-ghost press"
              onClick={() => {
                if (paused === null) setPaused(Date.now());
                else {
                  setSegEnd((e) => (e ?? 0) + (Date.now() - paused));
                  setPaused(null);
                }
              }}
            >
              {paused === null ? "⏸ Duraklat" : "▶ Devam"}
            </button>
            <button className="btn btn-me press" onClick={() => setDone(true)}>
              Bitir
            </button>
          </>
        )}
      </div>
    </Sheet>
  );
}
