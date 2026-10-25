"use client";
// Saved one-tap meals: see exactly what's inside and how many kcal each part is.
import { useState } from "react";
import { useApp, fmt } from "./ui";

export default function Presets() {
  const { s, act } = useApp();
  const presets = s.profile.presets ?? [];
  const [open, setOpen] = useState<string | null>(null);
  if (!presets.length) return null;
  return (
    <section className="panel">
      <h2 className="display text-xl font-bold">⭐ Tek dokunuşluk menülerim</h2>
      <p className="text-sm" style={{ color: "var(--ink-2)" }}>
        &quot;Ne yedin?&quot; kartında en üstte. İçinde ne var, kaç kalori:
      </p>
      <ul className="mt-2 space-y-2">
        {presets.map((p) => {
          const k = p.items.reduce((a, i) => a + i.kcal, 0);
          return (
            <li key={p.id} className="rounded-2xl p-3" style={{ background: "var(--me-soft)" }}>
              <button className="w-full flex items-center justify-between gap-2 text-left" onClick={() => setOpen(open === p.id ? null : p.id)} aria-expanded={open === p.id}>
                <span className="font-bold">
                  {p.emoji} {p.name}
                </span>
                <span className="num font-semibold">
                  {fmt(k)} kcal {open === p.id ? "▲" : "▼"}
                </span>
              </button>
              {open === p.id && (
                <>
                  <ul className="mt-2 text-sm divide-y" style={{ borderColor: "var(--line)" }}>
                    {p.items.map((i) => (
                      <li key={i.name} className="flex justify-between gap-2 py-1.5">
                        <span className="min-w-0">
                          {i.name}
                          <span className="label"> · {i.amount}</span>
                        </span>
                        <span className="num shrink-0">{i.kcal}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="label mt-1">
                    Protein {Math.round(p.items.reduce((a, i) => a + i.protein, 0))} g · Karbonhidrat {Math.round(p.items.reduce((a, i) => a + i.carbs, 0))} g · Yağ {Math.round(p.items.reduce((a, i) => a + i.fat, 0))} g
                  </p>
                  <button className="label underline mt-2" onClick={() => confirm(`${p.name} silinsin mi?`) && act({ action: "deletePreset", id: p.id }, { toast: "Silindi" })}>
                    Menüyü sil
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
