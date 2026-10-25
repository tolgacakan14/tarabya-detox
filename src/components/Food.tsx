"use client";
import QuickLog from "./QuickLog";
import { useMemo, useState } from "react";
import { useApp, Bar, Section, fmt } from "./ui";
import { FOODS, QUICK_SIZES, searchFoods } from "@/lib/foods";
import { useMenu } from "./useMenu";
import { nextQuestions } from "@/lib/menu";

type Item = { name: string; amount: string; kcal: number; protein: number; carbs: number; fat: number };
type Mode = "list" | "quick" | "manual";

const SLOT_ICON: Record<string, string> = { kahvaltı: "🍳", öğle: "🍲", akşam: "🍽️", "ara öğün": "🍌" };

export default function Food() {
  const { s, act } = useApp();
  const t = s.engine.targets;
  const gain = s.profile.goal === "gain";
  const { menu, prefs, reroll, eaten } = useMenu(s);
  const [more, setMore] = useState<Mode | null>(null);
  const asks = nextQuestions(prefs, 3);

  return (
    <div className="grid grid-cols-1 gap-4 items-start">
      <div className="space-y-4">
        <QuickLog />
        <section className="panel">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="display text-2xl font-bold">Senin menün</h2>
            <span className="label num">
              {fmt(menu.kcal)} kcal · {menu.protein} g protein
            </span>
          </div>
          {menu.note && (
            <p className="text-sm mt-1" style={{ color: "var(--ink-2)" }}>
              {menu.note}
            </p>
          )}
          <ul className="mt-3 space-y-2.5">
            {menu.meals.map((m, idx) => {
              const done = eaten(idx);
              return (
                <li key={idx} className="rounded-2xl p-3 border-2 transition-colors" style={{ borderColor: done ? "var(--me)" : "var(--line)", background: done ? "var(--me-soft)" : "transparent" }}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold capitalize">
                      <span aria-hidden>{SLOT_ICON[m.slot]}</span> {m.slot}
                    </p>
                    <span className="label num">{m.kcal} kcal</span>
                  </div>
                  <ul className="mt-1.5 space-y-1">
                    {m.items.map((it) => (
                      <li key={it.foodId} className="flex items-center gap-2">
                        <span className="flex-1">
                          {it.qty !== 1 && <b className="num">{it.qty}× </b>}
                          {it.name}
                          <span className="label"> ({it.portion})</span>
                        </span>
                        {it.isNew && !done && (
                          <span className="flex gap-1">
                            <button className="chip !px-2 !py-0.5 press" aria-label={`${it.name} yerim`} onClick={() => act({ action: "foodPref", foodId: it.foodId, value: 1 })}>
                              👍
                            </button>
                            <button className="chip !px-2 !py-0.5 press" aria-label={`${it.name} yemem`} onClick={() => act({ action: "foodPref", foodId: it.foodId, value: -1 })}>
                              👎
                            </button>
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-2 mt-2.5">
                    <button
                      className={`btn ${done ? "btn-ghost" : "btn-me"} flex-1 press !py-2`}
                      onClick={async () => {
                        for (let k = 0; k < m.items.length; k++) {
                          const it = m.items[k];
                          await act({ action: "addFood", foodId: it.foodId, qty: it.qty, meal: m.slot, planned: true }, k === m.items.length - 1 ? { toast: "Afiyet olsun 😋", celebrate: true } : undefined);
                        }
                      }}
                    >
                      {done ? "Yine yedim" : "Yedim ✓"}
                    </button>
                    {!done && (
                      <button className="btn btn-ghost press !py-2" onClick={() => reroll(idx)} aria-label={`${m.slot} için başka öneri`}>
                        🔄 Değiştir
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {asks.length > 0 && (
          <section className="panel">
            <h2 className="display text-xl font-bold">Bunları yer misin?</h2>
            <p className="text-sm" style={{ color: "var(--ink-2)" }}>Cevapladıkça menün sadece sevdiklerinden oluşur.</p>
            <ul className="mt-2 space-y-2">
              {asks.map((f) => (
                <li key={f.id} className="flex items-center gap-2">
                  <span className="flex-1 font-semibold">{f.name}</span>
                  <button className="chip press" onClick={() => act({ action: "foodPref", foodId: f.id, value: -1 })}>🙅</button>
                  <button className="chip press" onClick={() => act({ action: "foodPref", foodId: f.id, value: 1 })}>🙂</button>
                  <button className="chip press" onClick={() => act({ action: "foodPref", foodId: f.id, value: 2 })}>😍</button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <div className="space-y-4">

        {(s.favorites.length > 0 || s.yesterdayFoods.length > 0) && (
          <Section title="Tek dokunuşla">
            {s.yesterdayFoods.length > 0 && (
              <button
                className="btn btn-ghost w-full press mb-3"
                onClick={() => act({ action: "addFoods", entries: s.yesterdayFoods.slice(0, 12), planned: false }, { toast: "Dünkü gibi eklendi", celebrate: true })}
              >
                🔁 Dün ne yediysem bugün de onu ({s.yesterdayFoods.length} kalem)
              </button>
            )}
            <div className="flex flex-wrap gap-2">
              {s.favorites.map((f) => (
                <button key={f.name + f.amount} className="chip press" onClick={() => act({ action: "addFoods", entries: [f], planned: false }, { toast: `${f.name} eklendi` })}>
                  {f.name} <span className="label num">{f.kcal}</span>
                </button>
              ))}
            </div>
          </Section>
        )}

        <Section title="Bugün yediklerin" aside={<span className="label num">{fmt(s.totals.kcal)} / {fmt(t.kcal)} kcal</span>}>
          <Bar value={s.totals.kcal} max={t.kcal} height={10} label="Kalori" />
          {s.foods.length === 0 ? (
            <p className="mt-3" style={{ color: "var(--ink-2)" }}>{gain ? "Henüz bir şey yok. Kahvaltıyla başlayalım!" : "Henüz bir şey yok."}</p>
          ) : (
            <ul className="divide-y mt-2" style={{ borderColor: "var(--line)" }}>
              {s.foods.map((f) => (
                <li key={f.id} className="py-2 flex items-center gap-3">
                  <span className="flex-1 min-w-0">
                    <span className="font-semibold">{f.name}</span>
                    <span className="label block">{[f.time, f.amount].filter(Boolean).join(", ")}</span>
                  </span>
                  <span className="num text-sm">{f.kcal} kcal</span>
                  <button className="label underline" onClick={() => act({ action: "delete", id: f.id })} aria-label={`${f.name} sil`}>
                    Sil
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <section className="panel">
          <p className="font-semibold">Başka yolla ekle</p>
          <div className="flex gap-2 mt-2 flex-wrap">
            {(
              [
                ["list", "📋 Listeden"],
                ["quick", "⚡ Hızlı tahmin"],
                ["manual", "✍️ Elle"],
              ] as [Mode, string][]
            ).map(([m, l]) => (
              <button key={m} className="chip press" aria-pressed={more === m} onClick={() => setMore(more === m ? null : m)}>
                {l}
              </button>
            ))}
          </div>
        </section>
        {more === "list" && <FoodList gain={gain} />}
        {more === "quick" && (
          <Section title="Hızlı tahmin">
            <div className="grid gap-2">
              {QUICK_SIZES.map((q) => (
                <button
                  key={q.id}
                  className="chip justify-between !rounded-xl !py-3 press"
                  onClick={() => act({ action: "addFood", entry: { name: q.label + " (tahmini)", amount: q.hint, kcal: q.kcal, protein: q.protein, carbs: q.carbs, fat: q.fat, source: "quick" }, planned: false }, { toast: "Kaydedildi" })}
                >
                  <span className="text-left">
                    <span className="font-semibold">{q.label}</span>
                    <span className="label block">{q.hint}</span>
                  </span>
                  <span className="num">~{q.kcal} kcal</span>
                </button>
              ))}
            </div>
          </Section>
        )}
        {more === "manual" && <Manual />}
      </div>
    </div>
  );
}

function FoodList({ gain }: { gain: boolean }) {
  const { act } = useApp();
  const [q, setQ] = useState("");
  const [qty, setQty] = useState<Record<string, number>>({});
  const foods = useMemo(() => {
    const r = searchFoods(q);
    const pref = gain ? "dense" : "light";
    return [...r].sort((a, b) => Number(b.tags.includes(pref) || b.tags.includes("protein")) - Number(a.tags.includes(pref) || a.tags.includes("protein")));
  }, [q, gain]);

  return (
    <Section title="Listeden seç">
      <input className="field" placeholder="Ara: menemen, döner, ayran…" value={q} onChange={(e) => setQ(e.target.value)} />
      <ul className="mt-3 max-h-[60vh] overflow-y-auto divide-y" style={{ borderColor: "var(--line)" }}>
        {foods.map((f) => {
          const n = qty[f.id] ?? 1;
          return (
            <li key={f.id} className="py-2.5 flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold">
                  {f.name}
                  {(gain ? f.tags.includes("dense") : f.tags.includes("light")) && (
                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full align-middle" style={{ background: "var(--me-soft)", color: "var(--me-ink)" }}>
                      {gain ? "enerji yoğun" : "hafif"}
                    </span>
                  )}
                </p>
                <p className="label">
                  {f.portion}, {f.kcal} kcal, {f.protein} g protein
                </p>
              </div>
              <select className="field !w-20 !py-2" value={n} aria-label="Porsiyon" onChange={(e) => setQty({ ...qty, [f.id]: Number(e.target.value) })}>
                {[0.5, 1, 1.5, 2, 3].map((v) => (
                  <option key={v} value={v}>
                    {v}×
                  </option>
                ))}
              </select>
              <button className="btn btn-me !px-3.5 !py-2" onClick={() => act({ action: "addFood", foodId: f.id, qty: n, planned: false }, { toast: `${f.name} eklendi` })}>
                Ekle
              </button>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

function Manual() {
  const { act } = useApp();
  const [f, setF] = useState({ name: "", amount: "", kcal: "", protein: "", carbs: "", fat: "" });
  return (
    <Section title="Elle gir">
      <form
        className="grid grid-cols-2 gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const ok = await act(
            { action: "addFood", entry: { name: f.name, amount: f.amount, kcal: Number(f.kcal), protein: Number(f.protein || 0), carbs: Number(f.carbs || 0), fat: Number(f.fat || 0), source: "quick" }, planned: false },
            { toast: "Kaydedildi" }
          );
          if (ok) setF({ name: "", amount: "", kcal: "", protein: "", carbs: "", fat: "" });
        }}
      >
        <input className="field col-span-2" placeholder="Ne yedin?" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input className="field col-span-2" placeholder="Miktar (isteğe bağlı)" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
        {(["kcal", "protein", "carbs", "fat"] as const).map((k) => (
          <input
            key={k}
            className="field num"
            inputMode="decimal"
            required={k === "kcal"}
            placeholder={{ kcal: "Kalori", protein: "Protein (g)", carbs: "Karbonhidrat (g)", fat: "Yağ (g)" }[k]}
            value={f[k]}
            onChange={(e) => setF({ ...f, [k]: e.target.value })}
          />
        ))}
        <button className="btn btn-me col-span-2">Kaydet</button>
      </form>
    </Section>
  );
}
