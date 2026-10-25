"use client";
// Small visual effects: confetti burst and animated progress ring.
import { useEffect, useState } from "react";

const COLORS = ["#ff8a00", "#ff4d6d", "#10b5a3", "#3a86ff", "#ffd166", "#8b5cf6"];

export function Confetti({ fire }: { fire: number }) {
  const [bits, setBits] = useState<{ k: number; dx: number; dy: number; r: number; c: string }[]>([]);
  useEffect(() => {
    if (!fire) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      navigator.vibrate?.(15);
      return;
    }
    navigator.vibrate?.(12);
    const b = Array.from({ length: 28 }, (_, i) => ({
      k: fire * 100 + i,
      dx: (Math.random() - 0.5) * 520,
      dy: -Math.random() * 360 + 120,
      r: Math.random() * 720 - 360,
      c: COLORS[i % COLORS.length],
    }));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBits(b);
    const t = setTimeout(() => setBits([]), 1300);
    return () => clearTimeout(t);
  }, [fire]);
  if (!bits.length) return null;
  return (
    <div className="confetti" aria-hidden>
      {bits.map((b) => (
        <i key={b.k} style={{ background: b.c, ["--dx" as string]: `${b.dx}px`, ["--dy" as string]: `${b.dy}px`, ["--r" as string]: `${b.r}deg` }} />
      ))}
    </div>
  );
}

export function Ring({
  value,
  max,
  size = 96,
  stroke = 11,
  colors,
  children,
  label,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  colors: [string, string];
  children?: React.ReactNode;
  label: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 60); // draw in on mount
    return () => clearTimeout(t);
  }, []);
  const pct = shown ? Math.max(0, Math.min(1, max ? value / max : 0)) : 0;
  const id = label.replace(/\W/g, "");
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${Math.round(pct * 100)}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={`rg${id}`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={colors[0]} />
            <stop offset="100%" stopColor={colors[1]} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#rg${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(.16,1,.3,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
