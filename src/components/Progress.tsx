"use client";
import { useState } from "react";
import { useApp, Section, Stat, fmt } from "./ui";

export default function Progress() {
  const { s, act } = useApp();
  const e = s.engine;
  const gain = s.profile.goal === "gain";
  const [m, setM] = useState({ waist: "", arm: "", chest: "", thigh: "", hip: "" });
  const [p, setP] = useState({
    targetWeight: String(s.profile.targetWeight),
    likes: s.profile.likes,
    dislikes: s.profile.dislikes,
    why: s.profile.why,
    ifThen: s.profile.ifThen.join("\n"),
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-4">
      <div className="space-y-4">
        <Section title="Kilo trendi" aside={<span className="label">Günlük tartı dalgalanır, çizgi gerçeği gösterir</span>}>
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

        <Section title="Vücut ölçüleri" aside={<span className="label">2-4 haftada bir, aynı saatte</span>}>
          <p className="text-sm mb-3" style={{ color: "var(--ink-2)" }}>
            {gain
              ? "Kol ve göğüs büyürken bel yavaş artıyorsa kas alıyorsun. Bel kol'dan hızlı artarsa fazlayı azaltırız."
              : "Kas kazanırken tartı yavaş inebilir ama bel incelir. Bel ölçüsü en dürüst göstergen."}
          </p>
          <form
            className="grid grid-cols-2 sm:grid-cols-5 gap-2"
            onSubmit={async (ev) => {
              ev.preventDefault();
              if (await act({ action: "measure", ...Object.fromEntries(Object.entries(m).filter(([, v]) => v).map(([k, v]) => [k, Number(v.replace(",", "."))])) }, { toast: "Ölçüler kaydedildi", points: 20 }))
                setM({ waist: "", arm: "", chest: "", thigh: "", hip: "" });
            }}
          >
            {(
              [
                ["waist", "Bel"],
                ["arm", "Kol"],
                ["chest", "Göğüs"],
                ["thigh", "Bacak"],
                ["hip", "Kalça"],
              ] as const
            ).map(([k, l]) => (
              <label key={k}>
                <span className="label">{l} (cm)</span>
                <input className="field num" inputMode="decimal" value={m[k]} onChange={(ev) => setM({ ...m, [k]: ev.target.value })} />
              </label>
            ))}
            <button className="btn btn-me col-span-2 sm:col-span-5" disabled={!Object.values(m).some(Boolean)}>
              Kaydet
            </button>
          </form>
          {s.measures.length > 0 && (
            <table className="w-full text-sm mt-4 num">
              <thead>
                <tr className="label text-left">
                  <th className="font-normal">Tarih</th>
                  <th className="font-normal">Bel</th>
                  <th className="font-normal">Kol</th>
                  <th className="font-normal">Göğüs</th>
                  <th className="font-normal">Bacak</th>
                  <th className="font-normal">Kalça</th>
                </tr>
              </thead>
              <tbody>
                {s.measures.map((x) => {
                  const r = x as unknown as Record<string, number | string>;
                  return (
                    <tr key={String(r.date)}>
                      <td>{String(r.date).slice(5)}</td>
                      {["waist", "arm", "chest", "thigh", "hip"].map((k) => (
                        <td key={k}>{r[k] ?? "—"}</td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Section>
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
