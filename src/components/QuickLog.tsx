"use client";
// "Ne yedin?" — the fastest way to log right after eating: type it, or snap the plate.
// Photos are downscaled on the phone before upload. AI estimates are reviewed with portion
// multipliers because vision models tend to underestimate large portions.
import { useRef, useState } from "react";
import { useApp, fmt } from "./ui";
import { QUICK_SIZES } from "@/lib/foods";

type Item = { name: string; amount: string; kcal: number; protein: number; carbs: number; fat: number; low?: boolean; m?: number };
const MULTS = [0.75, 1, 1.25, 1.5];

function slotNow(): string {
  const h = new Date().getHours();
  return h < 11 ? "kahvaltı" : h < 15 ? "öğle" : h < 18 ? "ara öğün" : "akşam";
}

async function downscale(file: File, max = 1024): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.78);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function QuickLog({ onDone, autoFocus = false }: { onDone?: () => void; autoFocus?: boolean }) {
  const { act } = useApp();
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [items, setItems] = useState<Item[] | null>(null);
  const [mult, setMult] = useState(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const cam = useRef<HTMLInputElement>(null);
  const gal = useRef<HTMLInputElement>(null);

  async function estimate(t: string, image?: string) {
    setBusy(true);
    setErr("");
    setItems(null);
    setMult(1);
    try {
      const r = await fetch("/api/estimate", { method: "POST", body: JSON.stringify({ text: t, image }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setErr(j.error ?? "Hesaplayamadım");
      else setItems(j.items);
    } catch {
      setErr("Bağlantı koptu, tekrar dener misin?");
    }
    setBusy(false);
  }

  async function onFile(f?: File | null) {
    if (!f) return;
    try {
      const data = await downscale(f);
      setPhoto(data);
      await estimate(text, data);
    } catch {
      setErr("Fotoğraf açılamadı, başka bir tane dener misin?");
    }
  }

  function reset() {
    setItems(null);
    setPhoto(null);
    setText("");
    setErr("");
    setMult(1);
  }

  const scaled = (items ?? []).map((i) => {
    const k = mult * (i.m ?? 1);
    return {
      name: i.name,
      low: i.low,
      kcal: Math.round(i.kcal * k),
      protein: Math.round(i.protein * k * 10) / 10,
      carbs: Math.round(i.carbs * k * 10) / 10,
      fat: Math.round(i.fat * k * 10) / 10,
      amount: k === 1 ? i.amount : `${i.amount} ×${String(Math.round(k * 100) / 100).replace(".", ",")}`,
    };
  });
  const setM = (idx: number, d: number) => setItems((items ?? []).map((x, k) => (k === idx ? { ...x, m: Math.min(3, Math.max(0.25, (x.m ?? 1) + d)) } : x)));
  const total = scaled.reduce((a, i) => a + i.kcal, 0);
  const prot = scaled.reduce((a, i) => a + i.protein, 0);

  return (
    <section className="panel relative overflow-hidden">
      <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full grad-me opacity-15" aria-hidden />
      <h2 className="display text-2xl font-bold relative">Ne yedin? 😋</h2>

      {!items && (
        <>
          <form
            className="flex gap-2 mt-3 relative"
            onSubmit={(e) => {
              e.preventDefault();
              if (text.trim()) estimate(text);
            }}
          >
            <input
              className="field !rounded-full !py-3"
              placeholder="Örn: tavuk dürüm ve ayran"
              value={text}
              onChange={(e) => setText(e.target.value)}
              autoFocus={autoFocus}
              enterKeyHint="send"
              aria-label="Ne yedin"
            />
            <button className="btn btn-me !rounded-full !px-5 shrink-0 press" disabled={!text.trim() || busy}>
              {busy && !photo ? "…" : "Hesapla"}
            </button>
          </form>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button className="btn btn-ghost press !py-3" onClick={() => cam.current?.click()} disabled={busy}>
              📷 Tabağı çek
            </button>
            <button className="btn btn-ghost press !py-3" onClick={() => gal.current?.click()} disabled={busy}>
              🖼️ Galeriden
            </button>
          </div>
          <input ref={cam} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          <input ref={gal} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        </>
      )}

      {busy && (
        <div className="mt-3 flex items-center gap-3">
          {photo && <img src={photo} alt="Çektiğin tabak" className="w-16 h-16 rounded-2xl object-cover" />}
          <p className="font-semibold shine rounded-full px-3 py-1" style={{ background: "var(--me-soft)" }}>
            {photo ? "Tabağına bakıyorum…" : "Hesaplıyorum…"}
          </p>
        </div>
      )}

      {err && (
        <div className="mt-3">
          <p className="text-sm" style={{ color: "var(--warn)" }}>
            {err}
          </p>
          <p className="text-xs mt-2" style={{ color: "var(--ink-2)" }}>
            Ya da kabaca seç:
          </p>
          <div className="flex gap-2 mt-1 flex-wrap">
            {QUICK_SIZES.map((q) => (
              <button
                key={q.id}
                className="chip press"
                onClick={async () => {
                  if (await act({ action: "addFood", entry: { name: q.label + " (tahmini)", amount: q.hint, kcal: q.kcal, protein: q.protein, carbs: q.carbs, fat: q.fat, source: "quick" }, meal: slotNow(), planned: false }, { toast: "Kaydedildi" })) {
                    reset();
                    onDone?.();
                  }
                }}
              >
                {q.label} ~{q.kcal}
              </button>
            ))}
          </div>
        </div>
      )}

      {items && (
        <div className="mt-3">
          <div className="flex gap-3 items-start">
            {photo && <img src={photo} alt="Çektiğin tabak" className="w-20 h-20 rounded-2xl object-cover shrink-0" />}
            <div>
              <p className="display text-3xl font-bold num">{fmt(total)} kcal</p>
              <p className="text-sm" style={{ color: "var(--ink-2)" }}>{Math.round(prot)} g protein</p>
            </div>
          </div>
          <p className="text-sm font-semibold mt-3">Tabağın ne kadardı?</p>
          <div className="grid grid-cols-4 gap-1.5 mt-1.5">
            {MULTS.map((m) => (
              <button key={m} className="chip justify-center press" aria-pressed={mult === m} onClick={() => setMult(m)}>
                {{ 0.75: "Küçük", 1: "Normal", 1.25: "Büyük", 1.5: "Dev" }[m]}
              </button>
            ))}
          </div>
          <ul className="mt-3 space-y-1.5">
            {scaled.map((it, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className="flex-1 min-w-0">
                  <span className="font-semibold">{it.name}</span>
                  {it.low && (
                    <span className="ml-1 text-[11px] font-bold rounded-full px-1.5 py-0.5" style={{ background: "#fff1d6", color: "#8a5300" }}>
                      kontrol et
                    </span>
                  )}
                  {it.amount && <span className="label block"> {it.amount}</span>}
                </span>
                <button className="chip !min-h-[36px] !px-2.5 press" onClick={() => setM(i, -0.25)} aria-label={`${it.name} azalt`}>
                  −
                </button>
                <span className="num w-10 text-right">{it.kcal}</span>
                <button className="chip !min-h-[36px] !px-2.5 press" onClick={() => setM(i, 0.25)} aria-label={`${it.name} artır`}>
                  +
                </button>
                <button className="label underline" onClick={() => setItems(items.filter((_, k) => k !== i))} aria-label={`${it.name} çıkar`}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-[auto_1fr] gap-2 mt-3">
            <button className="btn btn-ghost press" onClick={reset}>
              Vazgeç
            </button>
            <button
              className="btn btn-me press"
              disabled={!scaled.length}
              onClick={async () => {
                const meal = slotNow();
                const ok = await act(
                  { action: "addFoods", entries: scaled.map(({ low: _low, ...x }) => ({ ...x, meal, source: photo ? "photo" : "ai" })), planned: false },
                  { toast: `${fmt(total)} kcal kaydedildi 😋`, celebrate: true }
                );
                if (ok) {
                  reset();
                  onDone?.();
                }
              }}
            >
              Kaydet
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
