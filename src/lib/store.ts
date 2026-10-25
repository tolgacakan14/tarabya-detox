// Generic record store. Uses Neon Postgres when DATABASE_URL is set,
// otherwise an in-memory store (local development only).
import { neon } from "@neondatabase/serverless";

export type UserId = "tolga" | "eylul";
export type Kind =
  | "profile"
  | "food"
  | "weight"
  | "steps"
  | "workout"
  | "todo"
  | "chat"
  | "reaction"
  | "measure"
  | "sleep"
  | "water"
  | "cycle"
  | "flag"
  | "avatar";

export interface Rec<T = Record<string, unknown>> {
  id: string;
  user: string;
  kind: Kind;
  date: string; // YYYY-MM-DD (Istanbul)
  data: T;
  created_at: string;
}

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const sql = url ? neon(url) : null;

let ready: Promise<void> | null = null;
function migrate() {
  if (!sql) return Promise.resolve();
  if (!ready) {
    ready = (async () => {
      await sql`CREATE TABLE IF NOT EXISTS records (
        id TEXT PRIMARY KEY,
        "user" TEXT NOT NULL,
        kind TEXT NOT NULL,
        date TEXT NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
      await sql`CREATE INDEX IF NOT EXISTS records_user_kind_date ON records ("user", kind, date)`;
    })();
  }
  return ready;
}

// in-memory fallback
const g = globalThis as unknown as { __mem?: Rec[] };
const mem = (g.__mem ??= []);

export const usingDb = !!sql;

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export async function list<T = Record<string, unknown>>(
  user: string,
  kind: Kind,
  from = "0000-00-00",
  to = "9999-99-99"
): Promise<Rec<T>[]> {
  if (sql) {
    await migrate();
    const rows = await sql`SELECT id, "user", kind, date, data, created_at FROM records
      WHERE "user" = ${user} AND kind = ${kind} AND date >= ${from} AND date <= ${to}
      ORDER BY date ASC, created_at ASC`;
    return rows.map((r) => ({
      ...(r as Rec<T>),
      created_at: new Date(r.created_at as string).toISOString(),
    }));
  }
  return mem
    .filter((r) => r.user === user && r.kind === kind && r.date >= from && r.date <= to)
    .sort((a, b) => (a.date + a.created_at).localeCompare(b.date + b.created_at)) as Rec<T>[];
}

export async function add<T>(user: string, kind: Kind, date: string, data: T): Promise<Rec<T>> {
  const rec: Rec<T> = { id: newId(), user, kind, date, data, created_at: new Date().toISOString() };
  if (sql) {
    await migrate();
    await sql`INSERT INTO records (id, "user", kind, date, data, created_at)
      VALUES (${rec.id}, ${user}, ${kind}, ${date}, ${JSON.stringify(data)}::jsonb, ${rec.created_at})`;
  } else {
    mem.push(rec as Rec);
  }
  return rec;
}

export async function update<T>(user: string, id: string, data: T): Promise<void> {
  if (sql) {
    await migrate();
    await sql`UPDATE records SET data = ${JSON.stringify(data)}::jsonb WHERE id = ${id} AND "user" = ${user}`;
  } else {
    const r = mem.find((x) => x.id === id && x.user === user);
    if (r) r.data = data as Record<string, unknown>;
  }
}

export async function remove(user: string, id: string): Promise<void> {
  if (sql) {
    await migrate();
    await sql`DELETE FROM records WHERE id = ${id} AND "user" = ${user}`;
  } else {
    const i = mem.findIndex((x) => x.id === id && x.user === user);
    if (i >= 0) mem.splice(i, 1);
  }
}

/** Upsert a single record per (user, kind, date). Used for profile, steps, sleep, daily weight. */
export async function setDaily<T>(user: string, kind: Kind, date: string, data: T): Promise<Rec<T>> {
  const existing = await list<T>(user, kind, date, date);
  if (existing.length) {
    await update(user, existing[0].id, data);
    return { ...existing[0], data };
  }
  return add(user, kind, date, data);
}
