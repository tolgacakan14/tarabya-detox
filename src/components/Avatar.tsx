"use client";
// Illustrated portrait avatars of Tolga and Eylül (face + shoulders in a round frame), drawn in SVG.
// Expression follows today's completion; a level badge sits on the frame.
// Faces/bodies never change with weight: rewards are about effort.

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

export default function Avatar({ who, mood = "happy", level = 1, size = 160, className = "", bob = true }: Props) {
  const id = `${who}-${mood}-${size}`;
  const tint = who === "tolga" ? "#f3dfb8" : "#cde9e2";
  const ring = who === "tolga" ? "#d99a1e" : "#2e9c8a";
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
        <clipPath id={`clip-${id}`}>
          <circle cx="100" cy="100" r="94" />
        </clipPath>
        <radialGradient id={`bg-${id}`} cx="50%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="100%" stopColor={tint} />
        </radialGradient>
        <radialGradient id={`skin-${id}`} cx="45%" cy="38%" r="70%">
          <stop offset="0%" stopColor={who === "tolga" ? "#f4cfae" : "#fbe3d4"} />
          <stop offset="65%" stopColor={who === "tolga" ? "#e6b38f" : "#f2c6ae"} />
          <stop offset="100%" stopColor={who === "tolga" ? "#c98d68" : "#dea084"} />
        </radialGradient>
        <linearGradient id={`neck-${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={who === "tolga" ? "#b9805d" : "#d39a80"} />
          <stop offset="45%" stopColor={who === "tolga" ? "#d9a27f" : "#efc0a7"} />
        </linearGradient>
        <linearGradient id={`hair-${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={who === "tolga" ? "#3b302a" : "#5a3a2c"} />
          <stop offset="100%" stopColor={who === "tolga" ? "#15110f" : "#25150f"} />
        </linearGradient>
        <linearGradient id={`beard-${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#3a2e27" />
          <stop offset="100%" stopColor="#1c1512" />
        </linearGradient>
        <linearGradient id={`frame-${id}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#5a3420" />
          <stop offset="50%" stopColor="#8c5a34" />
          <stop offset="100%" stopColor="#3b2214" />
        </linearGradient>
        <radialGradient id={`iris-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={who === "tolga" ? "#7a4d2e" : "#a3a46a"} />
          <stop offset="70%" stopColor={who === "tolga" ? "#4a2b18" : "#6b7546"} />
          <stop offset="100%" stopColor={who === "tolga" ? "#2a170c" : "#3e4528"} />
        </radialGradient>
      </defs>

      <circle cx="100" cy="100" r="96" fill={ring} opacity="0.9" />
      <circle cx="100" cy="100" r="94" fill={`url(#bg-${id})`} />

      <g clipPath={`url(#clip-${id})`}>
        {mood === "party" && <Sparkles />}
        {who === "tolga" ? <Tolga id={id} mood={mood} /> : <Eylul id={id} mood={mood} />}
      </g>

      {level > 1 && (
        <g>
          <circle cx="163" cy="163" r="17" fill={ring} stroke="#fff" strokeWidth="3" />
          <text x="163" y="169" textAnchor="middle" fontSize="17" fontWeight="700" fill="#fff" fontFamily="system-ui, sans-serif">
            {level}
          </text>
        </g>
      )}
    </svg>
  );
}

/* ---------------- shared bits ---------------- */

function Eye({ cx, cy, id, mood, lashes }: { cx: number; cy: number; id: string; mood: Mood; lashes?: boolean }) {
  if (mood === "party") {
    // happy closed eyes
    return <path d={`M${cx - 8} ${cy + 1} Q${cx} ${cy - 6} ${cx + 8} ${cy + 1}`} stroke="#2a1a12" strokeWidth="2.6" fill="none" strokeLinecap="round" />;
  }
  const sq = mood === "proud" || mood === "happy" ? 0.6 : 0;
  const shape = `M${cx - 10} ${cy} Q${cx - 1} ${cy - 9.5} ${cx + 10} ${cy - 0.5} Q${cx} ${cy + 7 - sq} ${cx - 10} ${cy} Z`;
  return (
    <g>
      <path d={shape} fill="#fbf7f3" />
      <clipPath id={`eye-${id}-${cx}`}>
        <path d={shape} />
      </clipPath>
      <g clipPath={`url(#eye-${id}-${cx})`}>
        <circle cx={cx + 0.3} cy={cy - 1} r="5.6" fill={`url(#iris-${id})`} />
        <circle cx={cx + 0.3} cy={cy - 1} r="2.5" fill="#120a06" />
        <circle cx={cx + 2.2} cy={cy - 3} r="1.5" fill="#fff" />
        <circle cx={cx - 1.6} cy={cy + 1.2} r="0.7" fill="#fff" opacity="0.7" />
        {/* lid shadow on the eyeball */}
        <path d={`M${cx - 10} ${cy} Q${cx - 1} ${cy - 9.5} ${cx + 10} ${cy - 0.5} L${cx + 10} ${cy - 3} Q${cx - 1} ${cy - 11} ${cx - 10} ${cy - 2.5} Z`} fill="#000" opacity="0.12" />
      </g>
      {/* upper lid line */}
      <path d={`M${cx - 10.5} ${cy + 0.4} Q${cx - 1} ${cy - 10.4} ${cx + 10.5} ${cy - 0.6}`} stroke="#24150e" strokeWidth={lashes ? 2.6 : 1.8} fill="none" strokeLinecap="round" />
      {lashes && <path d={`M${cx + (cx > 100 ? 10 : -10)} ${cy - 0.5} q${cx > 100 ? 2.4 : -2.4} -1 ${cx > 100 ? 4 : -4} -3.4`} stroke="#24150e" strokeWidth="2" fill="none" strokeLinecap="round" />}
      {/* crease */}
      <path d={`M${cx - 8} ${cy - 7} Q${cx} ${cy - 12.5} ${cx + 9} ${cy - 6.5}`} stroke="#a8735a" strokeWidth="0.9" fill="none" opacity="0.55" />
      {/* lower lid */}
      <path d={`M${cx - 8} ${cy + 2.6 - sq} Q${cx} ${cy + 6.4 - sq} ${cx + 8.5} ${cy + 1.8 - sq}`} stroke="#b07f68" strokeWidth="0.9" fill="none" opacity="0.6" />
    </g>
  );
}

function Sparkles() {
  const pts = [
    [30, 50, "#f2c14e"], [168, 44, "#7fc8b8"], [24, 120, "#e8907e"], [176, 118, "#f2c14e"],
  ] as const;
  return (
    <g className="avatar-confetti">
      {pts.map(([x, y, c], i) => (
        <path key={i} d={`M${x} ${y - 6} L${x + 2} ${y - 2} L${x + 6} ${y} L${x + 2} ${y + 2} L${x} ${y + 6} L${x - 2} ${y + 2} L${x - 6} ${y} L${x - 2} ${y - 2} Z`} fill={c} />
      ))}
    </g>
  );
}

/* ---------------- Tolga ---------------- */

function Tolga({ id, mood }: { id: string; mood: Mood }) {
  return (
    <g>
      {/* white crew-neck tee */}
      <path d="M22 210 C26 186, 52 176, 78 172 L122 172 C148 176, 174 186, 178 210 Z" fill="#fbfbfa" />
      <path d="M22 210 C26 186, 52 176, 78 172 L84 174 C64 180, 44 192, 40 210 Z" fill="#e4e7e6" />
      {/* neck */}
      <path d="M84 140 L116 140 L118 176 C108 184, 92 184, 82 176 Z" fill={`url(#neck-${id})`} />
      <path d="M80 174 C90 182, 110 182, 120 174" stroke="#d9dddb" strokeWidth="3" fill="none" />

      {/* ears */}
      <ellipse cx="53" cy="106" rx="7" ry="12" fill="#dda27e" />
      <ellipse cx="147" cy="106" rx="7" ry="12" fill="#dda27e" />
      <path d="M52 100 q3 6 0 12" stroke="#b97b58" strokeWidth="1.4" fill="none" />
      <path d="M148 100 q-3 6 0 12" stroke="#b97b58" strokeWidth="1.4" fill="none" />

      {/* face */}
      <path d="M100 52 C128 52 146 72 146 101 C146 128 134 149 116 158 C110 161 90 161 84 158 C66 149 54 128 54 101 C54 72 72 52 100 52 Z" fill={`url(#skin-${id})`} />
      {/* soft side shading */}
      <path d="M134 80 C146 96 146 120 136 140 C142 120 142 100 134 80 Z" fill="#b9805d" opacity="0.25" />

      {/* cheek stubble + boxed beard + mustache */}
      {/* light stubble on the cheeks */}
      <path d="M56 106 C58 124, 66 134, 76 137 L74 126 C66 122, 60 116, 56 106 Z M144 106 C142 124, 134 134, 124 137 L126 126 C134 122, 140 116, 144 106 Z" fill="#3a2e27" opacity="0.16" />
      {/* sideburns */}
      <path d="M53 84 L58 84 C58 96, 58 104, 58 112 L55 112 Z M147 84 L142 84 C142 96, 142 104, 142 112 L145 112 Z" fill="#241b17" />
      {/* boxed beard along the jaw, below the lip line */}
      <path
        d="M56 110 C57 136, 71 156, 89 162 C95 164, 105 164, 111 162 C129 156, 143 136, 144 110 C141 123, 135 131, 127 135 C121 138, 117 139, 114 141 C110 143, 90 143, 86 141 C83 139, 79 138, 73 135 C65 131, 59 123, 56 110 Z"
        fill={`url(#beard-${id})`}
      />
      {/* beard texture */}
      <g stroke="#4b3c33" strokeWidth="0.9" opacity="0.6" strokeLinecap="round">
        <path d="M70 140 l2 5" /><path d="M78 146 l1 5" /><path d="M88 151 l1 5" /><path d="M100 153 l0 5" />
        <path d="M112 151 l-1 5" /><path d="M122 146 l-1 5" /><path d="M130 140 l-2 5" />
      </g>
      <path d="M84 129 C90 124, 97 125, 100 127 C103 125, 110 124, 116 129 C112 131, 106 130, 100 131 C94 130, 88 131, 84 129 Z" fill="#2a201b" />

      {/* mouth */}
      <TolgaMouth mood={mood} />

      {/* nose */}
      <path d="M98 100 C97 108, 94 115, 95 119" stroke="#c18560" strokeWidth="1.4" fill="none" opacity="0.7" />
      <path d="M93 119 C96 123, 104 123, 107 119" stroke="#a96d4c" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <ellipse cx="100" cy="117" rx="5" ry="3.2" fill="#f2c4a0" opacity="0.5" />

      {/* eyes */}
      <Eye cx={80} cy={101} id={id} mood={mood} />
      <Eye cx={120} cy={101} id={id} mood={mood} />

      {/* thick brows */}
      <path d="M66 90 C72 84, 84 82, 92 86 L91 90 C84 87, 74 88, 67 93 Z" fill="#1f1714" />
      <path d="M134 90 C128 84, 116 82, 108 86 L109 90 C116 87, 126 88, 133 93 Z" fill="#1f1714" />

      {/* tortoiseshell round glasses */}
      <g fill="none">
        <rect x="64" y="88" width="32" height="27" rx="13" stroke={`url(#frame-${id})`} strokeWidth="3.4" />
        <rect x="104" y="88" width="32" height="27" rx="13" stroke={`url(#frame-${id})`} strokeWidth="3.4" />
        <path d="M96 97 Q100 93 104 97" stroke="#5a3420" strokeWidth="2.6" />
        <path d="M64 96 L54 94 M136 96 L146 94" stroke="#4a2b18" strokeWidth="2.4" />
        <path d="M68 93 Q72 90 78 90" stroke="#fff" strokeWidth="1.4" opacity="0.6" strokeLinecap="round" />
        <path d="M108 93 Q112 90 118 90" stroke="#fff" strokeWidth="1.4" opacity="0.6" strokeLinecap="round" />
      </g>

      {/* voluminous curly hair: one soft silhouette with a wavy edge, shorter on the sides */}
      <path
        d="M53 96 C49 82, 49 66, 55 57 C50 46, 59 36, 68 38 C66 27, 79 19, 89 26 C93 15, 109 15, 113 26 C123 19, 136 27, 133 38 C142 36, 151 46, 145 57 C151 66, 151 82, 147 96 C145 86, 141 79, 135 75 C124 69, 112 71, 100 70 C88 71, 76 69, 65 75 C59 79, 55 86, 53 96 Z"
        fill={`url(#hair-${id})`}
      />
      {/* soft curl texture: irregular arcs, low contrast */}
      <g fill="none" stroke="#7a6252" strokeWidth="1.2" strokeLinecap="round" opacity="0.35">
        {[
          [64, 52, 1], [80, 36, -1], [97, 28, 1], [114, 32, -1], [128, 42, 1], [140, 56, -1], [72, 64, -1], [90, 48, 1], [106, 44, -1], [120, 54, 1], [132, 66, -1],
        ].map(([x, y, f], i) => (
          <path key={i} d={`M${x - 5} ${y + 2} q${3 * f + 3} -7 ${10} -2`} />
        ))}
      </g>
      <g fill="none" stroke="#000" strokeWidth="1.1" strokeLinecap="round" opacity="0.28">
        {[
          [72, 46], [88, 38], [104, 36], [120, 44], [84, 58], [100, 56], [114, 64], [66, 70],
        ].map(([x, y], i) => (
          <path key={i} d={`M${x - 4} ${y + 3} q4 -6 9 -1`} />
        ))}
      </g>
      {/* top highlight */}
      <path d="M78 34 C90 24, 112 24, 124 34" stroke="#8c7464" strokeWidth="3" fill="none" opacity="0.25" strokeLinecap="round" />
      {/* hairline shadow */}
      <path d="M62 76 C76 70, 90 72, 100 71 C110 72, 124 70, 138 76" stroke="#8a5a3e" strokeWidth="2" fill="none" opacity="0.25" />
    </g>
  );
}

function TolgaMouth({ mood }: { mood: Mood }) {
  if (mood === "party") {
    return (
      <g>
        <path d="M88 133 Q100 146 112 133 Q100 137 88 133 Z" fill="#6d2a24" />
        <path d="M90 133.5 Q100 137 110 133.5 L109 135.5 Q100 138 91 135.5 Z" fill="#fff" />
      </g>
    );
  }
  const lift = mood === "calm" ? 0.5 : mood === "happy" ? 2 : 3;
  return (
    <g>
      {/* lower lip */}
      <path d={`M91 ${134.5} Q100 ${141} 110 ${134 - lift * 0.3} Q100 ${137} 91 ${134.5} Z`} fill="#c98274" />
      {/* lip line with a slight one-sided smile */}
      <path d={`M88 ${133.5 - lift * 0.3} Q99 ${136.5} 113 ${132.5 - lift}`} stroke="#874a40" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </g>
  );
}

/* ---------------- Eylül ---------------- */

function Eylul({ id, mood }: { id: string; mood: Mood }) {
  return (
    <g>
      {/* long hair behind */}
      <path d="M100 30 C58 30, 40 62, 40 102 C40 140, 34 176, 30 210 L170 210 C166 176, 160 140, 160 102 C160 62, 142 30, 100 30 Z" fill={`url(#hair-${id})`} />

      {/* shoulders + black strappy top */}
      <path d="M30 210 C34 188, 58 178, 80 174 L120 174 C142 178, 166 188, 170 210 Z" fill="#f2c6ae" />
      <path d="M56 210 C60 196, 74 190, 100 190 C126 190, 140 196, 144 210 Z" fill="#1d1b20" />
      <path d="M72 192 L76 176 M128 192 L124 176" stroke="#1d1b20" strokeWidth="2.6" />
      {/* neck */}
      <path d="M86 140 L114 140 L116 176 C108 182, 92 182, 84 176 Z" fill={`url(#neck-${id})`} />
      {/* heart necklace */}
      <path d="M86 168 C92 182, 108 182, 114 168" stroke="#d7b062" strokeWidth="1.1" fill="none" />
      <path d="M100 185 c-2.4-3.4-7-1-4.4 2.6 l4.4 4.2 l4.4-4.2 c2.6-3.6-2-6-4.4-2.6z" fill="#e3bd65" stroke="#b8902e" strokeWidth="0.6" />

      {/* face */}
      <path d="M100 58 C124 58 139 78 139 105 C139 130 127 149 110 158 C104 161 96 161 90 158 C73 149 61 130 61 105 C61 78 76 58 100 58 Z" fill={`url(#skin-${id})`} />
      <path d="M128 86 C139 102 139 122 130 140 C135 122 135 104 128 86 Z" fill="#d9967b" opacity="0.22" />

      {/* blush */}
      <ellipse cx="76" cy="121" rx="9.5" ry="5.5" fill="#f08e8a" opacity="0.4" />
      <ellipse cx="124" cy="121" rx="9.5" ry="5.5" fill="#f08e8a" opacity="0.4" />

      {/* nose */}
      <path d="M99 104 C98 111, 96 116, 97 119" stroke="#d4977c" strokeWidth="1.2" fill="none" opacity="0.7" />
      <path d="M95 119.5 C98 122, 102 122, 105 119.5" stroke="#c88468" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <ellipse cx="100" cy="117" rx="4.2" ry="2.6" fill="#fde8dc" opacity="0.6" />

      <EylulMouth mood={mood} />

      {/* eyes */}
      <Eye cx={83} cy={104} id={id} mood={mood} lashes />
      <Eye cx={117} cy={104} id={id} mood={mood} lashes />

      {/* brows */}
      <path d="M70 92 C76 87, 86 86, 93 89 L92 91.5 C86 89.5, 77 90, 71 94 Z" fill="#3d2519" />
      <path d="M130 92 C124 87, 114 86, 107 89 L108 91.5 C114 89.5, 123 90, 129 94 Z" fill="#3d2519" />

      {/* front hair: middle part, framing the face and falling past the shoulders */}
      <path d="M100 38 C74 38, 54 56, 52 86 C50 116, 54 150, 48 210 L38 210 C40 160, 38 120, 42 88 C46 52, 70 32, 100 32 Z" fill={`url(#hair-${id})`} />
      <path d="M100 38 C126 38, 146 56, 148 86 C150 116, 146 150, 152 210 L162 210 C160 160, 162 120, 158 88 C154 52, 130 32, 100 32 Z" fill={`url(#hair-${id})`} />
      <path d="M100 40 C84 42, 68 54, 62 74 C58 88, 58 104, 56 124 C62 100, 66 82, 78 66 C86 56, 94 50, 100 48 Z" fill={`url(#hair-${id})`} />
      <path d="M100 40 C116 42, 132 54, 138 74 C142 88, 142 104, 144 124 C138 100, 134 82, 122 66 C114 56, 106 50, 100 48 Z" fill={`url(#hair-${id})`} />
      {/* center part */}
      <path d="M100 33 L100 48" stroke="#120a07" strokeWidth="1.2" opacity="0.55" />
      {/* hair shine */}
      <path d="M84 44 C70 52, 62 66, 58 84" stroke="#8a6250" strokeWidth="1.6" fill="none" opacity="0.55" strokeLinecap="round" />
      <path d="M116 44 C130 52, 138 66, 142 84" stroke="#8a6250" strokeWidth="1.6" fill="none" opacity="0.55" strokeLinecap="round" />
    </g>
  );
}

function EylulMouth({ mood }: { mood: Mood }) {
  if (mood === "party") {
    return (
      <g>
        <path d="M86 132 Q100 148 114 132 Q100 135 86 132 Z" fill="#8a3434" />
        <path d="M88 132.6 Q100 135.6 112 132.6 L111 135 Q100 138 89 135 Z" fill="#fff" />
        <path d="M86 132 Q93 129 100 131 Q107 129 114 132" stroke="#d27477" strokeWidth="1.6" fill="none" />
      </g>
    );
  }
  // her signature wide, closed-lip smile
  const w = mood === "calm" ? 12 : 16;
  const up = mood === "calm" ? 2 : mood === "happy" ? 5 : 6;
  return (
    <g>
      {/* upper lip with a soft cupid's bow */}
      <path
        d={`M${100 - w} ${133 - up} C${100 - w * 0.7} ${130 - up * 0.3}, ${100 - w * 0.35} ${128.4}, 97 ${129} Q100 ${130.6} 103 ${129} C${100 + w * 0.35} ${128.4}, ${100 + w * 0.7} ${130 - up * 0.3}, ${100 + w} ${133 - up} Q100 ${137.5} ${100 - w} ${133 - up} Z`}
        fill="#cf6f73"
      />
      {/* full lower lip */}
      <path d={`M${100 - w + 2} ${134 - up * 0.7} C${100 - w * 0.5} ${144}, ${100 + w * 0.5} ${144}, ${100 + w - 2} ${134 - up * 0.7} Q100 ${138.2} ${100 - w + 2} ${134 - up * 0.7} Z`} fill="#e48a8b" />
      <path d={`M${100 - w} ${133 - up} Q100 ${138.4} ${100 + w} ${133 - up}`} stroke="#9c454b" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M95 141 Q100 142.4 105 141" stroke="#fff" strokeWidth="1.2" opacity="0.45" strokeLinecap="round" />
      {/* smile corners */}
      <path d={`M${100 - w - 1.5} ${131.5 - up} q-1 1.5 0.5 3`} stroke="#c98a7a" strokeWidth="1" fill="none" opacity="0.7" />
      <path d={`M${100 + w + 1.5} ${131.5 - up} q1 1.5 -0.5 3`} stroke="#c98a7a" strokeWidth="1" fill="none" opacity="0.7" />
    </g>
  );
}
