import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { FOODS } from "@/lib/foods";

export const maxDuration = 30;

// Turkish speech → text with Groq Whisper (free tier). Food names in the prompt help recognition.
const PROMPT = "Yemek kaydı: " + FOODS.slice(0, 40).map((f) => f.name.replace(/\s*\(.*?\)/g, "")).join(", ");

export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Giriş yapılmadı" }, { status: 401 });
  const key = process.env.GROQ_API_KEY;
  if (!key) return NextResponse.json({ error: "Sesle kayıt için AI anahtarı tanımlı değil, yazarak ekleyebilirsin." }, { status: 503 });
  const form = await req.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof Blob) || audio.size < 800) return NextResponse.json({ error: "Ses alınamadı, tekrar dener misin?" }, { status: 400 });
  if (audio.size > 3_000_000) return NextResponse.json({ error: "Kayıt çok uzun, 30 saniyeden kısa tut." }, { status: 400 });
  const type = audio.type || "audio/webm";
  const ext = type.includes("mp4") || type.includes("m4a") || type.includes("aac") ? "m4a" : type.includes("ogg") ? "ogg" : type.includes("wav") ? "wav" : "webm";
  const out = new FormData();
  out.append("file", new File([audio], `ses.${ext}`, { type }));
  out.append("model", process.env.GROQ_STT_MODEL || "whisper-large-v3-turbo");
  out.append("language", "tr");
  out.append("prompt", PROMPT.slice(0, 600));
  out.append("response_format", "json");
  const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: out });
  if (!r.ok) {
    console.error("voice", r.status, (await r.text()).slice(0, 300));
    return NextResponse.json({ error: r.status === 429 ? "Ücretsiz kota şu an dolu, birazdan tekrar dene." : "Sesi anlayamadım, yazarak dener misin?" }, { status: 502 });
  }
  const j = (await r.json()) as { text?: string };
  const text = (j.text ?? "").trim().slice(0, 400);
  if (!text) return NextResponse.json({ error: "Bir şey duyamadım, tekrar dener misin?" }, { status: 422 });
  return NextResponse.json({ text });
}
