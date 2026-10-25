"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "./Avatar";

type Who = "tolga" | "eylul";

const PEOPLE: { id: Who; name: string; line: string }[] = [
  { id: "tolga", name: "Tolga", line: "Kilo alma ve kas planı" },
  { id: "eylul", name: "Eylül", line: "Yağ yakma ve güçlenme planı" },
];

export default function ProfilePicker() {
  const router = useRouter();
  const [who, setWho] = useState<Who | null>(null);
  const [pin, setPin] = useState("");
  const [needPin, setNeedPin] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function login(id: Who, p?: string) {
    setBusy(true);
    setErr("");
    const r = await fetch("/api/act", { method: "POST", body: JSON.stringify({ action: "login", user: id, pin: p }) });
    const j = await r.json();
    setBusy(false);
    if (r.ok) {
      router.push("/app");
      router.refresh();
    } else if (j.needPin) {
      setWho(id);
      setNeedPin(true);
      if (p) setErr("PIN yanlış, tekrar dene.");
    } else setErr(j.error ?? "Giriş yapılamadı");
  }

  return (
    <main className="min-h-dvh flex flex-col">
      <header className="px-5 pt-8 pb-4 max-w-5xl w-full mx-auto">
        <p className="display text-lg font-semibold">İkimiz</p>
        <h1 className="display text-4xl sm:text-5xl font-bold mt-6 leading-tight">Bugün kim giriyor?</h1>
      </header>

      <div className="flex-1 grid sm:grid-cols-2 gap-3 px-4 pb-6 max-w-5xl w-full mx-auto">
        {PEOPLE.map((p) => (
          <button
            key={p.id}
            disabled={busy}
            onClick={() => login(p.id)}
            className="relative overflow-hidden text-left rounded-[28px] p-6 sm:p-8 min-h-[38dvh] sm:min-h-[60dvh] flex flex-col justify-end group"
            style={{ background: `var(--${p.id}-soft)`, color: `var(--${p.id}-ink)` }}
          >
            <Tide who={p.id} />
            <div className="absolute inset-x-0 top-4 sm:top-10 flex justify-center">
              <Avatar who={p.id} mood="happy" size={170} className="sm:w-[260px] sm:h-[312px]" />
            </div>
            <span className="relative display font-bold leading-[0.85] text-[22vw] sm:text-[9rem] transition-transform group-hover:-translate-y-1">
              {p.name}
            </span>
            <span className="relative mt-7 text-lg">{p.line}</span>
          </button>
        ))}
      </div>

      {needPin && who && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="PIN gir">
          <form
            className="panel w-full max-w-sm"
            data-user={who}
            onSubmit={(e) => {
              e.preventDefault();
              login(who, pin);
            }}
          >
            <p className="display text-2xl font-bold">{who === "tolga" ? "Tolga" : "Eylül"}, PIN'in?</p>
            <input
              autoFocus
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              className="field mt-4 text-center text-3xl tracking-[0.5em] num"
              aria-label="4 haneli PIN"
            />
            {err && <p className="mt-2 text-sm" style={{ color: "var(--warn)" }}>{err}</p>}
            <div className="flex gap-2 mt-4">
              <button type="button" className="btn btn-ghost flex-1" onClick={() => { setNeedPin(false); setPin(""); setErr(""); }}>
                Vazgeç
              </button>
              <button className="btn btn-me flex-1" disabled={pin.length !== 4 || busy}>
                Gir
              </button>
            </div>
          </form>
        </div>
      )}
      {err && !needPin && <p className="text-center pb-6" style={{ color: "var(--warn)" }}>{err}</p>}
    </main>
  );
}

/** Two tides: Tolga's water rises, Eylül's settles. Purely decorative. */
function Tide({ who }: { who: Who }) {
  const up = who === "tolga";
  return (
    <svg aria-hidden className="absolute inset-x-0 top-0 h-2/3 w-full opacity-60" viewBox="0 0 400 200" preserveAspectRatio="none">
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          d={`M0 ${up ? 160 - i * 40 : 40 + i * 40} C 100 ${up ? 130 - i * 40 : 70 + i * 40}, 200 ${up ? 190 - i * 40 : 10 + i * 40}, 400 ${up ? 140 - i * 40 : 60 + i * 40}`}
          fill="none"
          stroke={`var(--${who})`}
          strokeWidth={3 - i * 0.6}
          opacity={1 - i * 0.25}
        />
      ))}
    </svg>
  );
}
