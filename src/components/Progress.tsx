"use client";
import { MEASURE_FIELDS } from "@/lib/body";
import { useState } from "react";
import { useApp, Section, Stat, fmt } from "./ui";

export default function Progress() {
  const { s, act } = useApp();
  const e = s.engine;
  const gain = s.profile.goal === "gain";
  const [p, setP] = useState({
    targetWeight: String(s.profile.targetWeight),
    likes: s.profile.likes,
    dislikes: s.profile.dislikes,
    why: s.profile.why,
    ifThen: s.profile.ifThen.join("\n"),
  });

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="space-y-4">
        <Section title="Kilo trendi">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Stat value={e.currentWeight.toLocaleString("tr-TR")} unit="kg" label="Trend kilo" />
            <Stat value={e.weeklyRate === null ? "—" : `${e.weeklyRate > 0 ? "+" : ""}${e.weeklyRate.toLocaleString("tr-TR")}`} unit="kg/hf" label="Haftalık hız" />
            <Stat value={s.profile.targetWeight.toLocaleString("tr-TR")} unit="kg" label="Hedef" />
          </div>
          <TrendChart />
          <ul className="mt-4 flex flex-wrap gap-2">
            {e.milestones.map((ms) => (
              <li key={ms.label} className="chip" style={ms.reached ? { background: "var(--me)", color: "#fff", borderColor: "var(--me)" } : undefined}>
                {ms.label}: {ms.weight.toLocaleString("tr-TR")} kg {ms.reached ? "✓" : ""}
              </li>
            ))}
          </ul>
        </Section>

        <BodyCard />
      </div>

      <div className="space-y-4">
        <Section title="Enerji hesabın">
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt style={{ color: "var(--ink-2)" }}>Bazal metabolizma</dt>
            <dd className="num text-right">{fmt(e.bmr)} kcal</dd>
            <dt style={{ color: "var(--ink-2)" }}>Formül tahmini harcama</dt>
            <dd className="num text-right">{fmt(e.priorTdee)} kcal</dd>
            <dt style={{ color: "var(--ink-2)" }}>Senin verinle harcama</dt>
            <dd className="num text-right">{fmt(e.tdee)} kcal</dd>
            <dt style={{ color: "var(--ink-2)" }}>Veriden öğrenme</dt>
            <dd className="num text-right">%{Math.round(e.adaptiveWeight * 100)}</dd>
            <dt style={{ color: "var(--ink-2)" }}>Günlük hedef</dt>
            <dd className="num text-right font-semibold">{fmt(e.targets.kcal)} kcal</dd>
            {!gain && (
              <>
                <dt style={{ color: "var(--ink-2)" }}>Güvenlik tabanı</dt>
                <dd className="num text-right">{fmt(e.floor)} kcal</dd>
              </>
            )}
          </dl>
          <p className="text-sm mt-3" style={{ color: "var(--ink-2)" }}>
            İlk haftalarda formülle başlıyoruz. Tartı ve yemek kayıtların biriktikçe sistem senin gerçek harcamanı öğreniyor ve hedefi kendisi düzeltiyor.
          </p>
        </Section>

        <details className="panel"><summary className="display text-xl font-semibold cursor-pointer">⚙️ Bilgilerimi düzenle</summary><div className="mt-3">
          <form
            className="space-y-2"
            onSubmit={async (ev) => {
              ev.preventDefault();
              const patch: Record<string, unknown> = {
                targetWeight: Number(p.targetWeight.replace(",", ".")),
                likes: p.likes,
                dislikes: p.dislikes,
                why: p.why,
                ifThen: p.ifThen.split("\n").map((x) => x.trim()).filter(Boolean),
              };
              await act({ action: "profile", patch }, { toast: "Kaydedildi" });
            }}
          >
            <label className="block">
              <span className="label">Hedef kilo (kg)</span>
              <input className="field num" inputMode="decimal" value={p.targetWeight} onChange={(ev) => setP({ ...p, targetWeight: ev.target.value })} />
            </label>
            <label className="block">
              <span className="label">Neden istiyorsun?</span>
              <input className="field" value={p.why} onChange={(ev) => setP({ ...p, why: ev.target.value })} />
            </label>
            <label className="block">
              <span className="label">Sevdiğin yemekler</span>
              <input className="field" value={p.likes} onChange={(ev) => setP({ ...p, likes: ev.target.value })} />
            </label>
            <label className="block">
              <span className="label">Sevmediklerin</span>
              <input className="field" value={p.dislikes} onChange={(ev) => setP({ ...p, dislikes: ev.target.value })} />
            </label>
            <label className="block">
              <span className="label">Eğer-ise planların (her satıra bir tane)</span>
              <textarea className="field min-h-20" value={p.ifThen} onChange={(ev) => setP({ ...p, ifThen: ev.target.value })} />
            </label>
            <button className="btn btn-me w-full">Kaydet</button>
          </form>
        </div></details>

        {!gain && (
          <Section title="Kendini nasıl hissediyorsun?">
            <p className="text-sm" style={{ color: "var(--ink-2)" }}>
              Bunlardan biri olursa işaretle. Plan otomatik olarak bakım kalorisine geçer. Devam ederse bir doktor ya da diyetisyenle konuş.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {["Adetim gecikti/düzensiz", "Baş dönmesi", "Sürekli üşüme", "Saç dökülmesi", "Sürekli yemeği düşünüyorum", "Çok yorgun ve keyifsizim"].map((f) => (
                <button key={f} className="chip" onClick={() => act({ action: "flag", type: f }, { toast: "Not edildi, plan bakıma geçti" })}>
                  {f}
                </button>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

function TrendChart() {
  const { s } = useApp();
  const data = s.engine.trend;
  if (data.length < 2) {
    return <p style={{ color: "var(--ink-2)" }}>Birkaç gün sabah tartıl, trend çizgin burada belirecek.</p>;
  }
  const W = 600,
    H = 200,
    P = 28;
  const ys = data.flatMap((d) => [d.weight, d.trend]).concat([s.profile.targetWeight]);
  const min = Math.min(...ys) - 0.5,
    max = Math.max(...ys) + 0.5;
  const x = (i: number) => P + (i / (data.length - 1)) * (W - P * 2);
  const y = (v: number) => H - P - ((v - min) / (max - min)) * (H - P * 2);
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i)} ${y(d.trend)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Kilo trendi grafiği">
      <line x1={P} x2={W - P} y1={y(s.profile.targetWeight)} y2={y(s.profile.targetWeight)} stroke="var(--ink-3)" strokeDasharray="4 4" />
      <text x={W - P} y={y(s.profile.targetWeight) - 6} textAnchor="end" fontSize="12" fill="var(--ink-2)">
        hedef {s.profile.targetWeight}
      </text>
      {data.map((d, i) => (
        <circle key={i} cx={x(i)} cy={y(d.weight)} r="3" fill="var(--ink-3)" opacity="0.5" />
      ))}
      <path d={line} fill="none" stroke="var(--me)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <text x={P} y={H - 6} fontSize="12" fill="var(--ink-2)">
        {data[0].date.slice(5)}
      </text>
      <text x={W - P} y={H - 6} fontSize="12" fill="var(--ink-2)" textAnchor="end">
        {data[data.length - 1].date.slice(5)}
      </text>
    </svg>
  );
}

function BodyCard() {
  const { s, act } = useApp();
  const b = s.body;
  const fields = MEASURE_FIELDS.filter((f) => f.key !== "underbust" || s.profile.sex === "f");
  const [m, setM] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(!b.latest);
  const female = s.profile.sex === "f";

  return (
    <section className="panel">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="display text-xl font-bold">Vücut analizi</h2>
        {b.latest && <span className="label">{b.latest.date.slice(5).split("-").reverse().join(".")} ölçümü</span>}
      </div>

      {b.latest ? (
        <>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {b.whtr !== undefined && (
              <div className="rounded-2xl p-2.5 text-center" style={{ background: "var(--me-soft)" }}>
                <p className="display text-2xl font-bold num">{b.whtr.toLocaleString("tr-TR")}</p>
                <p className="text-[11px] leading-tight" style={{ color: "var(--ink-2)" }}>Bel / boy<br />{b.whtr < 0.5 ? "sağlıklı ✓" : "0.5 altı hedef"}</p>
              </div>
            )}
            {b.whr !== undefined && (
              <div className="rounded-2xl p-2.5 text-center" style={{ background: "var(--me-soft)" }}>
                <p className="display text-2xl font-bold num">{b.whr.toLocaleString("tr-TR")}</p>
                <p className="text-[11px] leading-tight" style={{ color: "var(--ink-2)" }}>Bel / kalça<br />{b.whr < (female ? 0.85 : 0.9) ? "düşük risk ✓" : "dikkat"}</p>
              </div>
            )}
            {b.rfm !== undefined && (
              <div className="rounded-2xl p-2.5 text-center" style={{ background: "var(--me-soft)" }}>
                <p className="display text-2xl font-bold num">%{b.rfm.toLocaleString("tr-TR")}</p>
                <p className="text-[11px] leading-tight" style={{ color: "var(--ink-2)" }}>Tahmini yağ<br />{b.rfmBand}</p>
              </div>
            )}
          </div>

          {b.goals.length > 0 && (
            <ul className="mt-4 space-y-3">
              {b.goals.map((g) => {
                const start = g.start ?? g.now ?? g.target;
                const now = g.now ?? start;
                const span = g.target - start;
                const pct = g.direction === "hold" ? 1 : span === 0 ? 1 : Math.max(0, Math.min(1, (now - start) / span));
                const delta = Math.round((now - start) * 10) / 10;
                return (
                  <li key={g.key}>
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold">{g.label}</span>
                      <span className="num" style={{ color: "var(--ink-2)" }}>
                        {now} cm{delta !== 0 && ` (${delta > 0 ? "+" : ""}${delta.toLocaleString("tr-TR")})`} → {g.direction === "hold" ? `en fazla ${g.target}` : g.target}
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full overflow-hidden mt-1" style={{ background: "var(--line)" }}>
                      <div className="h-full rounded-full grad-me transition-[width] duration-700" style={{ width: `${Math.max(4, pct * 100)}%`, opacity: g.direction === "hold" ? 0.45 : 1 }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {b.insights.length > 0 && (
            <ul className="mt-4 space-y-1.5 text-sm">
              {b.insights.map((t, i) => (
                <li key={i} className="flex gap-2">
                  <span aria-hidden>💡</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <p className="mt-2 text-sm" style={{ color: "var(--ink-2)" }}>
          Mezura ile bel, kalça, göğüs, kol ve üst bacağını ölç. Tartıdan çok daha dürüst bir ilerleme göstergesi.
        </p>
      )}

      <button className="btn btn-ghost w-full mt-4 press" onClick={() => setOpen((x) => !x)} aria-expanded={open}>
        📏 {open ? "Kapat" : "Yeni ölçü gir"}
      </button>
      {open && (
        <form
          className="grid grid-cols-2 gap-2 mt-3"
          onSubmit={async (ev) => {
            ev.preventDefault();
            const body: Record<string, unknown> = { action: "measure" };
            for (const [k, v] of Object.entries(m)) if (v) body[k] = Number(v.replace(",", "."));
            if (await act(body, { toast: "Ölçüler kaydedildi 📏", points: 20, celebrate: true })) {
              setM({});
              setOpen(false);
            }
          }}
        >
          {fields.map((f) => (
            <label key={f.key}>
              <span className="label">{f.label(s.profile)} (cm)</span>
              <input
                className="field num"
                inputMode="decimal"
                placeholder={b.latest?.[f.key] ? String(b.latest[f.key]) : ""}
                value={m[f.key] ?? ""}
                onChange={(ev) => setM({ ...m, [f.key]: ev.target.value })}
              />
            </label>
          ))}
          <button className="btn btn-me col-span-2 press" disabled={!Object.values(m).some(Boolean)}>
            Kaydet
          </button>
          <p className="col-span-2 text-xs" style={{ color: "var(--ink-3)" }}>
            2-4 haftada bir, sabah aç karnına, mezurayı sıkmadan. Sadece değişenleri yazman yeter.
          </p>
        </form>
      )}
    </section>
  );
}
