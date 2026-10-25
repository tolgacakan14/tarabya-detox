"use client";
// Turning on push reminders: never asks on load, only from a tap; explains the iPhone home-screen step.
import { useEffect, useState } from "react";
import { useApp } from "./ui";

type Status = { key: string; subscribed: boolean; configured: boolean } | null;

const b64 = (s: string) => {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

function env() {
  if (typeof window === "undefined") return { supported: false, ios: false, standalone: false };
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
  const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  return { supported, ios, standalone };
}

export function usePush() {
  const [st, setSt] = useState<Status>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const load = () =>
    fetch("/api/push")
      .then((r) => r.json())
      .then(setSt)
      .catch(() => {});
  useEffect(() => {
    load();
  }, []);
  async function enable() {
    setBusy(true);
    setMsg("");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setMsg("İzin verilmedi. Telefonun ayarlarından bu uygulamaya bildirim izni verebilirsin.");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(st?.key ?? "") }));
      const r = await fetch("/api/push", { method: "POST", body: JSON.stringify(sub.toJSON()) });
      if (!r.ok) throw new Error();
      const t = await fetch("/api/push", { method: "PUT" });
      setMsg(t.ok ? "Açıldı! Deneme bildirimi gönderdim 💛" : "Açıldı. Sunucu anahtarı eklenince bildirimler gelmeye başlayacak.");
      await load();
    } catch {
      setMsg("Bildirim açılamadı. Uygulamayı ana ekrandan açtığından emin ol ve tekrar dene.");
    } finally {
      setBusy(false);
    }
  }
  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push", { method: "DELETE", body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
      await load();
      setMsg("Bu telefonda bildirimler kapatıldı.");
    } finally {
      setBusy(false);
    }
  }
  return { st, busy, msg, enable, disable };
}

/** Card on Today until this device has reminders on (dismissable for a week). */
export function NotifyCard() {
  const { s } = useApp();
  const { st, busy, msg, enable } = usePush();
  const [hidden, setHidden] = useState(true);
  const e = env();
  useEffect(() => {
    try {
      const until = Number(localStorage.getItem("notif-later") || 0);
      setHidden(Date.now() < until);
    } catch {
      setHidden(false);
    }
  }, []);
  if (hidden || !st || st.subscribed || s.habitDay < 2) return null;
  const later = () => {
    try {
      localStorage.setItem("notif-later", String(Date.now() + 7 * 864e5));
    } catch {
      /* ignore */
    }
    setHidden(true);
  };
  return (
    <section className="panel relative overflow-hidden">
      <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full grad-me opacity-15" aria-hidden />
      <p className="font-bold relative">🔔 Hatırlatıcı ister misin?</p>
      {e.ios && !e.standalone ? (
        <p className="text-sm mt-1 relative" style={{ color: "var(--ink-2)" }}>
          iPhone&apos;da bildirim için önce Safari&apos;de <b>Paylaş → Ana Ekrana Ekle</b>, sonra uygulamayı ana ekrandaki simgeden aç ve buraya tekrar dokun.
        </p>
      ) : (
        <p className="text-sm mt-1 relative" style={{ color: "var(--ink-2)" }}>
          Sadece eksik bir şey varsa (tartı, öğün, günü kapatma) ve günde en fazla 2 kez. {s.scores.partner.name} beşlik çakınca da haber veririm.
        </p>
      )}
      {msg && <p className="text-sm mt-2 font-semibold relative">{msg}</p>}
      <div className="grid grid-cols-[auto_1fr] gap-2 mt-3 relative">
        <button className="btn btn-ghost press" onClick={later}>
          Şimdi değil
        </button>
        <button className="btn btn-me press" disabled={busy || !e.supported || (e.ios && !e.standalone)} onClick={enable}>
          {busy ? "Açılıyor…" : "Bildirimleri aç"}
        </button>
      </div>
    </section>
  );
}

/** Settings panel (İlerleme): which reminders and when. */
export function NotifySettings() {
  const { s, act } = useApp();
  const { st, busy, msg, enable, disable } = usePush();
  const e = env();
  const r = {
    weigh: s.profile.reminders?.weigh !== undefined ? s.profile.reminders.weigh : s.user === "tolga" ? "11:30" : "08:30",
    meal: s.profile.reminders?.meal ?? true,
    dayEnd: s.profile.reminders?.dayEnd !== undefined ? s.profile.reminders.dayEnd : s.user === "tolga" ? "01:30" : "23:30",
    partner: s.profile.reminders?.partner ?? true,
  };
  const set = (patch: Record<string, unknown>) => act({ action: "reminders", ...patch }, { toast: "Kaydedildi" });
  return (
    <section className="panel">
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold">🔔 Bildirimler</p>
        {st?.subscribed ? (
          <button className="chip press" disabled={busy} onClick={disable}>
            Bu telefonda açık · kapat
          </button>
        ) : (
          <button className="chip press" disabled={busy || !e.supported || (e.ios && !e.standalone)} onClick={enable}>
            Bu telefonda aç
          </button>
        )}
      </div>
      {e.ios && !e.standalone && !st?.subscribed && <p className="label mt-1">iPhone: önce Paylaş → Ana Ekrana Ekle, sonra ana ekrandan aç.</p>}
      {st && !st.configured && <p className="label mt-1">Sunucu bildirim anahtarı henüz eklenmedi; açabilirsin, anahtar eklenince gelmeye başlar.</p>}
      {msg && <p className="text-sm mt-1">{msg}</p>}
      <ul className="mt-3 space-y-2 text-sm">
        <li className="flex items-center justify-between gap-2 min-h-[44px]">
          <span>⚖️ Tartı hatırlatması (tartılmadıysan)</span>
          <span className="flex items-center gap-2">
            {r.weigh && <input type="time" className="field !w-[104px] !py-1.5" value={r.weigh} onChange={(ev) => set({ weigh: ev.target.value })} aria-label="Tartı saati" />}
            <button className="chip press" aria-pressed={!!r.weigh} onClick={() => set({ weigh: r.weigh ? null : s.user === "tolga" ? "11:30" : "08:30" })}>
              {r.weigh ? "Açık" : "Kapalı"}
            </button>
          </span>
        </li>
        <li className="flex items-center justify-between gap-2 min-h-[44px]">
          <span>😋 Öğlene kadar öğün yoksa</span>
          <button className="chip press" aria-pressed={r.meal} onClick={() => set({ meal: !r.meal })}>
            {r.meal ? "Açık" : "Kapalı"}
          </button>
        </li>
        <li className="flex items-center justify-between gap-2 min-h-[44px]">
          <span>🌙 Günü kapatma</span>
          <span className="flex items-center gap-2">
            {r.dayEnd && <input type="time" className="field !w-[104px] !py-1.5" value={r.dayEnd} onChange={(ev) => set({ dayEnd: ev.target.value })} aria-label="Gün sonu saati" />}
            <button className="chip press" aria-pressed={!!r.dayEnd} onClick={() => set({ dayEnd: r.dayEnd ? null : s.user === "tolga" ? "01:30" : "23:30" })}>
              {r.dayEnd ? "Açık" : "Kapalı"}
            </button>
          </span>
        </li>
        <li className="flex items-center justify-between gap-2 min-h-[44px]">
          <span>🙌 {s.scores.partner.name} beşlik çakınca</span>
          <button className="chip press" aria-pressed={r.partner} onClick={() => set({ partner: !r.partner })}>
            {r.partner ? "Açık" : "Kapalı"}
          </button>
        </li>
      </ul>
      <p className="label mt-2">Gece 03:00-08:00 arası sessiz. Günde en fazla 2 hatırlatma.</p>
    </section>
  );
}
