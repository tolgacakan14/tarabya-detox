import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import type { UserId } from "./store";

const COOKIE = "ikimiz_who";
const secret = () => {
  const s = process.env.SESSION_SECRET;
  if (!s && process.env.VERCEL) throw new Error("SESSION_SECRET missing"); // never sign with a public default in production
  return s || "dev-secret-change-me";
};

function sign(v: string) {
  return createHmac("sha256", secret()).update(v).digest("base64url");
}

export async function setSession(user: UserId) {
  const c = await cookies();
  c.set(COOKIE, `${user}.${sign(user)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

export async function getSession(): Promise<UserId | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [user, sig, extra] = raw.split(".");
  if (extra !== undefined) return null;
  if (user !== "tolga" && user !== "eylul") return null;
  const a = Buffer.from(sig ?? "");
  const b = Buffer.from(sign(user));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return user;
}

export function isUser(v: unknown): v is UserId {
  return v === "tolga" || v === "eylul";
}
