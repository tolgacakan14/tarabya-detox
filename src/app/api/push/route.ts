import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { deleteSubscription, hasSubscription, pushConfigured, saveSubscription, sendTo, VAPID_PUBLIC } from "@/lib/push";

// GET: status + public key. POST: save this device. DELETE: remove it. PUT: send a test notification.
export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Giriş yapılmadı" }, { status: 401 });
  return NextResponse.json({ key: VAPID_PUBLIC, subscribed: await hasSubscription(user), configured: pushConfigured() });
}

export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Giriş yapılmadı" }, { status: 401 });
  const b = (await req.json().catch(() => null)) as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null;
  const ok = b && typeof b.endpoint === "string" && /^https:\/\//.test(b.endpoint) && b.endpoint.length < 1000 && typeof b.keys?.p256dh === "string" && typeof b.keys?.auth === "string";
  if (!ok) return NextResponse.json({ error: "Geçersiz abonelik" }, { status: 400 });
  await saveSubscription(user, { endpoint: b!.endpoint as string, keys: { p256dh: String(b!.keys!.p256dh).slice(0, 200), auth: String(b!.keys!.auth).slice(0, 100) } }, req.headers.get("user-agent") ?? undefined);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Giriş yapılmadı" }, { status: 401 });
  const b = (await req.json().catch(() => null)) as { endpoint?: string } | null;
  if (b?.endpoint) await deleteSubscription(user, b.endpoint);
  return NextResponse.json({ ok: true });
}

export async function PUT() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Giriş yapılmadı" }, { status: 401 });
  if (!pushConfigured()) return NextResponse.json({ error: "Bildirim anahtarı sunucuda henüz tanımlı değil." }, { status: 503 });
  const n = await sendTo(user, { title: "İkimiz 💛", body: "Bildirimler çalışıyor! Sadece eksik bir şey olunca, günde en fazla 2 kez yazacağım.", url: "/app", tag: "test" }, "test");
  return NextResponse.json({ ok: n > 0, sent: n });
}
