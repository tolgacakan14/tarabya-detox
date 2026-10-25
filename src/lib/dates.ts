const TZ = "Europe/Istanbul";

export function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

export function nowTime(): string {
  return new Intl.DateTimeFormat("tr-TR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date());
}

export function hourNow(): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false }).format(new Date()));
}

export function addDays(date: string, n: number): string {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 86400000);
}

/** Monday of the week containing date. */
export function weekStart(date: string): string {
  const d = new Date(date + "T12:00:00Z");
  const dow = (d.getUTCDay() + 6) % 7; // 0 = Monday
  return addDays(date, -dow);
}

export function trDay(date: string): string {
  return new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(date + "T12:00:00Z")
  );
}
