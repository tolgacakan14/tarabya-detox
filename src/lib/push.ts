// Web Push: store device subscriptions, send notifications, and decide which reminders are due.
// Rules (HeartSteps / JITAI evidence): only when something is actually missing, at most 2 reminders a day,
// quiet at night, rotate the wording, never guilt.
import webpush from "web-push";
import { add, list, remove, type UserId } from "./store";
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

type Sub = { endpoint: string; keys: { p256dh: string; auth: string }; ua?: string };
export type Payload = { title: string; body: string; url?: string; tag?: string };

export async function saveSubscription(user: UserId, sub: Sub, ua?: string) {
  const existing = await list<Sub>(user, "push", "0000-00-00", "0000-00-00");
  for (const r of existing) if (r.data.endpoint === sub.endpoint) await remove(user, r.id);
  await add<Sub>(user, "push", "0000-00-00", { endpoint: sub.endpoint, keys: sub.keys, ua: ua?.slice(0, 120) });
}

export async function deleteSubscription(user: UserId, endpoint: string) {
  for (const r of await list<Sub>(user, "push", "0000-00-00", "0000-00-00")) if (r.data.endpoint === endpoint) await remove(user, r.id);
}

export async function hasSubscription(user: UserId) {
  return (await list(user, "push", "0000-00-00", "0000-00-00")).length > 0;
}

/** Send to every device of a user; drop subscriptions the push service says are gone. */
export async function sendTo(user: UserId, payload: Payload, type: string) {
  init();
  if (!ready) return 0;
  const subs = await list<Sub>(user, "push", "0000-00-00", "0000-00-00");
  let sent = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.data.endpoint, keys: s.data.keys }, JSON.stringify({ ...payload, web_push: 8030, notification: { title: payload.title, body: payload.body, navigate: payload.url ?? "/app" } }), { TTL: 3600 });
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await remove(user, s.id);
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
export async function tickUser(user: UserId): Promise<string[]> {
  if (!(await hasSubscription(user))) return [];
  const { profile } = await getProfile(user);
  const r = defaultReminders(profile);
  const s = await buildState(user);
  const now = new Date();
  const mins = istHour(now) * 60 + Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Istanbul", minute: "2-digit" }).format(now));
  const quiet = mins >= 3 * 60 && mins < 8 * 60;
  if (quiet) return [];
  const sentToday = (await list<{ type: string }>(user, "notif", calToday(), calToday())).filter((x) => x.data.type !== "test");
  const reminderCount = sentToday.filter((x) => x.data.type !== "partner").length;
  const already = (t: string) => sentToday.some((x) => x.data.type === t);
  if (reminderCount >= 2) return [];
  const seed = now.getDate();
  const due: { type: string; payload: Payload }[] = [];
  const inWindow = (t: string | null | undefined, span = 120) => {
    if (!t) return false;
    const start = hm(t);
    const d = (mins - start + 1440) % 1440;
    return d >= 0 && d < span;
  };

  const me = profile.name;
  const love = user === "tolga" ? "Eylül" : "Tolga";
  const pet = user === "tolga" ? "yakışıklım" : "güzelim";
  if (inWindow(r.weigh) && s.weighedToday === undefined && !already("weigh"))
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
  if (r.meal && inWindow(mealAt, 180) && s.foods.length === 0 && !already("meal"))
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

  if (r.dayEnd && inWindow(r.dayEnd, 90) && s.day.manual && !s.day.pending && !already("dayEnd")) {
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
  for (const d of due.slice(0, 2 - reminderCount)) if (await sendTo(user, d.payload, d.type)) out.push(d.type);
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
