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
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState<Who | null>(null);

  async function login(id: Who) {
    setBusy(id);
    setErr("");
    const r = await fetch("/api/act", { method: "POST", body: JSON.stringify({ action: "login", user: id }) });
    if (r.ok) {
      router.push("/app");
      router.refresh();
    } else {
      setBusy(null);
      setErr("Giriş yapılamadı, tekrar dene.");
    }
  }

  return (
    <main className="min-h-dvh flex flex-col">
      <header className="px-5 pt-8 pb-4 max-w-md w-full mx-auto">
        <p className="display text-lg font-semibold">İkimiz</p>
        <h1 className="display text-4xl font-bold mt-6 leading-tight">Bugün kim giriyor?</h1>
      </header>

      <div className="flex-1 grid gap-3 px-4 pb-6 max-w-md w-full mx-auto">
        {PEOPLE.map((p) => (
          <button
            key={p.id}
            disabled={!!busy}
            onClick={() => login(p.id)}
            className="relative overflow-hidden text-left rounded-[28px] p-6 min-h-[38dvh] flex flex-col justify-end group"
            style={{ background: `var(--${p.id}-soft)`, color: `var(--${p.id}-ink)` }}
          >
            <Tide who={p.id} />
            <div className="relative flex-1 flex items-center justify-center pb-2">
              <Avatar who={p.id} mood={busy === p.id ? "party" : "happy"} size={160} />
            </div>
            <span className="relative display font-bold leading-[0.85] text-[clamp(3.5rem,18vw,5.5rem)] transition-transform group-hover:-translate-y-1">
              {p.name}
            </span>
            <span className="relative mt-7 text-lg">{busy === p.id ? "Plan açılıyor…" : p.line}</span>
          </button>
        ))}
      </div>
      {err && <p className="text-center pb-6" style={{ color: "var(--warn)" }}>{err}</p>}
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
