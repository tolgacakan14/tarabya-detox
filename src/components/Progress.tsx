"use client";
import CycleCard from "./Cycle";
import { WeightCharts, WeightHistory } from "./Weight";
import { usePhotoPicker } from "./PhotoAvatar";
import Avatar from "./Avatar";
import { NotifySettings } from "./Notify";

function DayModeCard() {
  const { s, act } = useApp();
  const manual = s.day.manual;
  return (
    <section className="panel">
      <div className="flex items-center justify-between gap-3">
        <p className="font-bold">🌙 Günümü ben bitireyim</p>
        <button className="chip press" aria-pressed={manual} onClick={() => act({ action: "dayMode", mode: manual ? "calendar" : "manual" }, { toast: manual ? "Gün artık gece yarısı değişiyor" : "Günü sen bitireceksin" })}>
          {manual ? "Açık" : "Kapalı"}
        </button>
      </div>
      <p className="text-sm mt-1" style={{ color: "var(--ink-2)" }}>
        Geç yatıyorsan açık tut: gün gece yarısı değil, sen &quot;Günü bitir&quot; deyince ya da en geç ertesi gün 14:00&apos;te yenilenir. Gece yediklerin aynı güne yazılır.
      </p>
    </section>
  );
}

function PhotoCard() {
  const { s } = useApp();
  const photo = usePhotoPicker();
  return (
    <section className="panel flex items-center gap-4">
      {photo.el}
      <Avatar who={s.user} size={64} bob={false} />
      <div className="flex-1 min-w-0">
        <p className="font-bold">Profil fotoğrafı</p>
        <p className="label">{s.avatars[s.user] ? "Kendi fotoğrafın kullanılıyor." : "Gerçek fotoğrafını koy, ikiniz de birbirinizi görün."}</p>
      </div>
      <button className="btn btn-me press !px-4" onClick={photo.open}>
        📸 {s.avatars[s.user] ? "Değiştir" : "Yükle"}
      </button>
    </section>
  );
}
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
        <WeightCharts />
        <Section title="Hedef yolculuğu">
          <ul className="flex flex-wrap gap-2">
            {e.milestones.map((ms) => (
              <li key={ms.label} className="chip" style={ms.reached ? { background: "var(--me)", color: "#fff", borderColor: "var(--me)" } : undefined}>
                {ms.label}: {ms.weight.toLocaleString("tr-TR")} kg {ms.reached ? "✓" : ""}
              </li>
            ))}
          </ul>
        </Section>

        <WeightHistory />
        <CycleCard />
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
          <div className="mt-4 rounded-2xl p-3" style={{ background: "var(--me-soft)" }}>
            <div className="flex items-center justify-between gap-3">
              <p className="font-bold">🔥 Yoğun mod</p>
              <button
                className="chip press"
                aria-pressed={s.profile.intensity !== "standard"}
                onClick={() => act({ action: "profile", patch: { intensity: s.profile.intensity === "standard" ? "intense" : "standard" } }, { toast: "Plan güncellendi" })}
              >
                {s.profile.intensity === "standard" ? "Kapalı" : "Açık"}
              </button>
            </div>
            <p className="text-sm mt-1" style={{ color: "var(--ink-2)" }}>
              {gain
                ? "Günde ~500 kcal fazla, daha yüksek başlangıç harcaması ve 2 g/kg protein. Tartı yatay giderse 3. haftadan itibaren kendiliğinden artırır."
                : "Daha büyük açık (~%22), haftalık +1000 adım ile 10 bine çıkış, haftada 3 kuvvet antrenmanı ve 2 g/kg protein. Kalori yine güvenlik tabanının altına inmez; çok hızlı gidersen kas kaybetmemen için frene basar."}
            </p>
          </div>
          <p className="text-sm mt-3" style={{ color: "var(--ink-2)" }}>
            İlk haftalarda formülle başlıyoruz. Tartı ve yemek kayıtların biriktikçe sistem senin gerçek harcamanı öğreniyor ve hedefi kendisi düzeltiyor.
          </p>
        </Section>

        <PhotoCard />
        <DayModeCard />
        <NotifySettings />
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
