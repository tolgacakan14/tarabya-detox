"use client";
// Upload your own profile photo: pick, drag/zoom inside the circle, save a 320px JPEG.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "./ui";

const BOX = 260; // crop circle on screen
const OUT = 320; // saved size

export function usePhotoPicker() {
  const [file, setFile] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const el = (
    <>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setFile(URL.createObjectURL(f));
          e.target.value = "";
        }}
      />
      {file &&
        createPortal(
        <Cropper
          src={file}
          onClose={() => {
            URL.revokeObjectURL(file);
            setFile(null);
          }}
        />,
          document.body
        )}
    </>
  );
  return { open: () => input.current?.click(), el };
}

function Cropper({ src, onClose }: { src: string; onClose: () => void }) {
  const { act, s } = useApp();
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  useEffect(() => {
    const i = new Image();
    i.onload = () => setImg(i);
    i.src = src;
  }, [src]);

  // image drawn to cover the circle at zoom 1
  const base = img ? BOX / Math.min(img.width, img.height) : 1;
  const scale = base * zoom;
  const w = img ? img.width * scale : BOX,
    h = img ? img.height * scale : BOX;
  const clamp = (p: { x: number; y: number }) => ({
    x: Math.min((w - BOX) / 2, Math.max(-(w - BOX) / 2, p.x)),
    y: Math.min((h - BOX) / 2, Math.max(-(h - BOX) / 2, p.y)),
  });
  const p = clamp(pos);

  async function save() {
    if (!img) return;
    setBusy(true);
    const c = document.createElement("canvas");
    c.width = c.height = OUT;
    const g = c.getContext("2d")!;
    const k = OUT / BOX;
    // top-left of the image relative to the crop box
    const left = (BOX - w) / 2 + p.x,
      top = (BOX - h) / 2 + p.y;
    g.drawImage(img, left * k, top * k, w * k, h * k);
    const data = c.toDataURL("image/jpeg", 0.85);
    const ok = await act({ action: "avatar", image: data }, { toast: "Profil fotoğrafın güncellendi 📸", celebrate: true });
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end" role="dialog" aria-modal="true" aria-label="Profil fotoğrafını ayarla">
      <button className="absolute inset-0 bg-black/50" aria-label="Kapat" onClick={onClose} />
      <div className="relative w-full max-w-md mx-auto panel !rounded-b-none pb-[max(16px,env(safe-area-inset-bottom))]">
        <p className="display text-xl font-bold text-center">Fotoğrafını ayarla</p>
        <p className="label text-center">Sürükle ve yakınlaştır, yüzün dairenin ortasında olsun.</p>
        <div
          className="relative mx-auto mt-3 overflow-hidden rounded-full touch-none select-none"
          style={{ width: BOX, height: BOX, background: "#eee", boxShadow: "0 0 0 4px var(--me)" }}
          onPointerDown={(e) => {
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            drag.current = { x: e.clientX, y: e.clientY, px: p.x, py: p.y };
          }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            setPos(clamp({ x: drag.current.px + e.clientX - drag.current.x, y: drag.current.py + e.clientY - drag.current.y }));
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
        >
          {img && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt=""
              draggable={false}
              className="absolute max-w-none pointer-events-none"
              style={{ width: w, height: h, left: (BOX - w) / 2 + p.x, top: (BOX - h) / 2 + p.y }}
            />
          )}
        </div>
        <label className="flex items-center gap-3 mt-4">
          <span aria-hidden>🔍</span>
          <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-[var(--me)]" aria-label="Yakınlaştır" />
        </label>
        <div className="grid grid-cols-[auto_1fr] gap-2 mt-4">
          <button className="btn btn-ghost press" onClick={onClose}>
            Vazgeç
          </button>
          <button className="btn btn-me press" disabled={!img || busy} onClick={save}>
            {busy ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
        {s.avatars[s.user] && (
          <button
            className="label underline mt-3 mx-auto block"
            onClick={async () => {
              if (await act({ action: "avatarRemove" }, { toast: "Çizilmiş karaktere dönüldü" })) onClose();
            }}
          >
            Fotoğrafı kaldır, karakteri kullan
          </button>
        )}
      </div>
    </div>
  );
}
