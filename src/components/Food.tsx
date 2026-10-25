"use client";
import { useMemo, useState } from "react";
import { useApp, Bar, Section, fmt } from "./ui";
import { FOODS, QUICK_SIZES, searchFoods } from "@/lib/foods";
import { MEAL_PLANS, mealTotals } from "@/lib/meals";

type Item = { name: string; amount: string; kcal: number; protein: number; carbs: number; fat: number };
type Mode = "plan" | "list" | "ai" | "quick" | "manual";

export default function Food() {
  const { s, act } = useApp();
  const t = s.engine.targets;
  const gain = s.profile.goal === "gain";
  const [mode, setMode] = useState<Mode>("plan");
  const dayIdx = s.habitDay % MEAL_PLANS[s.user].length;
  const plan = MEAL_PLANS[s.user][dayIdx];

  const weekAvg = s.engine.weekBudget.days ? s.engine.weekBudget.used / s.engine.weekBudget.days : 0;

  return (
    <div className="grid lg:grid-cols-[1fr_1.2fr] gap-4">
      <div className="space-y-4">
        <Section title="Bugün">
          <div className="space-y-3">
            {[
              { k: "Kalori", v: s.totals.kcal, m: t.kcal, u: "kcal" },
              { k: "Protein", v: s.totals.protein, m: t.protein, u: "g" },
              { k: "Karbonhidrat", v: s.totals.carbs, m: t.carbs, u: "g" },
              { k: "Yağ", v: s.totals.fat, m: t.fat, u: "g" },
            ].map((r) => (
              <div key={r.k}>
                <div className="flex justify-between text-sm">
                  <span>{r.k}</span>
                  <span className="num" style={{ color: "var(--ink-2)" }}>
                    {fmt(r.v)} / {fmt(r.m)} {r.u}
                  </span>
                </div>
                <Bar value={r.v} max={r.m} height={8} label={r.k} />
              </div>
            ))}
          </div>
          <p className="text-sm mt-4" style={{ color: "var(--ink-2)" }}>
            Bu hafta günlük ortalaman {fmt(weekAvg)} kcal (hedef {fmt(t.kcal)}). Tek bir gün değil, haftanın ortalaması önemli.
          </p>
        </Section>

        <Section title="Yediklerim">
          {s.foods.length === 0 ? (
            <p style={{ color: "var(--ink-2)" }}>Henüz kayıt yok. Plandan bir öğün seç ya da plansız yediğini yaz.</p>
          ) : (
            <ul className="divide-y" style={{ borderColor: "var(--line)" }}>
              {s.foods.map((f) => (
                <li key={f.id} className="py-2.5 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{f.name}</p>
                    <p className="label">
                      {[f.time, f.amount, f.meal, f.planned ? "planlı" : "plansız"].filter(Boolean).join(", ")}
                    </p>
                  </div>
                  <div className="text-right num text-sm">
                    <p>{f.kcal} kcal</p>
                    <p className="label">{f.protein} g protein</p>
                  </div>
                  <button className="label underline" onClick={() => act({ action: "delete", id: f.id })} aria-label={`${f.name} sil`}>
                    Sil
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2 scroll-x" role="tablist">
          {(
            [
              ["plan", "Günün planı"],
              ["ai", "Plansız yedim"],
              ["list", "Listeden seç"],
              ["quick", "Hızlı tahmin"],
              ["manual", "Elle gir"],
            ] as [Mode, string][]
          ).map(([m, l]) => (
            <button key={m} className="chip whitespace-nowrap" aria-pressed={mode === m} onClick={() => setMode(m)}>
              {l}
            </button>
          ))}
        </div>

        {mode === "plan" && (
          <Section title="Günün planı" aside={<span className="label">{gain ? "Kilo alma menüsü" : "Hafif ve doyurucu menü"}</span>}>
            <p className="text-sm mb-3" style={{ color: "var(--ink-2)" }}>
              {gain
                ? "Saat tutmak zorunda değilsin. En az 3 ana öğün ve 1 shake, düzensiz bir günde bile seni hedefe yaklaştırır."
                : "Her öğünde önce proteini ye. Saatler esnek, sadece kahvaltı ve akşam yemeği sabit çapan olsun."}
            </p>
            <ul className="space-y-2">
              {plan.map((m, i) => {
                const tot = mealTotals(m);
                const logged = s.foods.some((f) => f.planned && f.meal === m.meal && m.items.some((it) => FOODS.find((x) => x.id === it.id)?.name === f.name));
                return (
                  <li key={i} className="rounded-xl border-[1.5px] p-3 flex items-center gap-3" style={{ borderColor: logged ? "var(--me)" : "var(--line)" }}>
                    <div className="flex-1 min-w-0">
                      <p className="label capitalize">{m.meal}</p>
                      <p className="font-semibold">{m.title}</p>
                      <p className="label">
                        {m.items.map((it) => `${it.qty !== 1 ? it.qty + " × " : ""}${FOODS.find((f) => f.id === it.id)?.name}`).join(", ")}
                      </p>
                      <p className="num text-sm mt-1">{tot.kcal} kcal, {tot.protein} g protein</p>
                    </div>
                    <button
                      className={`btn ${logged ? "btn-ghost" : "btn-me"} !px-4`}
                      onClick={async () => {
                        for (const it of m.items) await act({ action: "addFood", foodId: it.id, qty: it.qty, meal: m.meal, planned: true });
                      }}
                    >
                      {logged ? "Tekrar ekle" : "Yedim"}
                    </button>
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

        {mode === "ai" && <AiEstimate />}
        {mode === "list" && <FoodList gain={gain} />}
        {mode === "quick" && (
          <Section title="Hızlı tahmin">
            <p className="text-sm mb-3" style={{ color: "var(--ink-2)" }}>
              Ne yediğini tam bilmiyorsan büyüklüğünü seç. Kesin olmasa da kaydetmek, hiç kaydetmemekten çok daha iyi; sistem zamanla bu hatayı dengeliyor.
            </p>
            <div className="grid gap-2">
              {QUICK_SIZES.map((q) => (
                <button
                  key={q.id}
                  className="chip justify-between !rounded-xl !py-3"
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
        {mode === "manual" && <Manual />}
      </div>
    </div>
  );
}

function AiEstimate() {
  const { act } = useApp();
  const [text, setText] = useState("");
  const [items, setItems] = useState<Item[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  return (
    <Section title="Plansız ne yedin?">
      <p className="text-sm mb-3" style={{ color: "var(--ink-2)" }}>
        Normal konuşur gibi yaz, kalorisini ve proteinini ben hesaplayayım. Örnek: “öğlen dışarıda tavuk dürüm ve ayran içtim, akşama doğru 2 dilim baklava”.
      </p>
      <textarea className="field min-h-24" value={text} onChange={(e) => setText(e.target.value)} placeholder="Ne yedin, ne kadar?" />
      <button
        className="btn btn-me mt-2"
        disabled={!text.trim() || busy}
        onClick={async () => {
          setBusy(true);
          setErr("");
          const r = await fetch("/api/estimate", { method: "POST", body: JSON.stringify({ text }) });
          const j = await r.json();
          setBusy(false);
          if (!r.ok) setErr(j.error === "AI anahtarı tanımlı değil" ? "Koç henüz bağlı değil. O zamana kadar Hızlı tahmin ya da Listeden seç kullan." : j.error);
          else setItems(j.items);
        }}
      >
        {busy ? "Hesaplanıyor…" : "Hesapla"}
      </button>
      {err && <p className="mt-2 text-sm" style={{ color: "var(--warn)" }}>{err}</p>}
      {items && (
        <div className="mt-4">
          <ul className="space-y-2">
            {items.map((it, i) => (
              <li key={i} className="flex items-center gap-2">
                <div className="flex-1">
                  <p className="font-semibold">{it.name}</p>
                  <p className="label">{it.amount}</p>
                </div>
                <input
                  className="field num !w-24 text-right"
                  inputMode="numeric"
                  value={it.kcal}
                  aria-label={`${it.name} kalori`}
                  onChange={(e) => setItems(items.map((x, k) => (k === i ? { ...x, kcal: Number(e.target.value) || 0 } : x)))}
                />
                <span className="label">kcal</span>
              </li>
            ))}
          </ul>
          <p className="num text-sm mt-2">
            Toplam {items.reduce((a, x) => a + x.kcal, 0)} kcal, {Math.round(items.reduce((a, x) => a + x.protein, 0))} g protein
          </p>
          <div className="flex gap-2 mt-3">
            <button
              className="btn btn-me"
              onClick={async () => {
                for (const it of items) await act({ action: "addFood", entry: { ...it, source: "ai" }, planned: false });
                setItems(null);
                setText("");
              }}
            >
              Hepsini kaydet
            </button>
            <button className="btn btn-ghost" onClick={() => setItems(null)}>
              Vazgeç
            </button>
          </div>
        </div>
      )}
    </Section>
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
