// Web Push: store device subscriptions, send notifications, and decide which reminders are due.
// Rules (HeartSteps / JITAI evidence): only when something is actually missing, at most 2 reminders a day,
// quiet at night, rotate the wording, never guilt.
import webpush from "web-push";
import { add, list, remove, update, type UserId } from "./store";
import { buildState, getProfile } from "./state";
import { istHour, today as calToday } from "./dates";
import type { Profile } from "./profiles";

export const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "BOHq6zidmofBqE0A-tWUvvCa1EYi_n_2DG9HdorhfYmKzssK0YCkwa6yGmp_E-GpN9-qd0eeZTSC59eZk7lfXNs";
const configured = () => !!process.env.VAPID_PRIVATE_KEY;

let ready = false;
function init() {
  if (ready || !configured()) return;
  webpush.setVapidDetails("mailto:tolgacakan@gmail.com", VAPID_PUBLIC, process.env.VAPID_PRIVATE_KEY!);
  ready = true;
}

type Sub = { endpoint: string; keys: { p256dh: string; auth: string }; ua?: string; origin?: string };
const HOME = "https://ikimiz-app.vercel.app";
export type Payload = { title: string; body: string; url?: string; tag?: string };

export async function saveSubscription(user: UserId, sub: Sub, ua?: string, origin?: string) {
  const existing = await list<Sub>(user, "push", "0000-00-00", "0000-00-00");
  const data: Sub = { endpoint: sub.endpoint, keys: sub.keys, ua: ua?.slice(0, 120), origin: origin && /^https:\/\/[a-z0-9.-]+$/.test(origin) ? origin : undefined };
  const matches = existing.filter((r) => r.data.endpoint === sub.endpoint);
  if (matches.length) {
    const previous = matches[0].data;
    if (previous.keys.p256dh !== data.keys.p256dh || previous.keys.auth !== data.keys.auth || previous.ua !== data.ua || previous.origin !== data.origin)
      await update(user, matches[0].id, data);
    for (const duplicate of matches.slice(1)) await remove(user, duplicate.id);
  } else await add<Sub>(user, "push", "0000-00-00", data);
}

export async function deleteSubscription(user: UserId, endpoint: string) {
  for (const r of await list<Sub>(user, "push", "0000-00-00", "0000-00-00")) if (r.data.endpoint === endpoint) await remove(user, r.id);
}

export async function devices(user: UserId) {
  return (await list<Sub>(user, "push", "0000-00-00", "0000-00-00")).map((r) => ({ ua: r.data.ua ?? "", origin: r.data.origin ?? HOME, host: new URL(r.data.endpoint).host }));
}

export async function hasSubscription(user: UserId) {
  return (await list(user, "push", "0000-00-00", "0000-00-00")).length > 0;
}

/** Send to every device of a user; drop subscriptions the push service says are gone. */
export async function sendTo(user: UserId, payload: Payload, type: string, endpoint?: string) {
  init();
  if (!ready) return 0;
  const subs = await list<Sub>(user, "push", "0000-00-00", "0000-00-00");
  let sent = 0;
  for (const s of subs) {
    if (endpoint && s.data.endpoint !== endpoint) continue;
    try {
      await webpush.sendNotification({ endpoint: s.data.endpoint, keys: s.data.keys }, JSON.stringify({ ...payload, web_push: 8030, notification: { title: payload.title, body: payload.body, navigate: new URL(payload.url ?? "/app", s.data.origin ?? HOME).href, tag: payload.tag } }), { TTL: 3600 });
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await remove(user, s.id);
      else console.error("push", user, code, (e as Error).message?.slice(0, 200));
    }
  }
  if (sent) await add(user, "notif", calToday(), { type, at: new Date().toISOString() });
  return sent;
}

const pick = <T,>(arr: T[], seed: number) => arr[seed % arr.length];
const hm = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
};

export function defaultReminders(p: Profile): Required<NonNullable<Profile["reminders"]>> {
  const late = p.id === "tolga"; // sleeps late
  return { weigh: late ? "11:30" : "08:30", meal: true, dayEnd: p.dayMode === "calendar" ? null : late ? "01:30" : "23:30", partner: true, ...(p.reminders ?? {}) } as Required<NonNullable<Profile["reminders"]>>;
}

/** Evaluate reminders for one user right now; called every ~15 minutes by the scheduler. */
export async function tickUser(user: UserId, why?: string[]): Promise<string[]> {
  const note = (m: string) => why?.push(m);
  if (!(await hasSubscription(user))) return note("abonelik yok"), [];
  const { profile } = await getProfile(user);
  const r = defaultReminders(profile);
  const s = await buildState(user);
  const now = new Date();
  const mins = istHour(now) * 60 + Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Istanbul", minute: "2-digit" }).format(now));
  const quiet = mins >= 3 * 60 && mins < 8 * 60;
  if (quiet) return note("sessiz saat"), [];
  const sentToday = (await list<{ type: string }>(user, "notif", calToday(), calToday())).filter((x) => x.data.type !== "test");
  const reminderCount = sentToday.filter((x) => x.data.type !== "partner").length;
  const already = (t: string) => sentToday.some((x) => x.data.type === t);
  if (reminderCount >= 2) return note("bugün 2 hatırlatma gitti"), [];
  const seed = now.getDate();
  const due: { type: string; payload: Payload }[] = [];
  const inWindow = (t: string | null | undefined, span = 120) => {
    if (!t) return false;
    const start = hm(t);
    const d = (mins - start + 1440) % 1440;
    return d >= 0 && d < span;
  };

  const love = user === "tolga" ? "Eylül" : "Tolga";
  const pet = user === "tolga" ? "yakışıklım" : "güzelim";
  // after midnight a manual-day user is still "on yesterday" (pending): judge the morning by the calendar day
  const cal = s.day.calendar;
  const weighed = s.weightLog.some((w) => w.date === cal || (!s.day.pending && w.date === s.today));
  note(`saat ${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, "0")}, gün ${s.today}${s.day.pending ? " (bekleyen)" : ""}, tartı ${weighed ? "var" : "yok"}, öğün ${s.foods.length}`);
  if (inWindow(r.weigh) && !weighed && !already("weigh"))
    due.push({
      type: "weigh",
      payload: {
        title: pick([`Günaydın ${pet} ☀️`, `${love} seni düşünüyor 💛`, "Güne birlikte başlayalım 🌅"], seed),
        body: pick(
          [
            `Tartıya bir çık, sonra kahvaltıya. ${love} da bugün yolunda, ikiniz bir takımsınız 💛`,
            "5 saniyelik tartı, bütün günün planı sana göre ayarlansın. Seninle gurur duyuyorum 🌸",
            `Sabah tartısı hâlâ bekliyor. ${love} ile aynı yoldasınız, adım adım 💞`,
          ],
          seed
        ),
        url: "/app",
        tag: "weigh",
      },
    });

  const mealAt = profile.id === "tolga" ? "14:30" : "13:00";
  if (r.meal && inWindow(mealAt, 180) && !s.day.pending && s.foods.length === 0 && !already("meal"))
    due.push({
      type: "meal",
      payload: {
        title: pick([`${love} merak ediyor: bugün ne yedin? 💛`, `Kendine iyi bak ${pet} 🍽️`, "Bir öğün, bir gülümseme 😋"], seed),
        body: pick(
          [
            "Henüz bir öğün görünmüyor. Tabağının fotoğrafını çek, gerisini ben hesaplarım.",
            user === "tolga" ? "Kas kalorisiz büyümez aşkım. Bir şey ye ve tek dokunuşla ekle 💪" : "Öğün atlamak yok güzelim, açlık birikmesin. Ne yediysen ekle 🌸",
            `Yediğini söyle ya da yaz, 10 saniye. ${love} da bugün kaydediyor 💞`,
          ],
          seed
        ),
        url: "/app",
        tag: "meal",
      },
    });

  // still on yesterday after midnight (pending) is exactly when "close your day" matters; before midnight it's the calendar day
  const dayOpen = s.day.pending || (mins >= 12 * 60 && s.today === cal);
  if (r.dayEnd && inWindow(r.dayEnd, 90) && s.day.manual && dayOpen && !already("dayEnd")) {
    const meals = new Set(s.foods.map((f) => f.meal ?? f.name)).size;
    due.push({
      type: "dayEnd",
      payload: {
        title: pick([`İyi geceler ${pet} 🌙`, "Günü birlikte kapatalım 🌙", `${love} sana iyi geceler diyor 💛`], seed),
        body: meals < 2 ? `Bugün ${meals} öğün görünüyor. Eksik varsa ekle, sonra günü bitir. Yarın yine birlikteyiz 💞` : "Bugün harikaydın. Özetine bak, günü bitir ve güzel uyu 💫",
        url: "/app",
        tag: "dayEnd",
      },
    });
  }

  const out: string[] = [];
  if (!due.length) note("şu an zamanı gelen hatırlatma yok");
  for (const d of due.slice(0, 2 - reminderCount)) {
    const n = await sendTo(user, d.payload, d.type);
    if (n) out.push(d.type);
    else note(`${d.type} gönderilemedi`);
  }
  return out;
}

export const pushConfigured = configured;

/** Run the reminder check for both of us, at most once every 10 minutes (whoever triggers it). */
export async function tickAllThrottled(): Promise<boolean> {
  const marks = await list<{ at: number }>("system", "notif", "0000-00-00", "0000-00-00");
  const last = marks[0];
  if (last && Date.now() - last.data.at < 10 * 60 * 1000) return false;
  if (last) await remove("system", last.id);
  await add("system", "notif", "0000-00-00", { at: Date.now() });
  for (const u of ["tolga", "eylul"] as const) {
    try {
      await tickUser(u);
    } catch (e) {
      console.error("tick", u, (e as Error).message);
    }
  }
  return true;
}
