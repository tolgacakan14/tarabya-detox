// One consistent line-icon set (1.75 stroke) for navigation and actions.
const P: Record<string, string> = {
  bugun: "M3.5 10.5 12 3.8l8.5 6.7V20a1 1 0 0 1-1 1h-5v-6h-5v6h-5a1 1 0 0 1-1-1z",
  yemek: "M7 3v8m-3-8v4.5A3 3 0 0 0 7 10.5 3 3 0 0 0 10 7.5V3M7 11v10M17 3c-2 1.5-3 4-3 7v3h3v8",
  antrenman: "M2.5 12h2m15 0h2M6.5 7.5v9M17.5 7.5v9M4.5 9.5v5M19.5 9.5v5M6.5 12h11",
  koc: "M5 18.5 3.5 21l.5-4A8 8 0 1 1 7 19.4z",
  yaris: "M8 21h8m-4-4v4M6 4h12v4a6 6 0 0 1-12 0zM6 6H3.5v1.5A3.5 3.5 0 0 0 7 11M18 6h2.5v1.5A3.5 3.5 0 0 1 17 11",
  ilerleme: "M3.5 20.5h17M5 16l4.5-5 3.5 3 6-7.5M15 6.5h4v4",
  plus: "M12 5v14M5 12h14",
  moon: "M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z",
};

export default function Icon({ name, size = 24, className = "" }: { name: keyof typeof P | string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={P[name] ?? P.plus} />
    </svg>
  );
}
