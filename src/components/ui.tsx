"use client";
import { createContext, useContext } from "react";
import type { AppState } from "@/lib/state";

export interface Ctx {
  s: AppState;
  act: (body: Record<string, unknown>, opts?: { toast?: string; points?: number; celebrate?: boolean }) => Promise<boolean>;
  reload: () => Promise<void>;
  toast: (t: string) => void;
  celebrate: () => void;
  go: (tab: TabId) => void;
}
export type TabId = "bugun" | "yemek" | "antrenman" | "koc" | "yaris" | "ilerleme";

export const AppCtx = createContext<Ctx | null>(null);
export const useApp = () => {
  const c = useContext(AppCtx);
  if (!c) throw new Error("no ctx");
  return c;
};

export function Bar({ value, max, color = "linear-gradient(90deg, var(--me), var(--me-2))", height = 10, label }: { value: number; max: number; color?: string; height?: number; label?: string }) {
  const pct = Math.max(0, Math.min(1, max ? value / max : 0));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      aria-label={label}
      className="w-full rounded-full overflow-hidden"
      style={{ background: "var(--line)", height }}
    >
      <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${pct * 100}%`, background: color }} />
    </div>
  );
}

export function Section({ title, aside, children, className = "" }: { title?: string; aside?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`panel ${className}`}>
      {(title || aside) && (
        <div className="flex items-baseline justify-between gap-3 mb-3">
          {title && <h2 className="display text-xl font-semibold">{title}</h2>}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ value, unit, label }: { value: React.ReactNode; unit?: string; label: string }) {
  return (
    <div>
      <div className="display text-3xl font-bold num leading-none">
        {value}
        {unit && <span className="text-base font-medium ml-1" style={{ color: "var(--ink-2)" }}>{unit}</span>}
      </div>
      <div className="label mt-1">{label}</div>
    </div>
  );
}

export const fmt = (n: number) => Math.round(n).toLocaleString("tr-TR");
export const kg = (n: number) => (Math.round(n * 10) / 10).toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <path d="M2.5 7.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
