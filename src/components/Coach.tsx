"use client";
import { useEffect, useRef, useState } from "react";
import { useApp } from "./ui";
import Avatar from "./Avatar";
import QuickLog from "./QuickLog";

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
  const [plate, setPlate] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/chat")
      .then((r) => r.json())
      .then((j) => {
        setMsgs(j.messages ?? []);
        setAi(!!j.ai);
      })
      .catch(() => {});
  }, []);
  // Note: scrollIntoView returns a Promise in recent Chrome; never return it from an effect.
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, busy]);

  async function send(m: string) {
    if (!m.trim() || busy) return;
    setText("");
    setMsgs((x) => [...x, { role: "user", content: m }]);
    setBusy(true);
    let reply = "Bağlantı koptu, bir daha dener misin?";
    let changed = false;
    try {
      const r = await fetch("/api/chat", { method: "POST", body: JSON.stringify({ message: m }) });
      const j = await r.json().catch(() => ({}));
      reply = (r.ok ? j.reply : j.error) || reply;
      changed = !!j.changed;
    } catch {
      /* network error: keep the friendly message */
    }
    setBusy(false);
    setMsgs((x) => [...x, { role: "assistant", content: reply }]);
    if (changed) reload();
  }

  return (
    // Full-height chat for phones: messages scroll inside, starters + input stay pinned above the bottom menu.
    <section className="panel !p-0 flex flex-col overflow-hidden" style={{ height: "calc(100dvh - 176px - env(safe-area-inset-bottom))" }}>
      <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "var(--line)" }}>
        <Avatar who={s.user} mood={busy ? "proud" : "happy"} size={40} bob={false} />
        <div className="min-w-0">
          <p className="display font-bold leading-tight">Koçun</p>
          <p className="text-xs truncate" style={{ color: "var(--ink-3)" }}>{busy ? "yazıyor…" : "Yediklerini kaydeder, planını günceller"}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5" style={{ overscrollBehavior: "contain" }}>
        {msgs.length === 0 && (
          <div className="text-center py-8 px-2">
            <p className="text-4xl" aria-hidden>💬</p>
            <p className="display text-xl font-bold mt-2">Koçunla konuş</p>
            <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
              Ne yediğini, nasıl hissettiğini yaz. Aşağıdaki hazır cümlelerle de başlayabilirsin.
            </p>
            {!ai && <p className="mt-3 text-sm" style={{ color: "var(--warn)" }}>Koç henüz bağlı değil.</p>}
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={m.id ?? i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <p
              className={`max-w-[82%] whitespace-pre-wrap px-3.5 py-2 text-[15px] leading-snug ${m.role === "user" ? "rounded-2xl rounded-br-md grad-me text-white" : "rounded-2xl rounded-bl-md"}`}
              style={m.role === "user" ? undefined : { background: "var(--mist)" }}
            >
              {m.content}
            </p>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <p className="rounded-2xl rounded-bl-md px-4 py-2.5 typing" style={{ background: "var(--mist)" }} aria-label="Koç yazıyor">
              <span>•</span><span>•</span><span>•</span>
            </p>
          </div>
        )}
        <div ref={end} />
      </div>

      <div className="border-t px-3 pt-2 pb-3" style={{ borderColor: "var(--line)" }}>
        {plate && (
          <div className="mb-2 max-h-[60dvh] overflow-y-auto">
            <QuickLog
              onDone={() => {
                setPlate(false);
                send("Az önce yediğimi kaydettim. Günün geri kalanı için ne önerirsin?");
              }}
            />
          </div>
        )}
        <div className="flex gap-2 scroll-x max-w-full min-w-0 pb-2">
          {STARTERS[s.profile.goal].map((x) => (
            <button key={x} className="chip whitespace-nowrap !text-[13px] !py-1.5 press" onClick={() => send(x)} disabled={busy}>
              {x}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2 items-center"
          onSubmit={(e) => {
            e.preventDefault();
            send(text);
          }}
        >
          <button type="button" className="btn btn-ghost !rounded-full !w-12 !h-12 !p-0 shrink-0 press" onClick={() => setPlate(!plate)} aria-label="Tabak fotoğrafı ile yemek ekle" aria-pressed={plate}>
            {plate ? "✕" : "📷"}
          </button>
          <input className="field !rounded-full !py-3 text-[16px]" value={text} onChange={(e) => setText(e.target.value)} placeholder="Bir şey yaz…" aria-label="Mesaj" enterKeyHint="send" />
          <button className="btn btn-me !rounded-full !w-12 !h-12 !p-0 shrink-0 press" disabled={busy || !text.trim()} aria-label="Gönder">
            ➤
          </button>
        </form>
      </div>
    </section>
  );
}
