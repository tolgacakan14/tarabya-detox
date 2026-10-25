"use client";
// Memoji-style soft-3D portraits of Tolga and Eylül in a round, colourful frame (SVG).
// Volume comes from gradients, not outlines. Expression follows today's completion;
// a level badge sits on the frame. Faces/bodies never change with weight: rewards are about effort.

export type Mood = "calm" | "happy" | "proud" | "party";

export function moodFor(completion: number): Mood {
  if (completion >= 0.99) return "party";
  if (completion >= 0.6) return "proud";
  if (completion >= 0.25) return "happy";
  return "calm";
}

interface Props {
  who: "tolga" | "eylul";
  mood?: Mood;
  level?: number;
  size?: number;
  className?: string;
  bob?: boolean;
}

const SKIN = {
  tolga: { hi: "#ffdcc0", base: "#ecb48d", lo: "#c98861", ear: "#e3a57f", blush: "#ef8f78" },
  eylul: { hi: "#fff0e6", base: "#f6cbb3", lo: "#dc9d82", ear: "#efbca2", blush: "#ff8f97" },
};

export default function Avatar({ who, mood = "happy", level = 1, size = 160, className = "", bob = true }: Props) {
  const id = `${who}${mood}${size}`.replace(/\W/g, "");
  const s = SKIN[who];
  const bg = who === "tolga" ? ["#ffd166", "#ff9f1c"] : ["#7be0d0", "#2ec4b6"];
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={`${bob ? "avatar-bob" : ""} ${className}`}
      role="img"
      aria-label={`${who === "tolga" ? "Tolga" : "Eylül"}, ${{ calm: "sakin", happy: "mutlu", proud: "gururlu", party: "kutluyor" }[mood]}`}
    >
      <defs>
        <clipPath id={`c${id}`}>
          <circle cx="100" cy="100" r="96" />
        </clipPath>
        <radialGradient id={`bg${id}`} cx="35%" cy="25%" r="85%">
          <stop offset="0%" stopColor={bg[0]} />
          <stop offset="100%" stopColor={bg[1]} />
        </radialGradient>
        <radialGradient id={`sk${id}`} gradientUnits="userSpaceOnUse" cx="90" cy="84" r="72">
          <stop offset="0%" stopColor={s.hi} />
          <stop offset="55%" stopColor={s.base} />
          <stop offset="100%" stopColor={s.lo} />
        </radialGradient>
        <linearGradient id={`nk${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={s.lo} />
          <stop offset="60%" stopColor={s.base} />
        </linearGradient>
        <radialGradient id={`bl${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={s.blush} stopOpacity="0.55" />
          <stop offset="100%" stopColor={s.blush} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`hr${id}`} cx="38%" cy="22%" r="85%">
          <stop offset="0%" stopColor={who === "tolga" ? "#5a4a40" : "#5a3a2e"} />
          <stop offset="45%" stopColor={who === "tolga" ? "#2a211c" : "#2c1913"} />
          <stop offset="100%" stopColor={who === "tolga" ? "#120d0b" : "#120a07"} />
        </radialGradient>
        <radialGradient id={`curl${id}`} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#5b4b41" />
          <stop offset="60%" stopColor="#261d18" />
          <stop offset="100%" stopColor="#100c0a" />
        </radialGradient>
        <linearGradient id={`bd${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#4a3b33" />
          <stop offset="100%" stopColor="#241b17" />
        </linearGradient>
        <linearGradient id={`fr${id}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#8a5530" />
          <stop offset="40%" stopColor="#4a2814" />
          <stop offset="70%" stopColor="#a7693a" />
          <stop offset="100%" stopColor="#3a1e0f" />
        </linearGradient>
        <radialGradient id={`ir${id}`} cx="45%" cy="40%" r="60%">
          <stop offset="0%" stopColor={who === "tolga" ? "#9a6438" : "#c6e6ea"} />
          <stop offset="70%" stopColor={who === "tolga" ? "#4d2c15" : "#5f97a6"} />
          <stop offset="100%" stopColor={who === "tolga" ? "#22120a" : "#2b5663"} />
        </radialGradient>
        <linearGradient id={`tee${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={who === "tolga" ? "#ffffff" : "#f7f2ea"} />
          <stop offset="100%" stopColor={who === "tolga" ? "#dfe4e3" : "#d9cfc1"} />
        </linearGradient>
      </defs>

      <circle cx="100" cy="100" r="99" fill="#fff" />
      <circle cx="100" cy="100" r="96" fill={`url(#bg${id})`} />
      <g clipPath={`url(#c${id})`}>
        <circle cx="38" cy="40" r="26" fill="#fff" opacity="0.18" />
        <circle cx="170" cy="150" r="34" fill="#fff" opacity="0.12" />
        {mood === "party" && <Sparkles />}
        {who === "tolga" ? <Tolga id={id} mood={mood} /> : <Eylul id={id} mood={mood} />}
      </g>

      {level > 1 && (
        <g>
          <circle cx="166" cy="166" r="18" fill="#ff5d73" stroke="#fff" strokeWidth="4" />
          <text x="166" y="172.5" textAnchor="middle" fontSize="18" fontWeight="800" fill="#fff" fontFamily="system-ui, sans-serif">
            {level}
          </text>
        </g>
      )}
    </svg>
  );
}

/* ---------------- shared features ---------------- */

function Eyes({ id, mood, y, gap, lashes }: { id: string; mood: Mood; y: number; gap: number; lashes?: boolean }) {
  const xs = [100 - gap, 100 + gap];
  if (mood === "party") {
    return (
      <g stroke="#2b1a12" strokeWidth="3.4" fill="none" strokeLinecap="round">
        {xs.map((x) => (
          <path key={x} d={`M${x - 8} ${y + 2} Q${x} ${y - 7} ${x + 8} ${y + 2}`} />
        ))}
      </g>
    );
  }
  const lid = mood === "calm" ? 3.2 : 2;
  return (
    <g>
      {xs.map((x) => (
        <g key={x}>
          <ellipse cx={x} cy={y} rx="9.5" ry="9" fill="#fffdfb" />
          <circle cx={x + 0.5} cy={y + 0.6} r="6.6" fill={`url(#ir${id})`} />
          <circle cx={x + 0.5} cy={y + 0.6} r="3.1" fill="#110905" />
          <circle cx={x + 2.8} cy={y - 2.2} r="2.4" fill="#fff" />
          <circle cx={x - 2} cy={y + 3} r="1" fill="#fff" opacity="0.8" />
          {/* relaxed upper lid in skin tone */}
          <path d={`M${x - 11} ${y - 1} Q${x} ${y - 13} ${x + 11} ${y - 1} L${x + 11} ${y - 16} L${x - 11} ${y - 16} Z`} fill={`url(#sk${id})`} transform={`translate(0 ${lid})`} />
          <path
            d={`M${x - 10} ${y - 1 + lid} Q${x} ${y - 12.6 + lid} ${x + 10} ${y - 1 + lid}`}
            stroke="#2b1a12"
            strokeWidth={lashes ? 2.8 : 1.6}
            fill="none"
            strokeLinecap="round"
          />
          {lashes && (
            <path
              d={x > 100 ? `M${x + 9.5} ${y - 1.5 + lid} q3 -0.6 4.6 -3.8` : `M${x - 9.5} ${y - 1.5 + lid} q-3 -0.6 -4.6 -3.8`}
              stroke="#2b1a12"
              strokeWidth="2.2"
              fill="none"
              strokeLinecap="round"
            />
          )}
        </g>
      ))}
    </g>
  );
}

function Sparkles() {
  const pts = [
    [32, 58, "#fff"], [168, 46, "#fff"], [26, 128, "#ffe680"], [176, 116, "#fff"], [60, 24, "#ffe680"],
  ] as const;
  return (
    <g className="avatar-confetti">
      {pts.map(([x, y, c], i) => (
        <path key={i} d={`M${x} ${y - 7} Q${x + 1} ${y - 1} ${x + 7} ${y} Q${x + 1} ${y + 1} ${x} ${y + 7} Q${x - 1} ${y + 1} ${x - 7} ${y} Q${x - 1} ${y - 1} ${x} ${y - 7} Z`} fill={c} />
      ))}
    </g>
  );
}

/* ---------------- Tolga ---------------- */

function Tolga({ id, mood }: { id: string; mood: Mood }) {
  const s = SKIN.tolga;
  return (
    <g>
      {/* white tee */}
      <path d="M20 214 C22 184, 54 170, 80 166 L120 166 C146 170, 178 184, 180 214 Z" fill={`url(#tee${id})`} />
      <path d="M78 167 C88 178, 112 178, 122 167" fill="none" stroke="#cfd5d3" strokeWidth="3" />
      {/* neck */}
      <path d="M83 134 L117 134 L119 170 C108 178, 92 178, 81 170 Z" fill={`url(#nk${id})`} />

      {/* ears */}
      <ellipse cx="49" cy="104" rx="9" ry="13" fill={s.ear} />
      <ellipse cx="151" cy="104" rx="9" ry="13" fill={s.ear} />
      <ellipse cx="50" cy="104" rx="4" ry="7" fill={s.lo} opacity="0.5" />
      <ellipse cx="150" cy="104" rx="4" ry="7" fill={s.lo} opacity="0.5" />

      {/* head */}
      <path d="M100 48 C130 48 150 70 150 102 C150 132 134 154 112 160 C104 162 96 162 88 160 C66 154 50 132 50 102 C50 70 70 48 100 48 Z" fill={`url(#sk${id})`} />

      {/* blush */}
      <ellipse cx="70" cy="122" rx="12" ry="8" fill={`url(#bl${id})`} />
      <ellipse cx="130" cy="122" rx="12" ry="8" fill={`url(#bl${id})`} />

      {/* beard: one smooth volume along the jaw + mustache */}
      <path
        d="M54 112 C55 140, 72 160, 92 165 C97 166, 103 166, 108 165 C128 160, 145 140, 146 112 C143 126, 136 134, 127 138 C120 141, 114 142, 110 143 C105 145, 95 145, 90 143 C86 142, 80 141, 73 138 C64 134, 57 126, 54 112 Z"
        fill={`url(#bd${id})`}
      />
      <path d="M84 128 C90 124.5, 96 124.5, 100 126.5 C104 124.5, 110 124.5, 116 128 C110 129.8, 105 129.2, 100 129.8 C95 129.2, 90 129.8, 84 128 Z" fill="#30251f" />

      <TolgaMouth mood={mood} />

      {/* nose: soft volume, no outlines */}
      <ellipse cx="100" cy="114" rx="7" ry="5.5" fill={s.lo} opacity="0.35" />
      <ellipse cx="99" cy="111" rx="3.5" ry="3" fill="#fff" opacity="0.35" />
      <path d="M94 117 Q100 120 106 117" stroke={s.lo} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7" />

      <Eyes id={id} mood={mood} y={100} gap={20} />

      {/* thick soft brows */}
      <path d="M68 84 C74 78, 86 77, 93 81 C93 85, 91 86, 88 85 C82 83, 74 84, 70 88 C67 89, 66 86, 68 84 Z" fill="#1d1613" />
      <path d="M132 84 C126 78, 114 77, 107 81 C107 85, 109 86, 112 85 C118 83, 126 84, 130 88 C133 89, 134 86, 132 84 Z" fill="#1d1613" />

      {/* glossy tortoiseshell round glasses */}
      <g fill="none">
        <rect x="64" y="86" width="33" height="29" rx="14" stroke={`url(#fr${id})`} strokeWidth="4.2" />
        <rect x="103" y="86" width="33" height="29" rx="14" stroke={`url(#fr${id})`} strokeWidth="4.2" />
        <path d="M97 96 Q100 92.5 103 96" stroke="#5b331b" strokeWidth="3" />
        <path d="M64 95 L51 92 M136 95 L149 92" stroke="#4a2814" strokeWidth="3" strokeLinecap="round" />
        <path d="M68 92 Q72 88 79 88" stroke="#fff" strokeWidth="1.6" opacity="0.55" strokeLinecap="round" />
        <path d="M107 92 Q111 88 118 88" stroke="#fff" strokeWidth="1.6" opacity="0.55" strokeLinecap="round" />
      </g>
      <path d="M70 110 L84 92 M109 110 L123 92" stroke="#fff" strokeWidth="3" opacity="0.12" strokeLinecap="round" />

      {/* curly hair: dense soft 3D curls over a base volume, shorter on the sides */}
      <path d="M50 98 C46 64, 64 36, 100 34 C136 36, 154 64, 150 98 C148 86, 142 78, 134 74 C122 69, 110 71, 100 70 C90 71, 78 69, 66 74 C58 78, 52 86, 50 98 Z" fill={`url(#hr${id})`} />
      <g>
        {[
          [56, 74, 10], [62, 60, 11], [72, 48, 12], [86, 40, 12.5], [100, 36, 13], [114, 40, 12.5], [128, 48, 12], [138, 60, 11], [144, 74, 10],
          [68, 70, 10], [80, 58, 11], [94, 50, 11.5], [108, 50, 11.5], [121, 58, 11], [132, 70, 10],
          [86, 66, 9], [100, 62, 9.5], [114, 66, 9], [53, 88, 7], [147, 88, 7],
        ].map(([cx, cy, r], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill={`url(#curl${id})`} />
        ))}
      </g>
      <ellipse cx="88" cy="40" rx="18" ry="6" fill="#fff" opacity="0.08" transform="rotate(-14 88 40)" />
    </g>
  );
}

function TolgaMouth({ mood }: { mood: Mood }) {
  if (mood === "party" || mood === "proud") {
    const open = mood === "party" ? 10 : 7;
    return (
      <g>
        <path d={`M86 133 Q100 ${133 + open * 1.6} 114 133 Q100 136 86 133 Z`} fill="#5c1f1b" />
        <path d={`M88 133.6 Q100 137 112 133.6 L111 ${135.6} Q100 139 89 ${135.6} Z`} fill="#fff" />
        <ellipse cx="100" cy={133 + open * 1.1} rx="6" ry="2.6" fill="#e2706a" />
      </g>
    );
  }
  const lift = mood === "calm" ? 1 : 3;
  return (
    <g>
      <path d={`M87 ${133.5} Q100 ${141} 114 ${133 - lift} Q100 ${137} 87 ${133.5} Z`} fill="#c97a6c" />
      <path d={`M87 ${133.5} Q99 ${136.6} 114 ${133 - lift}`} stroke="#7d3f35" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </g>
  );
}

/* ---------------- Eylül ---------------- */

function Eylul({ id, mood }: { id: string; mood: Mood }) {
  const s = SKIN.eylul;
  return (
    <g>
      {/* long dark hair falling behind the shoulders */}
      <path d="M100 26 C56 26, 34 60, 37 106 C40 148, 32 184, 28 214 L172 214 C168 184, 160 148, 163 106 C166 60, 144 26, 100 26 Z" fill={`url(#hr${id})`} />

      {/* cream fluffy sweater */}
      <path d="M22 214 C26 184, 56 170, 82 166 L118 166 C144 170, 174 184, 178 214 Z" fill={`url(#tee${id})`} />
      <path d="M80 168 C88 181, 112 181, 120 168" fill="none" stroke="#cbbfae" strokeWidth="3" strokeLinecap="round" />
      <g fill="#fff" opacity="0.5">
        {[[46, 196], [60, 188], [72, 202], [132, 194], [146, 204], [156, 190], [100, 200], [118, 206], [86, 196]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="1.6" />
        ))}
      </g>
      {/* neck */}
      <path d="M85 134 L115 134 L117 170 C108 176, 92 176, 83 170 Z" fill={`url(#nk${id})`} />

      {/* a lock of hair falling over the shoulder (viewer's left) */}
      <path d="M50 104 C44 140, 48 172, 66 214 L50 214 C36 176, 34 138, 40 104 Z" fill={`url(#hr${id})`} />

      {/* ears with gold hoops (hair is pulled back) */}
      <ellipse cx="57" cy="106" rx="7" ry="11" fill={s.base} />
      <ellipse cx="143" cy="106" rx="7" ry="11" fill={s.base} />
      <ellipse cx="57.5" cy="106" rx="3" ry="6" fill={s.lo} opacity="0.45" />
      <ellipse cx="142.5" cy="106" rx="3" ry="6" fill={s.lo} opacity="0.45" />
      <circle cx="56" cy="121" r="5.5" fill="none" stroke="#d8a83c" strokeWidth="2.6" />
      <circle cx="144" cy="121" r="5.5" fill="none" stroke="#d8a83c" strokeWidth="2.6" />
      <path d="M52 118 a5.5 5.5 0 0 1 4 -2.4" stroke="#fff3c4" strokeWidth="1.2" fill="none" />

      {/* head */}
      <path d="M100 52 C125 52 142 72 142 100 C142 124 132 144 116 155 C108 161 92 161 84 155 C68 144 58 124 58 100 C58 72 75 52 100 52 Z" fill={`url(#sk${id})`} />

      {/* rosy cheeks + light freckles */}
      <ellipse cx="73" cy="119" rx="13" ry="8.5" fill={`url(#bl${id})`} />
      <ellipse cx="127" cy="119" rx="13" ry="8.5" fill={`url(#bl${id})`} />
      <g fill="#b9735a" opacity="0.28">
        {[[86, 112], [90, 116], [94, 111.5], [106, 111.5], [110, 116], [114, 112], [81, 117], [119, 117], [97, 108], [103, 108]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="0.9" />
        ))}
      </g>

      {/* straight nose */}
      <path d="M98 96 C97.5 104, 96.5 110, 96.5 113" stroke={s.lo} strokeWidth="1.6" fill="none" opacity="0.35" strokeLinecap="round" />
      <ellipse cx="100" cy="114" rx="5.5" ry="4.2" fill={s.lo} opacity="0.28" />
      <ellipse cx="99.6" cy="111.6" rx="2.4" ry="2.2" fill="#fff" opacity="0.55" />
      <path d="M95.5 117 Q100 119.4 104.5 117" stroke={s.lo} strokeWidth="1.7" fill="none" strokeLinecap="round" opacity="0.75" />

      <EylulMouth mood={mood} />

      <Eyes id={id} mood={mood} y={100} gap={18} lashes />

      {/* defined, arched dark brows */}
      <path d="M69 88 C74 80.5, 85 78.5, 93 82.5 C93.5 86, 91.5 87, 89 86.4 C84 84.8, 77 85.4, 72.5 90 C70 91.4, 68 90, 69 88 Z" fill="#2a1710" />
      <path d="M131 88 C126 80.5, 115 78.5, 107 82.5 C106.5 86, 108.5 87, 111 86.4 C116 84.8, 123 85.4, 127.5 90 C130 91.4, 132 90, 131 88 Z" fill="#2a1710" />

      {/* hair swept back from the forehead (no bangs), glossy */}
      <path d="M53 104 C49 60, 72 30, 100 29 C128 30, 151 60, 147 104 C145 88, 141 76, 133 68 C123 60, 111 57, 100 57 C89 57, 77 60, 67 68 C59 76, 55 88, 53 104 Z" fill={`url(#hr${id})`} />
      <g fill="none" stroke="#7a5446" strokeWidth="2.2" strokeLinecap="round" opacity="0.35">
        <path d="M74 66 C78 52, 88 42, 100 38" />
        <path d="M126 66 C122 52, 112 42, 100 38" />
      </g>

      {/* sunglasses resting on top of the head */}
      <g transform="rotate(-3 100 40)">
        <rect x="66" y="33" width="29" height="15" rx="7" fill="#17151b" />
        <rect x="105" y="33" width="29" height="15" rx="7" fill="#17151b" />
        <path d="M95 39 Q100 36 105 39" stroke="#17151b" strokeWidth="3" fill="none" />
        <path d="M70 37 L80 36" stroke="#fff" strokeWidth="1.6" opacity="0.5" strokeLinecap="round" />
        <path d="M109 37 L119 36" stroke="#fff" strokeWidth="1.6" opacity="0.5" strokeLinecap="round" />
        <path d="M66 40 L56 46 M134 40 L144 46" stroke="#17151b" strokeWidth="2.4" strokeLinecap="round" />
      </g>
    </g>
  );
}

function EylulMouth({ mood }: { mood: Mood }) {
  if (mood === "party" || mood === "proud") {
    const open = mood === "party" ? 11 : 8;
    return (
      <g>
        <path d={`M83 130 Q100 ${130 + open * 1.7} 117 130 Q100 133.5 83 130 Z`} fill="#7a2730" />
        <path d={`M85.5 130.8 Q100 134.5 114.5 130.8 L113.5 133.4 Q100 137.2 86.5 133.4 Z`} fill="#fff" />
        <ellipse cx="100" cy={130 + open * 1.2} rx="7" ry="3" fill="#f07c86" />
        <path d="M83 130 Q91 126.6 100 128.6 Q109 126.6 117 130" stroke="#d96a75" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      </g>
    );
  }
  // her signature wide, closed-lip smile
  const w = mood === "calm" ? 12 : 16;
  const up = mood === "calm" ? 2 : 5.5;
  return (
    <g>
      <path d={`M${100 - w} ${131 - up} C${100 - w * 0.6} ${128.5 - up * 0.3}, 97 127, 100 128.4 C103 127, ${100 + w * 0.6} ${128.5 - up * 0.3}, ${100 + w} ${131 - up} Q100 135.6 ${100 - w} ${131 - up} Z`} fill="#cf7476" />
      <path d={`M${100 - w + 2.5} ${132 - up * 0.7} C${100 - w * 0.5} 142.5, ${100 + w * 0.5} 142.5, ${100 + w - 2.5} ${132 - up * 0.7} Q100 136.2 ${100 - w + 2.5} ${132 - up * 0.7} Z`} fill="#e6999a" />
      <path d={`M${100 - w} ${131 - up} Q100 136.4 ${100 + w} ${131 - up}`} stroke="#9e3d4b" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <ellipse cx="100" cy="139" rx="5" ry="1.6" fill="#fff" opacity="0.45" />
    </g>
  );
}
