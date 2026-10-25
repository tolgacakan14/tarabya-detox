"use client";
// Stylized, soft-3D chibi characters of Tolga and Eylül, drawn in SVG.
// Mood follows today's completion; accessories unlock with level.
// Body shape never changes with weight: rewards are about effort.

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
  level?: number; // 1..6
  size?: number;
  className?: string;
  bob?: boolean;
}

export default function Avatar({ who, mood = "happy", level = 1, size = 160, className = "", bob = true }: Props) {
  const id = `${who}-${mood}`;
  return (
    <svg
      viewBox="0 0 200 240"
      width={size}
      height={(size * 240) / 200}
      className={`${bob ? "avatar-bob" : ""} ${className}`}
      role="img"
      aria-label={`${who === "tolga" ? "Tolga" : "Eylül"} karakteri, ${{ calm: "sakin", happy: "mutlu", proud: "gururlu", party: "kutluyor" }[mood]}`}
    >
      <defs>
        <radialGradient id={`skin-${id}`} cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor={who === "tolga" ? "#f7d0ad" : "#fbe0cf"} />
          <stop offset="70%" stopColor={who === "tolga" ? "#e7b08a" : "#f1c3aa"} />
          <stop offset="100%" stopColor={who === "tolga" ? "#cf926b" : "#dfa48a"} />
        </radialGradient>
        <radialGradient id={`hair-${id}`} cx="40%" cy="25%" r="80%">
          <stop offset="0%" stopColor={who === "tolga" ? "#3a312c" : "#55362a"} />
          <stop offset="100%" stopColor={who === "tolga" ? "#141110" : "#23140f"} />
        </radialGradient>
        <linearGradient id={`top-${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={who === "tolga" ? "#ffffff" : "#2c2a30"} />
          <stop offset="100%" stopColor={who === "tolga" ? "#d6dbd9" : "#121114"} />
        </linearGradient>
        <radialGradient id={`floor-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* floor shadow */}
      <ellipse cx="100" cy="230" rx="62" ry="8" fill={`url(#floor-${id})`} />

      {mood === "party" && <Confetti />}

      {/* back hair (Eylül long hair falls behind the body) */}
      {who === "eylul" && (
        <path d="M24 96 C20 32, 180 32, 176 96 L178 200 C164 210, 142 208, 132 200 L68 200 C58 208, 36 210, 22 200 Z" fill={`url(#hair-${id})`} />
      )}

      {/* body */}
      <Body who={who} id={id} mood={mood} />

      {/* neck */}
      <path d="M88 136 L112 136 L110 152 L90 152 Z" fill={`url(#skin-${id})`} />

      {/* head */}
      <g>
        {/* ears */}
        {who === "tolga" && (
          <>
            <ellipse cx="32" cy="104" rx="8" ry="11" fill={`url(#skin-${id})`} />
            <ellipse cx="168" cy="104" rx="8" ry="11" fill={`url(#skin-${id})`} />
          </>
        )}
        <path d="M30 96 C30 46, 170 46, 170 96 C170 140, 140 150, 100 150 C60 150, 30 140, 30 96 Z" fill={`url(#skin-${id})`} transform="translate(0 2) scale(1 1)" />
        {who === "tolga" ? <TolgaFace id={id} mood={mood} /> : <EylulFace id={id} mood={mood} />}
      </g>

      <Accessory who={who} level={level} />
    </svg>
  );
}

function Body({ who, id, mood }: { who: "tolga" | "eylul"; id: string; mood: Mood }) {
  const armUp = mood === "party";
  const flex = mood === "proud";
  const skin = `url(#skin-${id})`;
  return (
    <g>
      {/* torso */}
      {who === "tolga" ? (
        <path d="M58 166 C58 150, 78 146, 100 146 C122 146, 142 150, 142 166 L146 222 C120 228, 80 228, 54 222 Z" fill={`url(#top-${id})`} stroke="#c9cfcd" strokeWidth="1" />
      ) : (
        <>
          <path d="M66 162 C66 150, 82 148, 100 148 C118 148, 134 150, 134 162 L138 222 C116 228, 84 228, 62 222 Z" fill={skin} />
          <path d="M66 176 C80 170, 120 170, 134 176 L138 222 C116 228, 84 228, 62 222 Z" fill={`url(#top-${id})`} />
          <path d="M76 176 L80 150 M124 176 L120 150" stroke="#1a1a1d" strokeWidth="2.2" />
          {/* heart necklace */}
          <path d="M84 152 C90 166, 110 166, 116 152" fill="none" stroke="#d8b25a" strokeWidth="1.2" />
          <path d="M100 168 c-3-4-8-1-5 3 l5 5 l5-5 c3-4-2-7-5-3z" fill="#e2bf63" />
        </>
      )}

      {/* left arm (viewer's left) */}
      {armUp ? (
        <path d={who === "tolga" ? "M60 168 C44 150, 36 128, 40 110" : "M68 168 C52 150, 44 128, 48 110"} stroke={who === "tolga" ? "#f1f1ef" : skin} strokeWidth="18" strokeLinecap="round" fill="none" />
      ) : (
        <path d={who === "tolga" ? "M60 168 C50 186, 48 202, 52 214" : "M68 168 C58 186, 56 202, 60 214"} stroke={who === "tolga" ? "#f1f1ef" : skin} strokeWidth="17" strokeLinecap="round" fill="none" />
      )}
      {armUp && <circle cx={who === "tolga" ? 40 : 48} cy="106" r="10" fill={skin} />}
      {!armUp && <circle cx={who === "tolga" ? 52 : 60} cy="216" r="9" fill={skin} />}

      {/* right arm: flex when proud, up when party */}
      {armUp ? (
        <>
          <path d={who === "tolga" ? "M140 168 C156 150, 164 128, 160 110" : "M132 168 C148 150, 156 128, 152 110"} stroke={who === "tolga" ? "#f1f1ef" : skin} strokeWidth="18" strokeLinecap="round" fill="none" />
          <circle cx={who === "tolga" ? 160 : 152} cy="106" r="10" fill={skin} />
        </>
      ) : flex ? (
        <>
          <path d={who === "tolga" ? "M140 168 C158 170, 168 162, 170 146" : "M132 168 C150 170, 160 162, 162 146"} stroke={who === "tolga" ? "#f1f1ef" : skin} strokeWidth="18" strokeLinecap="round" fill="none" />
          <ellipse cx={who === "tolga" ? 158 : 150} cy="166" rx="9" ry="7" fill={skin} opacity="0.95" />
          <circle cx={who === "tolga" ? 170 : 162} cy="140" r="10" fill={skin} />
        </>
      ) : (
        <>
          <path d={who === "tolga" ? "M140 168 C150 186, 152 202, 148 214" : "M132 168 C142 186, 144 202, 140 214"} stroke={who === "tolga" ? "#f1f1ef" : skin} strokeWidth="17" strokeLinecap="round" fill="none" />
          <circle cx={who === "tolga" ? 148 : 140} cy="216" r="9" fill={skin} />
        </>
      )}
    </g>
  );
}

function Eyes({ mood, iris, lashes }: { mood: Mood; iris: string; lashes?: boolean }) {
  const happyClosed = mood === "party";
  if (happyClosed) {
    return (
      <g stroke="#2a1d17" strokeWidth="3.2" fill="none" strokeLinecap="round">
        <path d="M66 104 Q76 94 86 104" />
        <path d="M114 104 Q124 94 134 104" />
      </g>
    );
  }
  return (
    <g className="avatar-blink">
      {[76, 124].map((cx) => (
        <g key={cx}>
          <ellipse cx={cx} cy="104" rx="9" ry={mood === "calm" ? 8 : 10} fill="#fff" />
          <circle cx={cx + 1} cy="105" r="6.2" fill={iris} />
          <circle cx={cx + 1} cy="105" r="3.2" fill="#1b120e" />
          <circle cx={cx + 3.5} cy="102" r="2" fill="#fff" />
          {lashes && <path d={`M${cx - 10} 98 Q${cx} 90 ${cx + 11} 97`} stroke="#1b120e" strokeWidth="2.6" fill="none" strokeLinecap="round" />}
        </g>
      ))}
    </g>
  );
}

function Mouth({ mood, lip }: { mood: Mood; lip: string }) {
  if (mood === "calm") return <path d="M90 128 Q100 133 110 127" stroke={lip} strokeWidth="3" fill="none" strokeLinecap="round" />;
  if (mood === "happy") return <path d="M86 125 Q100 138 114 124" stroke={lip} strokeWidth="3.2" fill="none" strokeLinecap="round" />;
  return (
    <g>
      <path d="M84 123 Q100 146 116 123 Z" fill="#7a2b2b" />
      <path d="M90 125 Q100 130 110 125 L110 127 Q100 132 90 127 Z" fill="#fff" />
      <path d="M92 138 Q100 142 108 138" fill="#e07a7a" />
    </g>
  );
}

function TolgaFace({ id, mood }: { id: string; mood: Mood }) {
  return (
    <g>
      {/* beard */}
      {/* short boxed beard along the jaw, stubble on cheeks */}
      <path d="M36 112 C38 140, 66 156, 100 157 C134 156, 162 140, 164 112 C158 128, 146 136, 132 138 C120 140, 112 136, 100 136 C88 136, 80 140, 68 138 C54 136, 42 128, 36 112 Z" fill="#2b2420" opacity="0.92" />
      <path d="M84 123 C90 118, 110 118, 116 123 C110 121, 90 121, 84 123 Z" fill="#2b2420" />
      <Mouth mood={mood} lip="#b0605a" />
      {/* nose */}
      <path d="M98 108 Q94 118 101 119" stroke="#c4855f" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <Eyes mood={mood} iris="#5b3a26" />
      {/* brows */}
      <path d="M62 86 Q76 79 90 86" stroke="#1d1715" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M110 86 Q124 79 138 86" stroke="#1d1715" strokeWidth="5" fill="none" strokeLinecap="round" />
      {/* tortoiseshell round glasses */}
      <g fill="none" stroke="#4a2c1b" strokeWidth="4">
        <rect x="58" y="88" width="38" height="32" rx="14" />
        <rect x="104" y="88" width="38" height="32" rx="14" />
        <path d="M96 100 Q100 96 104 100" />
        <path d="M58 98 L46 96 M142 98 L154 96" strokeWidth="3" />
      </g>
      <g fill="none" stroke="#8a5a36" strokeWidth="1.4" opacity="0.8">
        <rect x="60" y="90" width="34" height="28" rx="12" />
        <rect x="106" y="90" width="34" height="28" rx="12" />
      </g>
      <path d="M64 94 L72 92" stroke="#fff" strokeWidth="2" opacity="0.7" strokeLinecap="round" />
      <path d="M110 94 L118 92" stroke="#fff" strokeWidth="2" opacity="0.7" strokeLinecap="round" />
      {/* curly hair */}
      <g fill={`url(#hair-${id})`}>
        {[
          [52, 74, 16], [68, 58, 18], [88, 50, 19], [110, 50, 19], [130, 56, 18], [148, 72, 16],
          [60, 66, 14], [78, 48, 13], [100, 44, 15], [122, 46, 13], [140, 62, 14],
          [44, 88, 10], [156, 88, 10],
        ].map(([cx, cy, r], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} />
        ))}
      </g>
      <g fill="none" stroke="#4b403a" strokeWidth="1.6" opacity="0.7">
        <path d="M80 52 q6 -6 12 0" />
        <path d="M104 46 q6 -6 12 0" />
        <path d="M126 54 q6 -6 12 0" />
        <path d="M62 64 q6 -6 12 0" />
      </g>
      {/* cheek warmth */}
      <ellipse cx="62" cy="122" rx="7" ry="4" fill="#e07a6a" opacity="0.18" />
      <ellipse cx="138" cy="122" rx="7" ry="4" fill="#e07a6a" opacity="0.18" />
    </g>
  );
}

function EylulFace({ id, mood }: { id: string; mood: Mood }) {
  return (
    <g>
      {/* rosy cheeks */}
      <ellipse cx="60" cy="122" rx="12" ry="8" fill="#f08c8c" opacity="0.45" />
      <ellipse cx="140" cy="122" rx="12" ry="8" fill="#f08c8c" opacity="0.45" />
      <Mouth mood={mood} lip="#c9676c" />
      <path d="M98 110 Q95 118 101 119" stroke="#d99a82" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <Eyes mood={mood} iris="#6f7a4a" lashes />
      {/* brows */}
      <path d="M62 86 Q76 80 90 85" stroke="#3a2219" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <path d="M110 85 Q124 80 138 86" stroke="#3a2219" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      {/* hair cap */}
      <path d="M32 100 C28 38, 172 38, 168 100 C156 72, 128 58, 100 58 C72 58, 44 72, 32 100 Z" fill={`url(#hair-${id})`} />
      {/* front hair: middle part, straight strands framing the face */}
      <path d="M100 44 C66 42, 30 58, 26 100 C24 130, 28 156, 34 176 C44 146, 46 112, 60 86 C72 64, 92 56, 100 52 Z" fill={`url(#hair-${id})`} />
      <path d="M100 44 C134 42, 170 58, 174 100 C176 130, 172 156, 166 176 C156 146, 154 112, 140 86 C128 64, 108 56, 100 52 Z" fill={`url(#hair-${id})`} />
      <path d="M84 54 C66 64, 54 90, 50 130" stroke="#6b4637" strokeWidth="1.6" fill="none" opacity="0.6" />
      <path d="M118 54 C136 64, 148 90, 152 130" stroke="#6b4637" strokeWidth="1.6" fill="none" opacity="0.6" />
    </g>
  );
}

function Accessory({ who, level }: { who: "tolga" | "eylul"; level: number }) {
  const color = who === "tolga" ? "#d99a1e" : "#2e9c8a";
  return (
    <g>
      {level >= 2 && (
        // sweatband
        <path d={who === "tolga" ? "M42 80 C70 64, 130 64, 158 80 L156 90 C130 76, 70 76, 44 90 Z" : "M44 76 C70 60, 130 60, 156 76 L154 86 C130 72, 70 72, 46 86 Z"} fill={color} opacity="0.95" />
      )}
      {level >= 3 && (
        // medal
        <g>
          <path d="M90 150 L100 176 L110 150" stroke={color} strokeWidth="5" fill="none" />
          <circle cx="100" cy="184" r="10" fill="#e9c35c" stroke="#b8902e" strokeWidth="2" />
          <path d="M100 178 l2 4 4 .5 -3 3 .8 4 -3.8-2 -3.8 2 .8-4 -3-3 4-.5z" fill="#fff6d6" />
        </g>
      )}
      {level >= 5 && (
        // crown
        <path d={who === "tolga" ? "M72 40 L80 22 L92 36 L100 18 L108 36 L120 22 L128 40 Z" : "M74 38 L82 20 L94 34 L100 16 L106 34 L118 20 L126 38 Z"} fill="#f0c94a" stroke="#b8902e" strokeWidth="2" strokeLinejoin="round" />
      )}
    </g>
  );
}

function Confetti() {
  const bits = [
    [20, 40, "#d99a1e", 0], [180, 30, "#2e9c8a", 1], [30, 150, "#e07a7a", 2], [175, 140, "#5b8bd9", 0],
    [10, 90, "#2e9c8a", 1], [190, 90, "#d99a1e", 2], [60, 18, "#5b8bd9", 1], [140, 14, "#e07a7a", 0],
  ] as const;
  return (
    <g className="avatar-confetti">
      {bits.map(([x, y, c, r], i) => (
        <rect key={i} x={x} y={y} width="8" height="4" rx="1" fill={c} transform={`rotate(${r * 35 + 15} ${x} ${y})`} />
      ))}
    </g>
  );
}
