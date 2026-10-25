"use client";
import { useState } from "react";
import { useApp } from "./ui";
import Avatar from "./Avatar";

export default function Onboarding() {
  const { s, act } = useApp();
  const p = s.profile;
  const gain = p.goal === "gain";
  const [step, setStep] = useState(0);
  const [f, setF] = useState({
    age: String(p.age),
    heightCm: String(p.heightCm),
    startWeight: String(p.startWeight),
    targetWeight: String(p.targetWeight),
    stepBaseline: String(p.stepBaseline),
    why: "",
    if1: "",
    if2: "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const finish = async () => {
    const patch: Record<string, unknown> = {
      age: Number(f.age),
      heightCm: Number(f.heightCm),
      startWeight: Number(f.startWeight.replace(",", ".")),
      targetWeight: Number(f.targetWeight.replace(",", ".")),
      stepBaseline: Number(f.stepBaseline),
      why: f.why,
      ifThen: [f.if1, f.if2].filter(Boolean),
      onboarded: true,
    };
    await act({ action: "profile", patch }, { toast: "Planın hazır" });
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/45 grid place-items-center p-3 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Başlangıç">
      <div className="panel w-full max-w-lg my-6">
        <div className="flex items-center gap-4">
          <Avatar who={s.user} mood={step === 2 ? "party" : "happy"} size={90} />
          <div>
            <p className="label">{step + 1} / 3</p>
            <h2 className="display text-2xl font-bold leading-tight">
              {step === 0 ? `Hoş geldin ${p.name}` : step === 1 ? "Neden ve nasıl" : "Son dokunuş"}
            </h2>
          </div>
        </div>

        {step === 0 && (
          <div className="mt-4 space-y-3">
            <p style={{ color: "var(--ink-2)" }}>
              {gain
                ? "Planın: haftada yaklaşık 0.25-0.3 kg sağlıklı kilo almak, çoğunu kas olarak. Bilgilerini kontrol et."
                : "Planın: haftada yaklaşık 0.25 kg yağ yakmak, kasını koruyarak. Tartı yavaş inse bile vücudun değişecek. Bilgilerini kontrol et."}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <L label="Yaş"><input className="field num" inputMode="numeric" value={f.age} onChange={set("age")} /></L>
              <L label="Boy (cm)"><input className="field num" inputMode="numeric" value={f.heightCm} onChange={set("heightCm")} /></L>
              <L label="Bugünkü kilo (kg)"><input className="field num" inputMode="decimal" value={f.startWeight} onChange={set("startWeight")} /></L>
              <L label={gain ? "Hedef kilo (kg)" : "İlk ara hedef (kg)"}><input className="field num" inputMode="decimal" value={f.targetWeight} onChange={set("targetWeight")} /></L>
              <L label="Günde yaklaşık kaç adım atıyorsun?"><input className="field num" inputMode="numeric" value={f.stepBaseline} onChange={set("stepBaseline")} /></L>
            </div>
            {!gain && (
              <p className="text-sm" style={{ color: "var(--ink-2)" }}>
                Önce 4 kg'lık ara hedefe gidiyoruz, sonra 4 hafta bakım yapıp birlikte bakacağız. Sağlıklı sınır olarak hedef 46.2 kg'ın altına inemiyor.
              </p>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="mt-4 space-y-3">
            <L label="Bunu neden istiyorsun? (zor günlerde sana hatırlatacağım)">
              <input className="field" value={f.why} onChange={set("why")} placeholder={gain ? "Örn. daha güçlü ve enerjik hissetmek" : "Örn. kendimi daha fit ve enerjik hissetmek"} />
            </L>
            <p className="text-sm" style={{ color: "var(--ink-2)" }}>
              İki tane “eğer-ise” planı yaz. Araştırmalar, zor anı önceden planlamanın uygulamayı ciddi şekilde artırdığını gösteriyor.
            </p>
            <L label="Plan 1">
              <input className="field" value={f.if1} onChange={set("if1")} placeholder={gain ? "Eğer öğle yemeğini kaçırırsam, eve gelince shake yaparım" : "Eğer eve geç ve aç gelirsem, yoğurt ve meyve yerim"} />
            </L>
            <L label="Plan 2">
              <input className="field" value={f.if2} onChange={set("if2")} placeholder="Eğer günüm çok yoğun olursa, yatmadan 5 dk mini antrenman yaparım" />
            </L>
          </div>
        )}

        {step === 2 && (
          <div className="mt-4 space-y-3">
            <ul className="text-sm space-y-1.5" style={{ color: "var(--ink-2)" }}>
              <li>Her sabah tartıl, ekranda günlük değil trend kilo var.</li>
              <li>Plansız yediklerini de kaydet; kesin olmasa da olur, sistem öğreniyor.</li>
              <li>Görev, su, adım, antrenman ve uyku puan kazandırır. {s.scores.partner.name} ile haftalık yarışıyorsunuz.</li>
              <li>Bir günü kaçırmak hiçbir şeyi bozmaz.</li>
            </ul>
          </div>
        )}

        <div className="flex gap-2 mt-5">
          {step > 0 && (
            <button className="btn btn-ghost" onClick={() => setStep(step - 1)}>
              Geri
            </button>
          )}
          <button className="btn btn-me flex-1" onClick={() => (step < 2 ? setStep(step + 1) : finish())}>
            {step < 2 ? "Devam" : "Planımı başlat"}
          </button>
        </div>
      </div>
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label block mb-1">{label}</span>
      {children}
    </label>
  );
}
