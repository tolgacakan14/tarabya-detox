import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { estimateFood } from "@/lib/coach";

export const maxDuration = 45;

const IMG = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Giriş yapılmadı" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { text?: unknown; image?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.slice(0, 600) : "";
  const image = typeof body?.image === "string" ? body.image : undefined;
  if (image && (image.length > 3_500_000 || !IMG.test(image))) return NextResponse.json({ error: "Fotoğraf okunamadı, tekrar dener misin?" }, { status: 400 });
  if (!text.trim() && !image) return NextResponse.json({ error: "Ne yediğini yaz ya da fotoğraf çek" }, { status: 400 });
  try {
    const items = await estimateFood(text, image);
    if (!items.length) return NextResponse.json({ error: image ? "Fotoğrafta yemek seçemedim. Daha yakından ya da üstten çekmeyi dene." : "Anlayamadım, biraz daha ayrıntı yaz." }, { status: 422 });
    return NextResponse.json({ items });
  } catch (e) {
    const msg = (e as Error).message;
    console.error("estimate", image ? "image" : "text", msg);
    return NextResponse.json({ error: msg.startsWith("Ücretsiz kota") || msg.startsWith("AI anahtarı") ? msg : "Şu an hesaplayamadım, birazdan tekrar dene." }, { status: 500 });
  }
}
