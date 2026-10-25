"use client";
// Tiny animated demos: a soft figure moving between the start and end position of each movement pattern.
// Side view facing right (front view for lateral raises). Pure SVG + SMIL path morphing.
import { useEffect, useState } from "react";
import type { Pattern } from "@/lib/training";

type P = [number, number];
type Pose = { h: P; n: P; s: P; e: P; w: P; e2: P; w2: P; p: P; k: P; a: P; t: P; k2: P; a2: P; t2: P };

const STAND: Pose = { h: [100, 20], n: [100, 32], s: [100, 36], e: [100, 56], w: [100, 74], e2: [100, 56], w2: [100, 74], p: [100, 74], k: [100, 100], a: [100, 124], t: [112, 126], k2: [100, 100], a2: [100, 124], t2: [112, 126] };
const pose = (o: Partial<Pose>, base: Pose = STAND): Pose => ({ ...base, ...o, e2: o.e2 ?? o.e ?? base.e2, w2: o.w2 ?? o.w ?? base.w2, k2: o.k2 ?? o.k ?? base.k2, a2: o.a2 ?? o.a ?? base.a2, t2: o.t2 ?? o.t ?? base.t2 });

const LIE: Pose = pose({ h: [40, 116], n: [52, 116], s: [52, 116], e: [64, 124], w: [78, 126], p: [100, 120], k: [124, 96], a: [138, 124], t: [148, 126] });
const PLANK: Pose = pose({ h: [146, 88], n: [132, 94], s: [132, 94], e: [132, 110], w: [132, 126], p: [88, 106], k: [64, 114], a: [40, 122], t: [36, 128] });
const BENT: Pose = pose({ h: [138, 48], n: [126, 54], s: [124, 56], e: [124, 76], w: [124, 96], p: [96, 74], k: [104, 100], a: [100, 124], t: [112, 126] });
const FRONT: Pose = pose({ e: [90, 56], w: [88, 74], e2: [110, 56], w2: [112, 74], k: [94, 100], a: [92, 124], t: [86, 126], k2: [106, 100], a2: [108, 124], t2: [114, 126] });

const POSES: Record<string, [Pose, Pose]> = {
  squat: [pose({ e: [114, 44], w: [128, 40] }), pose({ h: [112, 48], n: [108, 58], s: [108, 62], e: [122, 62], w: [138, 58], p: [82, 92], k: [112, 96], a: [104, 124], t: [116, 126] })],
  single_leg: [STAND, pose({ h: [100, 44], n: [100, 56], s: [100, 60], e: [100, 78], w: [100, 94], p: [100, 94], k: [124, 98], a: [124, 124], t: [136, 126], k2: [86, 120], a2: [64, 122], t2: [56, 126] })],
  hinge: [pose({ e: [102, 56], w: [104, 76] }), pose({ h: [142, 50], n: [130, 54], s: [128, 56], e: [128, 76], w: [128, 94], p: [94, 72], k: [102, 100], a: [100, 124] })],
  glute_bridge: [LIE, pose({ p: [100, 98], k: [126, 92], n: [52, 114], s: [52, 114] }, LIE)],
  hamstring_curl: [pose({ p: [100, 102] }, LIE), pose({ p: [100, 104], k: [138, 108], a: [168, 122], t: [178, 124] }, LIE)],
  push_horizontal: [PLANK, pose({ h: [146, 106], n: [132, 112], s: [132, 112], e: [116, 116], w: [132, 126], p: [88, 116], k: [64, 120] }, PLANK)],
  push_vertical: [pose({ e: [114, 44], w: [110, 30] }), pose({ e: [106, 18], w: [104, 4] })],
  pull_horizontal: [BENT, pose({ e: [106, 62], w: [118, 78] }, BENT)],
  rear_delt: [BENT, pose({ e: [112, 44], w: [100, 38] }, BENT)],
  lateral_raise: [FRONT, pose({ e: [82, 40], w: [64, 38], e2: [118, 40], w2: [136, 38] }, FRONT)],
  biceps: [pose({ e: [102, 56], w: [104, 76] }), pose({ e: [102, 56], w: [114, 40] })],
  triceps: [pose({ e: [106, 14], w: [96, 30] }), pose({ e: [106, 14], w: [108, 2] })],
  calves: [STAND, pose({ h: [100, 12], n: [100, 24], s: [100, 28], e: [100, 48], w: [100, 66], p: [100, 66], k: [100, 92], a: [102, 116], t: [112, 126] })],
  core_anti_extension: [pose({ e: [132, 124], w: [150, 124] }, PLANK), pose({ e: [132, 124], w: [150, 124], p: [88, 102] }, PLANK)],
  core_lateral: [pose({ h: [152, 80], n: [140, 86], s: [140, 86], e: [140, 124], w: [152, 124], p: [96, 112], k: [68, 118], a: [40, 124] }), pose({ h: [152, 76], n: [140, 84], s: [140, 84], e: [140, 124], w: [152, 124], p: [96, 98], k: [68, 112], a: [40, 124] })],
  core_flexion: [pose({ k: [128, 112], a: [154, 118], t: [164, 116] }, LIE), pose({ p: [100, 116], k: [106, 92], a: [128, 82], t: [136, 76] }, LIE)],
  hip_abduction: [
    pose({ h: [40, 110], n: [52, 114], s: [52, 114], e: [56, 122], w: [70, 124], p: [100, 116], k: [130, 118], a: [160, 120], t: [166, 116], k2: [130, 114], a2: [160, 116], t2: [166, 112] }),
    pose({ h: [40, 110], n: [52, 114], s: [52, 114], e: [56, 122], w: [70, 124], p: [100, 116], k: [130, 118], a: [160, 120], t: [166, 116], k2: [128, 102], a2: [156, 90], t2: [162, 84] }),
  ],
  conditioning: [pose({ k: [116, 86], a: [112, 110], t: [122, 112], e: [110, 50], w: [118, 38], e2: [92, 56], w2: [90, 74] }), pose({ k2: [116, 86], a2: [112, 110], t2: [122, 112], k: [100, 100], a: [100, 124], e2: [110, 50], w2: [118, 38], e: [92, 56], w: [90, 74] })],
  mobility: [STAND, pose({ e: [104, 16], w: [108, 2] })],
  stretch: [STAND, pose({ h: [120, 50], n: [114, 56], s: [112, 58], e: [116, 80], w: [118, 100], p: [98, 74] })],
};

const pts = (...ps: P[]) => ps.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");
const limbs = (q: Pose) => ({
  torso: pts(q.n, q.p),
  arm2: pts(q.s, q.e2, q.w2),
  leg2: pts(q.p, q.k2, q.a2, q.t2),
  leg: pts(q.p, q.k, q.a, q.t),
  arm: pts(q.s, q.e, q.w),
});

export default function ExerciseDemo({ pattern, size = 1 }: { pattern: Pattern; size?: number }) {
  const [still, setStill] = useState(false);
  useEffect(() => {
    setStill(!!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  }, []);
  const [A, B] = POSES[pattern] ?? POSES.mobility;
  const la = limbs(A),
    lb = limbs(B);
  const dur = pattern === "core_anti_extension" || pattern === "core_lateral" ? "3.2s" : "2.2s";
  const keys = { values: (a: string, b: string) => `${a};${b};${a}`, keyTimes: "0;0.5;1", calcMode: "spline", keySplines: "0.45 0 0.55 1;0.45 0 0.55 1" };
  const order = ["arm2", "leg2", "torso", "leg", "arm"] as const;
  return (
    <svg viewBox="0 0 200 136" width={200 * size} height={136 * size} className="max-w-full h-auto" role="img" aria-label="Hareketin animasyonlu gösterimi">
      <defs>
        <linearGradient id="demo-floor" x1="0" x2="1">
          <stop offset="0" stopColor="var(--me)" stopOpacity="0" />
          <stop offset="0.5" stopColor="var(--me)" stopOpacity="0.35" />
          <stop offset="1" stopColor="var(--me)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="14" y="127" width="172" height="3" rx="1.5" fill="url(#demo-floor)" />
      {order.map((k) => (
        <path key={k} d={la[k]} fill="none" stroke="var(--me)" strokeOpacity={k.endsWith("2") ? 0.4 : 1} strokeWidth={k === "torso" ? 11 : 8} strokeLinecap="round" strokeLinejoin="round">
          {!still && <animate attributeName="d" dur={dur} repeatCount="indefinite" values={keys.values(la[k], lb[k])} keyTimes={keys.keyTimes} calcMode={keys.calcMode} keySplines={keys.keySplines} />}
        </path>
      ))}
      <circle cx={A.h[0]} cy={A.h[1]} r="9.5" fill="var(--me)">
        {!still && (
          <>
            <animate attributeName="cx" dur={dur} repeatCount="indefinite" values={`${A.h[0]};${B.h[0]};${A.h[0]}`} keyTimes={keys.keyTimes} calcMode={keys.calcMode} keySplines={keys.keySplines} />
            <animate attributeName="cy" dur={dur} repeatCount="indefinite" values={`${A.h[1]};${B.h[1]};${A.h[1]}`} keyTimes={keys.keyTimes} calcMode={keys.calcMode} keySplines={keys.keySplines} />
          </>
        )}
      </circle>
    </svg>
  );
}
