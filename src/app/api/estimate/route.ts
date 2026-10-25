import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { estimateFood } from "@/lib/coach";
import { getProfile } from "@/lib/state";

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
    let items = await estimateFood(text, image);
    // learned personal correction, only after 10 corrections so one odd meal doesn't skew it
    const { profile } = await getProfile(user);
    const f = profile.aiFactor ?? 1;
    const applied = (profile.aiFactorN ?? 0) >= 10 && Math.abs(f - 1) >= 0.05 ? f : 1;
    if (applied !== 1)
      items = items.map((i) => ({ ...i, kcal: Math.round(i.kcal * f), protein: Math.round(i.protein * f * 10) / 10, carbs: Math.round(i.carbs * f * 10) / 10, fat: Math.round(i.fat * f * 10) / 10 }));
    if (!items.length) return NextResponse.json({ error: image ? "Fotoğrafta yemek seçemedim. Daha yakından ya da üstten çekmeyi dene." : "Anlayamadım, biraz daha ayrıntı yaz." }, { status: 422 });
    return NextResponse.json({ items, factor: applied });
  } catch (e) {
    const msg = (e as Error).message;
    console.error("estimate", image ? "image" : "text", msg);
    return NextResponse.json({ error: msg.startsWith("Ücretsiz kota") || msg.startsWith("AI anahtarı") ? msg : "Şu an hesaplayamadım, birazdan tekrar dene." }, { status: msg.startsWith("AI anahtarı") ? 503 : 500 });
  }
}
