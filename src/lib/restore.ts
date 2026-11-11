// Bring back the records from the first Neon database once its monthly compute quota resets.
// Runs at most once a day (one tiny query on the old database) until it succeeds, then never again.
import { neon } from "@neondatabase/serverless";
import { add, list, setDaily, type Kind, type Rec } from "./store";
import { today } from "./dates";

const DAILY = new Set<Kind>(["avatar", "bench", "cycle", "measure", "profile", "sleep", "steps", "weight"]);
const SKIP = new Set(["notif"]); // reminder bookkeeping isn't worth copying

export async function restoreOld(force = false): Promise<{ ok: boolean; copied?: number; reason?: string }> {
  const oldUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!process.env.IKIMIZ2_DATABASE_URL || !oldUrl || oldUrl === process.env.IKIMIZ2_DATABASE_URL) return { ok: false, reason: "eski veritabanı yok" };
  const marks = await list<{ done?: boolean; tried?: string }>("system", "flag", "restore", "restore");
  const mark = marks[0]?.data;
  if (mark?.done) return { ok: true, copied: 0, reason: "zaten taşındı" };
  if (!force && mark?.tried === today()) return { ok: false, reason: "bugün denendi" };
  await setDaily("system", "flag", "restore", { tried: today() });

  let rows: Rec[];
  try {
    rows = (await neon(oldUrl)`SELECT id, "user", kind, date, data, created_at FROM records ORDER BY created_at ASC`) as Rec[];
  } catch (e) {
    return { ok: false, reason: (e as Error).message.slice(0, 120) };
  }
  let copied = 0;
  for (const r of rows) {
    if (SKIP.has(r.kind) || r.user === "system") continue;
    const date = String(r.date);
    if (r.kind === "push") {
      const have = await list<{ endpoint: string }>(r.user, "push", date, date);
      if (have.some((h) => h.data.endpoint === (r.data as { endpoint?: string }).endpoint)) continue;
      await add(r.user, "push", date, r.data);
      copied++;
      continue;
    }
    if (DAILY.has(r.kind)) {
      const have = await list(r.user, r.kind, date, date);
      if (r.kind === "profile" && have.length) {
        // the old profile is the real one (photos, presets, settings); keep what was fixed after the move
        const now = have[0].data as Record<string, unknown>;
        await setDaily(r.user, "profile", date, { ...r.data, onboarded: true, startDate: now.startDate, startWeight: now.startWeight, activeDate: now.activeDate });
        copied++;
        continue;
      }
      if (have.length) continue; // something newer already on that day
      await setDaily(r.user, r.kind, date, r.data);
      copied++;
      continue;
    }
    // everything else: copy unless an identical id is already there
    const have = await list(r.user, r.kind, date, date);
    if (have.some((h) => h.id === r.id)) continue;
    await add(r.user, r.kind, date, r.data);
    copied++;
  }
  await setDaily("system", "flag", "restore", { done: true, tried: today(), copied });
  return { ok: true, copied };
}
