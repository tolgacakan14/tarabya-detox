"use client";
import { useEffect, useRef, useState } from "react";
import { useApp, Section } from "./ui";
import Avatar from "./Avatar";

type Msg = { id?: string; role: "user" | "assistant"; content: string };

const STARTERS: Record<"gain" | "lose", string[]> = {
  gain: ["Bugün iştahım yok, ne yiyeyim?", "Öğlen tavuk dürüm ve ayran yedim", "Bu hafta neden kilo almadım?", "Akşam koşuya çıktım, 30 dk"],
  lose: ["Akşam dışarıda yiyeceğim, ne seçeyim?", "Canım tatlı çekiyor", "Bugün çok yorgunum, antrenmanı nasıl yapayım?", "Öğlen mercimek çorbası ve salata yedim"],
};

export default function Coach() {
  const { s, reload } = useApp();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [ai, setAi] = useState(true);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/chat")
      .then((r) => r.json())
      .then((j) => {
        setMsgs(j.messages ?? []);
        setAi(!!j.ai);
      });
  }, []);
  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth", block: "end" }), [msgs, busy]);

  async function send(m: string) {
    if (!m.trim() || busy) return;
    setText("");
    setMsgs((x) => [...x, { role: "user", content: m }]);
    setBusy(true);
    const r = await fetch("/api/chat", { method: "POST", body: JSON.stringify({ message: m }) });
    const j = await r.json();
    setBusy(false);
    setMsgs((x) => [...x, { role: "assistant", content: r.ok ? j.reply : j.error }]);
    if (j.changed) reload();
  }

  return (
    <div className="grid lg:grid-cols-[1fr_300px] gap-4">
      <Section className="flex flex-col min-h-[65vh]">
        <div className="flex-1 space-y-3 overflow-y-auto">
          {msgs.length === 0 && (
            <div className="text-center py-6">
              <p className="display text-2xl font-bold">Koçunla konuş</p>
              <p className="mt-2 mx-auto max-w-md" style={{ color: "var(--ink-2)" }}>
                Ne yediğini, nasıl hissettiğini, gününün nasıl geçtiğini yaz. Yediklerini kaydeder, planını günceller, görev ekler.
              </p>
              {!ai && <p className="mt-3 text-sm" style={{ color: "var(--warn)" }}>Koç henüz bağlı değil: Vercel'e ANTHROPIC_API_KEY eklenince çalışacak.</p>}
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={m.id ?? i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <p
                className="max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5"
                style={m.role === "user" ? { background: "var(--me)", color: "#fff" } : { background: "var(--mist)" }}
              >
                {m.content}
              </p>
            </div>
          ))}
          {busy && (
            <p className="rounded-2xl px-4 py-2.5 inline-block" style={{ background: "var(--mist)", color: "var(--ink-2)" }}>
              Düşünüyor…
            </p>
          )}
          <div ref={end} />
        </div>
        <div className="flex gap-2 scroll-x mt-3">
          {STARTERS[s.profile.goal].map((x) => (
            <button key={x} className="chip whitespace-nowrap" onClick={() => send(x)} disabled={busy}>
              {x}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2 mt-3"
          onSubmit={(e) => {
            e.preventDefault();
            send(text);
          }}
        >
          <input className="field" value={text} onChange={(e) => setText(e.target.value)} placeholder="Bir şey yaz…" aria-label="Mesaj" />
          <button className="btn btn-me" disabled={busy || !text.trim()}>
            Gönder
          </button>
        </form>
      </Section>
      <aside className="hidden lg:block">
        <Section>
          <div className="flex justify-center">
            <Avatar who={s.user} mood="happy" level={s.scores.me.level.index} size={170} />
          </div>
          <p className="text-sm mt-3" style={{ color: "var(--ink-2)" }}>
            Koç seni yargılamaz. Kilonu ya da kalorini {s.scores.partner.name} ile karşılaştırmaz. Sınırları güvenlik kurallarına bağlı: {s.profile.goal === "lose" ? `kalorin ${s.engine.floor} kcal'nin altına inemez.` : "kalorin harcamanın altına inemez."}
          </p>
        </Section>
      </aside>
    </div>
  );
}
