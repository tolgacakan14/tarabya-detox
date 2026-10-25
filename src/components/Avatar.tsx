"use client";
import { useContext, useEffect, useRef, useState } from "react";
import { AppCtx } from "./ui";
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
  tolga: { hi: "#f8d6bb", base: "#e3ad88", lo: "#bf8461", ear: "#d99f7b", blush: "#e58c78" },
  eylul: { hi: "#fff0e6", base: "#f6cbb3", lo: "#dc9d82", ear: "#efbca2", blush: "#ff8f97" },
};

export function MemojiAvatar({ who, mood = "happy", level = 1, size = 160, className = "", bob = true }: Props) {
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
          <stop offset="0%" stopColor="#5a463a" stopOpacity="0.55" />
          <stop offset="35%" stopColor="#3a2c24" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#211813" />
        </linearGradient>
        <linearGradient id={`fr${id}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#5a3420" />
          <stop offset="40%" stopColor="#24130a" />
          <stop offset="70%" stopColor="#6e4226" />
          <stop offset="100%" stopColor="#1c0f08" />
        </linearGradient>
        <radialGradient id={`ir${id}`} cx="45%" cy="40%" r="60%">
          <stop offset="0%" stopColor={who === "tolga" ? "#9a6438" : "#c6e6ea"} />
          <stop offset="70%" stopColor={who === "tolga" ? "#4d2c15" : "#5f97a6"} />
          <stop offset="100%" stopColor={who === "tolga" ? "#22120a" : "#2b5663"} />
        </radialGradient>
        <radialGradient id={`lt${id}`} cx="42%" cy="30%" r="55%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`jaw${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="55%" stopColor={s.lo} stopOpacity="0" />
          <stop offset="100%" stopColor={s.lo} stopOpacity="0.55" />
        </linearGradient>
        <radialGradient id={`gl${id}`} cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
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
          <ellipse cx={x} cy={y} rx="10.5" ry="10" fill="#fffdfb" />
          <ellipse cx={x} cy={y + 6} rx="9" ry="4" fill="#e9d6cc" opacity="0.5" />
          <circle cx={x + 0.4} cy={y + 0.8} r="7.6" fill={`url(#ir${id})`} />
          <circle cx={x + 0.4} cy={y + 0.8} r="7.6" fill="none" stroke="#1a0f0a" strokeOpacity="0.35" strokeWidth="0.9" />
          <circle cx={x + 0.4} cy={y + 0.8} r="3.5" fill="#0d0705" />
          <ellipse cx={x + 3.2} cy={y - 2.4} rx="2.8" ry="2.4" fill="#fff" />
          <circle cx={x - 2.4} cy={y + 3.6} r="1.2" fill="#fff" opacity="0.85" />
          {/* relaxed upper lid in skin tone */}
          <path d={`M${x - 12} ${y - 1} Q${x} ${y - 14} ${x + 12} ${y - 1} L${x + 12} ${y - 17} L${x - 12} ${y - 17} Z`} fill={`url(#sk${id})`} transform={`translate(0 ${lid})`} />
          <path
            d={`M${x - 11} ${y - 1 + lid} Q${x} ${y - 13.6 + lid} ${x + 11} ${y - 1 + lid}`}
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
  // From his photo: short dark tousled waves (short sides), thin round dark-tortoise glasses with a keyhole
  // bridge, thick straight brows, a short full beard that keeps the lips visible, warm olive skin, white tee.
  const s = SKIN.tolga;
  const head = "M100 46 C127 46 146 67 147 99 C148 128 135 153 113 162 C105 165.5 95 165.5 87 162 C65 153 52 128 53 99 C54 67 73 46 100 46 Z";
  return (
    <g>
      {/* white crew-neck tee */}
      <path d="M18 214 C20 186, 52 171, 80 167 L120 167 C148 171, 180 186, 182 214 Z" fill={`url(#tee${id})`} />
      <path d="M80 168 C88 180, 112 180, 120 168" fill="none" stroke="#d6dbd9" strokeWidth="3.4" strokeLinecap="round" />
      {/* neck with beard shadow */}
      <path d="M84 138 L116 138 L118 171 C108 178, 92 178, 82 171 Z" fill={`url(#nk${id})`} />
      <path d="M86 150 C94 156, 106 156, 114 150 L116 162 C106 168, 94 168, 84 162 Z" fill="#3a2b22" opacity="0.25" />

      {/* ears */}
      <ellipse cx="52" cy="104" rx="8" ry="12.5" fill={s.ear} />
      <ellipse cx="148" cy="104" rx="8" ry="12.5" fill={s.ear} />
      <ellipse cx="53" cy="104" rx="3.6" ry="6.5" fill={s.lo} opacity="0.5" />
      <ellipse cx="147" cy="104" rx="3.6" ry="6.5" fill={s.lo} opacity="0.5" />

      {/* head with soft 3D light */}
      <path d={head} fill={`url(#sk${id})`} />
      <path d={head} fill={`url(#lt${id})`} />
      <path d={head} fill={`url(#jaw${id})`} opacity="0.6" />
      <ellipse cx="73" cy="110" rx="10" ry="6" fill={`url(#bl${id})`} />
      <ellipse cx="127" cy="110" rx="10" ry="6" fill={`url(#bl${id})`} />

      {/* short full beard: stubble on the cheeks, denser along the jaw and chin */}
      <path
        d="M57 112 C57 136, 71 155, 90 162 C96 164, 104 164, 110 162 C129 155, 143 136, 143 112 C139 122, 133 127, 125 130 C120 131.5, 115 132.5, 112 135 C110 141, 106 144.5, 100 144.5 C94 144.5, 90 141, 88 135 C85 132.5, 80 131.5, 75 130 C67 127, 61 122, 57 112 Z"
        fill={`url(#bd${id})`}
        opacity="0.8"
      />
      <path d="M57 106 C60 118, 66 124, 74 128 M143 106 C140 118, 134 124, 126 128" stroke="#3b2c24" strokeWidth="6" strokeLinecap="round" opacity="0.12" fill="none" />
      {/* stubble texture */}
      <g fill="#1b1310" opacity="0.18">
        {[[66, 132], [72, 140], [80, 146], [120, 146], [128, 140], [134, 132], [90, 154], [110, 154], [100, 158], [76, 134], [124, 134], [62, 124], [138, 124]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="1.1" />
        ))}
      </g>
      {/* chin patch under the lip */}
      <path d="M94 146 Q100 150 106 146 L104 152 Q100 154 96 152 Z" fill="#241a15" opacity="0.6" />
      {/* mustache, connected to the beard */}
      <path d="M85 131 C90 126, 96 125.5, 100 127.5 C104 125.5, 110 126, 115 131 C111 131.8, 106 130.8, 100 131.6 C94 130.8, 89 131.8, 85 131 Z" fill="#2a1f19" />
      <path d="M85 131 C84 135, 85 138, 88 140 M115 131 C116 135, 115 138, 112 140" stroke="#2a1f19" strokeWidth="2.6" strokeLinecap="round" fill="none" opacity="0.8" />

      <TolgaMouth mood={mood} />

      {/* nose */}
      <path d="M97 98 C96 106, 94.5 112, 95 116" stroke={s.lo} strokeWidth="1.8" fill="none" opacity="0.35" strokeLinecap="round" />
      <ellipse cx="100" cy="116" rx="7.5" ry="5.5" fill={s.lo} opacity="0.32" />
      <ellipse cx="99" cy="113" rx="3.4" ry="2.8" fill="#fff" opacity="0.4" />
      <path d="M93.5 119 Q100 122 106.5 119" stroke={s.lo} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.75" />

      <Eyes id={id} mood={mood} y={101} gap={18.5} />

      {/* thick, fairly straight dark brows */}
      <path d="M69 87 C75 82, 86 81, 94 83.5 C94.5 87, 92.5 88, 90 87.6 C84 86.6, 76 87.4, 71 90.6 C68.5 91.6, 67.5 89, 69 87 Z" fill="#1c1512" />
      <path d="M131 87 C125 82, 114 81, 106 83.5 C105.5 87, 107.5 88, 110 87.6 C116 86.6, 124 87.4, 129 90.6 C131.5 91.6, 132.5 89, 131 87 Z" fill="#1c1512" />

      {/* thin round dark-tortoise frames, keyhole bridge */}
      <g fill="none">
        <rect x="66.5" y="88.5" width="30" height="26" rx="12.5" stroke={`url(#fr${id})`} strokeWidth="3.2" />
        <rect x="103.5" y="88.5" width="30" height="26" rx="12.5" stroke={`url(#fr${id})`} strokeWidth="3.2" />
        <path d="M96.5 97 C98 93.5, 102 93.5, 103.5 97" stroke="#3a2012" strokeWidth="2.4" />
        <path d="M66.5 96 L54 93 M133.5 96 L146 93" stroke="#3a2012" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="68" cy="95" r="1.2" fill="#d9d2c8" />
        <circle cx="132" cy="95" r="1.2" fill="#d9d2c8" />
        <path d="M70 94 Q73 90.5 79 90.5" stroke="#fff" strokeWidth="1.4" opacity="0.5" strokeLinecap="round" />
        <path d="M107 94 Q110 90.5 116 90.5" stroke="#fff" strokeWidth="1.4" opacity="0.5" strokeLinecap="round" />
      </g>

      {/* hair: short tapered sides, tousled waves on top with a loose tuft over the forehead */}
      <path d="M54 100 C50 92, 51 82, 54 74 L60 76 C58 84, 57 92, 58 100 Z" fill="#211915" opacity="0.85" />
      <path d="M146 98 C150 90, 149 80, 146 72 L140 74 C142 82, 143 90, 142 98 Z" fill="#211915" opacity="0.85" />
      <path
        d="M54 80 C50 56, 66 36, 92 31 C104 28, 118 29, 130 35 C146 43, 152 58, 147 78 C144 70, 139 64, 132 62 C128 66, 120 66, 114 62 C108 67, 100 67, 94 62 C88 68, 80 68, 74 64 C66 66, 59 71, 54 80 Z"
        fill={`url(#hr${id})`}
      />
      {/* waves */}
      <g fill={`url(#curl${id})`}>
        <path d="M60 64 C58 48, 70 38, 82 38 C78 46, 76 54, 70 62 Z" />
        <path d="M74 56 C74 40, 88 30, 100 31 C96 40, 92 48, 84 56 Z" />
        <path d="M92 50 C94 36, 108 29, 120 33 C114 40, 110 46, 102 52 Z" />
        <path d="M108 52 C114 40, 128 36, 138 44 C130 46, 124 50, 118 56 Z" />
        <path d="M124 58 C132 50, 144 52, 148 62 C140 60, 134 62, 130 66 Z" />
        {/* loose tuft falling onto the forehead */}
        <path d="M86 58 C94 54, 104 58, 106 68 C102 64, 96 64, 92 70 C92 64, 90 61, 86 58 Z" />
        <path d="M104 60 C110 58, 118 62, 118 70 C114 66, 110 66, 107 68 Z" />
      </g>
      <g fill="none" stroke="#6a5446" strokeWidth="1.8" strokeLinecap="round" opacity="0.45">
        <path d="M70 52 C74 44, 80 40, 86 39" />
        <path d="M96 42 C102 36, 110 34, 116 35" />
        <path d="M120 46 C126 42, 132 42, 136 45" />
      </g>
    </g>
  );
}

function TolgaMouth({ mood }: { mood: Mood }) {
  if (mood === "party" || mood === "proud") {
    const open = mood === "party" ? 9 : 6;
    return (
      <g>
        <path d={`M88 135 Q100 ${135 + open * 1.6} 112 135 Q100 137.5 88 135 Z`} fill="#5c1f1b" />
        <path d={`M90 135.6 Q100 138.6 110 135.6 L109 137.6 Q100 140.4 91 137.6 Z`} fill="#fff" />
        <ellipse cx="100" cy={135 + open * 1.1} rx="5" ry="2.2" fill="#d9706a" />
      </g>
    );
  }
  // his closed, slightly lopsided smile with a visible lower lip
  const lift = mood === "calm" ? 0.5 : 2.5;
  return (
    <g>
      <path d={`M89 ${135} C95 ${137.5} 105 ${137.5} 112 ${134 - lift} C107 ${142} 94 ${142} 89 ${135} Z`} fill="#c07466" />
      <path d={`M89 ${135} C95 ${137.6} 105 ${137.6} 112 ${134 - lift}`} stroke="#6e342c" strokeWidth="1.7" fill="none" strokeLinecap="round" />
      <ellipse cx="101" cy="139.4" rx="5" ry="1.4" fill="#fff" opacity="0.35" />
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
      <path d="M100 52 C125 52 142 72 142 100 C142 124 132 144 116 155 C108 161 92 161 84 155 C68 144 58 124 58 100 C58 72 75 52 100 52 Z" fill={`url(#lt${id})`} />
      <path d="M100 52 C125 52 142 72 142 100 C142 124 132 144 116 155 C108 161 92 161 84 155 C68 144 58 124 58 100 C58 72 75 52 100 52 Z" fill={`url(#jaw${id})`} opacity="0.7" />
      <ellipse cx="77" cy="106" rx="9" ry="5.5" fill="#fff" opacity="0.18" />
      <ellipse cx="123" cy="106" rx="9" ry="5.5" fill="#fff" opacity="0.18" />

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
      <g fill="none" stroke="#8a6252" strokeWidth="2.4" strokeLinecap="round" opacity="0.4">
        <path d="M74 66 C78 52, 88 42, 100 38" />
        <path d="M126 66 C122 52, 112 42, 100 38" />
        <path d="M84 60 C88 50, 94 44, 100 42" opacity="0.6" />
      </g>
      <path d="M60 64 C66 48, 80 38, 92 35" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.12" fill="none" />

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

const MOOD_EMOJI: Record<Mood, string | null> = { calm: null, happy: null, proud: "💪", party: "🎉" };

/** Real profile photo when one is uploaded (exact likeness), otherwise the drawn character. */
let versionsP: Promise<Record<string, number | null>> | null = null;
function usePublicVersions(enabled: boolean) {
  const [v, setV] = useState<Record<string, number | null> | null>(null);
  useEffect(() => {
    if (!enabled) return;
    versionsP = versionsP ?? fetch("/api/avatars").then((r) => r.json()).catch(() => ({}));
    versionsP.then(setV);
  }, [enabled]);
  return v as Record<"tolga" | "eylul", number | undefined> | null;
}

const DANCES = ["dance-sway", "dance-hop", "dance-groove"] as const;

/** Soft, short dances: on every celebration, and now and then on its own (big avatars only). */
function useDance(enabled: boolean, idle: boolean) {
  const [move, setMove] = useState<string | null>(null);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!enabled || typeof window === "undefined" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const play = () => {
      setMove(DANCES[Math.floor(Math.random() * DANCES.length)]);
      if (t.current) clearTimeout(t.current);
      t.current = setTimeout(() => setMove(null), 1900);
    };
    window.addEventListener("ikimiz:dance", play);
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      idleTimer = setTimeout(() => {
        if (document.visibilityState === "visible") play();
        schedule();
      }, 25000 + Math.random() * 35000);
    };
    let hello: ReturnType<typeof setTimeout> | undefined;
    if (idle) {
      hello = setTimeout(play, 1800 + Math.random() * 1500); // a little hello when the screen opens
      schedule();
    }
    return () => {
      window.removeEventListener("ikimiz:dance", play);
      if (idleTimer) clearTimeout(idleTimer);
      if (hello) clearTimeout(hello);
      if (t.current) clearTimeout(t.current);
    };
  }, [enabled, idle]);
  return move;
}

export default function Avatar(props: Props) {
  const { size = 160, bob = true } = props;
  const move = useDance(size >= 56, bob && size >= 80);
  return (
    <span className={`relative inline-block ${move ?? ""}`} style={{ width: size, height: size }}>
      <AvatarInner {...props} />
      {move && (
        <span className="dance-notes" aria-hidden>
          <i>♪</i>
          <i>♫</i>
          <i>✦</i>
        </span>
      )}
    </span>
  );
}

function AvatarInner(props: Props) {
  const { who, mood = "happy", level = 1, size = 160, className = "", bob = true } = props;
  const ctx = useContext(AppCtx);
  const fetched = usePublicVersions(!ctx);
  const known = ctx ? ctx.s.avatars : fetched;
  const ver = known ? known[who] : undefined;
  const [failed, setFailed] = useState(false);
  // no photo (or not known yet): the drawn character
  if (failed || !known || !ver) return <MemojiAvatar {...props} />;
  const ring = who === "tolga" ? "linear-gradient(135deg,#ffd166,#ff4d6d)" : "linear-gradient(135deg,#7be0d0,#3a86ff)";
  const em = MOOD_EMOJI[mood];
  return (
    <span className={`relative inline-block shrink-0 ${bob ? "avatar-bob" : ""} ${className}`} style={{ width: size, height: size }}>
      <span className="absolute inset-0 rounded-full" style={{ background: ring, padding: Math.max(3, size * 0.035) }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/avatar/${who}${ver ? `?v=${ver}` : ""}`}
          alt={who === "tolga" ? "Tolga" : "Eylül"}
          className="w-full h-full rounded-full object-cover bg-white"
          onError={() => setFailed(true)}
          draggable={false}
        />
      </span>
      {level > 1 && (
        <span
          className="absolute grid place-items-center rounded-full font-extrabold text-white"
          style={{ right: 0, bottom: 0, width: size * 0.3, height: size * 0.3, fontSize: size * 0.15, background: "#ff5d73", border: `${Math.max(2, size * 0.025)}px solid #fff` }}
        >
          {level}
        </span>
      )}
      {em && size >= 56 && (
        <span className="absolute" style={{ left: -size * 0.02, top: -size * 0.02, fontSize: size * 0.22 }} aria-hidden>
          {em}
        </span>
      )}
    </span>
  );
}
