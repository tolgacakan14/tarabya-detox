// İkimiz programs v2: self-contained training data module (no imports).
// Exercise library (Turkish), progression ladders, warm-up/cool-down routines, per-user 12-week plans,
// Eylül's walk/run plan, Tolga's optional conditioning, readiness rules, progression + kcal helpers.
//
// Evidence notes (details and links in REPORT.md):
//  - Weekly hard sets per muscle counted fractionally: direct 1, indirect 0.5 (Pelland et al. 2024 preprint).
//  - Hypertrophy: ~10-20 fractional sets/muscle/week, 2-3x frequency, sets ending ~0-3 RIR (Robinson et al. 2023 preprint).
//  - Bodyweight progressions to near failure grow muscle like loaded work (Schoenfeld 2017 low vs high load; Kotarsky 2018 push-ups).
//  - Fat loss: resistance training + deficit preserves lean mass, lowers fat % (Wewege 2022; Lopez 2022). No spot reduction.
//  - Steps: risk falls up to ~8-10k/day under age 60 (Paluch 2022). Walk/run ramp modelled on NHS Couch to 5K, slowed for a sedentary start.
//  - Menstrual cycle: only a trivial, low-certainty early-follicular dip (McNulty 2020) -> no automatic phase changes; readiness check instead.
//
// Compiles with: tsc --noEmit --strict programs-v2.ts  (ES5 default lib: no Object.entries / includes / find used.)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UserId = "tolga" | "eylul";
/** Same keys as src/lib/activity.ts so weekly volume bars keep working. */
export type Muscle = "chest" | "back" | "shoulders" | "arms" | "legs" | "glutes" | "core";
export type Equipment = "bodyweight" | "dumbbell" | "mat";
/** Household props the exercise needs (shown as small icons on the card). */
export type Prop = "chair" | "table" | "couch" | "wall" | "towel" | "step" | "backpack" | "door" | "books";
export type Unit = "reps" | "seconds";
export type Category = "strength" | "conditioning" | "mobility" | "stretch";
export type Pattern =
  | "squat"
  | "single_leg"
  | "hinge"
  | "glute_bridge"
  | "hamstring_curl"
  | "push_horizontal"
  | "push_vertical"
  | "pull_horizontal"
  | "rear_delt"
  | "lateral_raise"
  | "biceps"
  | "triceps"
  | "calves"
  | "core_anti_extension"
  | "core_lateral"
  | "core_flexion"
  | "hip_abduction"
  | "conditioning"
  | "mobility"
  | "stretch";

export interface Exercise {
  id: string;
  /** Turkish display name */
  name: string;
  /** Turkish one-line how-to */
  how: string;
  /** Turkish form cues, 2-3 short lines, shown under the demo */
  cues: string[];
  primary: Muscle[];
  secondary: Muscle[];
  equipment: Equipment[];
  props?: Prop[];
  unit: Unit;
  perSide?: boolean;
  /** default target range (reps or seconds) for double progression */
  min: number;
  max: number;
  /** default rest after a set, seconds */
  restSec: number;
  category: Category;
  pattern: Pattern;
  /** 1 easiest .. 5 hardest, for display */
  difficulty: 1 | 2 | 3 | 4 | 5;
  /** jump-free option for conditioning moves */
  impact?: "low" | "high";
  /** optional tempo hint, e.g. "3-1-1" (down-pause-up) */
  tempo?: string;
}

export interface Ladder {
  id: string;
  name: string;
  pattern: Pattern;
  /** exercise ids, easiest -> hardest */
  steps: string[];
}

export type SlotRole = "main" | "accessory" | "core";
export type Weekday = "pzt" | "sal" | "car" | "per" | "cum" | "cmt" | "paz";

export interface SlotTemplate {
  ladder: string;
  role: SlotRole;
  /** same letter = superset; alternate sets, rest after the pair */
  pair?: string;
  /** starting step in the ladder for a true beginner (0-based) */
  startStep: number;
  restSec?: number;
  note?: string;
}

export interface SessionTemplate {
  id: string;
  title: string;
  subtitle: string;
  warmup: string;
  cooldown: string;
  slots: SlotTemplate[];
  /** Compendium MET for the work block (supersets keep it denser) */
  met: number;
}

export interface Phase {
  id: string;
  name: string;
  weeks: number[];
  goal: string;
  sets: Record<SlotRole, number>;
  /** reps-in-reserve target [low, high] per role */
  rir: Record<SlotRole, [number, number]>;
  deload: boolean;
  note: string;
}

export interface Prescription {
  ladder: string;
  role: SlotRole;
  pair?: string;
  sets: number;
  rir: [number, number];
  restSec: number;
  startStep: number;
  note?: string;
}

export interface PlannedSession {
  templateId: string;
  title: string;
  day: Weekday;
  prescriptions: Prescription[];
  estMinutes: number;
  met: number;
  /** benchmark tests run inside this session (week 1 baseline, week 12 retest) */
  tests?: string[];
}

export interface Segment {
  kind: "walk" | "brisk" | "jog" | "easy_run" | "stride" | "rest";
  sec: number;
  cue?: string;
}

export interface CardioSession {
  id: string;
  title: string;
  /** what it should feel like, Turkish */
  feel: string;
  segments: Segment[];
  /** session RPE target 1-10 */
  rpe: [number, number];
  cooldown?: string;
}

export interface CircuitSession {
  id: string;
  title: string;
  feel: string;
  moves: string[];
  workSec: number;
  restSec: number;
  rounds: number;
  restBetweenRoundsSec: number;
  met: number;
}

export type DayKind = "strength" | "cardio" | "circuit" | "walk" | "rest";

export interface DayEntry {
  day: Weekday;
  kind: DayKind;
  ref?: string;
  optional?: boolean;
  together?: boolean;
  label: string;
}

export interface PlanWeek {
  week: number;
  phaseId: string;
  deload: boolean;
  strength: PlannedSession[];
  cardio: CardioSession[];
  circuits: CircuitSession[];
  /** step target if baseline = profile.stepBaseline; use stepTargetFor() with real baseline */
  stepTarget: number;
  schedule: DayEntry[];
  coachNote: string;
}

export interface UserPlan {
  user: UserId;
  title: string;
  goal: string;
  sessionsPerWeek: number[]; // per week index 0..11
  phases: Phase[];
  templates: SessionTemplate[];
  weeks: PlanWeek[];
  /** weekly fractional hard sets per muscle the plan aims for, by phase id */
  volumeTargets: Record<string, number>;
}

export interface RoutineStep {
  exercise: string;
  reps?: number;
  seconds?: number;
  perSide?: boolean;
}

export interface Routine {
  id: string;
  title: string;
  minutes: number;
  steps: RoutineStep[];
  closing?: string;
}

export interface Benchmark {
  id: string;
  name: string;
  how: string;
  unit: "reps" | "seconds" | "meters" | "cm";
  users: UserId[];
}

// ---------------------------------------------------------------------------
// Exercise library
// ---------------------------------------------------------------------------

type ExIn = Omit<Exercise, "id" | "equipment" | "secondary" | "unit" | "category" | "restSec"> &
  Partial<Pick<Exercise, "equipment" | "secondary" | "unit" | "category" | "restSec">>;

const LIST: Array<[string, ExIn]> = [
  // ---- Squat ----
  ["squat_chair_sit_stand", { name: "Sandalyeye otur-kalk", how: "Sandalyenin önünde dur, kollar önde; kalçanı geri iterek otur ve topuklarından iterek kalk.", cues: ["Dizler ayak uçlarıyla aynı yöne baksın", "Oturunca gevşeme, sadece dokun ve kalk"], primary: ["legs", "glutes"], secondary: ["core"], props: ["chair"], min: 10, max: 15, pattern: "squat", difficulty: 1, restSec: 75 }],
  ["squat_bodyweight", { name: "Vücut ağırlığı squat", how: "Ayaklar omuz genişliğinde; kalçayı geri ve aşağı indir, kalça diz hizasına gelince kalk.", cues: ["Topuklar yerden kalkmasın", "Göğüs dik, bakış ileri", "Dizler içe çökmesin"], primary: ["legs", "glutes"], secondary: ["core"], min: 12, max: 20, pattern: "squat", difficulty: 1, restSec: 75 }],
  ["squat_tempo", { name: "Tempolu squat (3 sn iniş)", how: "3 saniyede in, dipte 1 saniye dur, normal hızda kalk.", cues: ["İnişi say: bir, iki, üç", "Dipte gevşeme, gerilimi koru"], primary: ["legs", "glutes"], secondary: ["core"], min: 10, max: 15, pattern: "squat", difficulty: 2, tempo: "3-1-1", restSec: 90 }],
  ["squat_goblet", { name: "Goblet squat", how: "Bir dambılı göğsünün önünde dik tut; dik gövdeyle derin otur ve kalk.", cues: ["Dirsekler dizlerin iç tarafından geçsin", "Dambıl göğsüne yapışık kalsın"], primary: ["legs", "glutes"], secondary: ["core"], equipment: ["dumbbell"], min: 8, max: 15, pattern: "squat", difficulty: 3, restSec: 90 }],
  ["squat_goblet_pause", { name: "Duraklamalı goblet squat", how: "Goblet squat yap, dipte 2 saniye bekle, sonra kalk.", cues: ["Dipte sırtın dik kalsın", "Beklerken nefesini tut değil, kontrollü ver"], primary: ["legs", "glutes"], secondary: ["core"], equipment: ["dumbbell"], min: 8, max: 12, pattern: "squat", difficulty: 4, tempo: "2-2-1", restSec: 90 }],
  ["squat_goblet_1_5", { name: "1,5 tekrarlı goblet squat", how: "Dibe in, yarıya kadar kalk, tekrar dibe in, sonra tamamen kalk. Bu bir tekrar.", cues: ["Yarım kalkışta topuklar yerde", "Hızlanma, iki inişi de kontrol et"], primary: ["legs", "glutes"], secondary: ["core"], equipment: ["dumbbell"], min: 6, max: 12, pattern: "squat", difficulty: 5, restSec: 105 }],

  // ---- Single leg ----
  ["lunge_reverse_supported", { name: "Destekli geri lunge", how: "Bir elinle sandalyeye tutun, bir adım geri at, arka dizi yere yaklaştır, ön topuktan iterek geri gel.", cues: ["Ön diz ayak bileğinin üstünde kalsın", "Gövde dik"], primary: ["legs", "glutes"], secondary: ["core"], props: ["chair"], perSide: true, min: 8, max: 12, pattern: "single_leg", difficulty: 1, restSec: 60 }],
  ["lunge_reverse", { name: "Geri lunge", how: "Desteksiz bir adım geri at, iki diz de 90 dereceye yaklaşsın, ön ayaktan iterek dön.", cues: ["Ağırlık ön topukta", "Arka dizi yere vurma"], primary: ["legs", "glutes"], secondary: ["core"], perSide: true, min: 8, max: 12, pattern: "single_leg", difficulty: 2, restSec: 60 }],
  ["split_squat", { name: "Split squat", how: "Ayaklar bir adım önde-arkada sabit; dikey olarak in ve kalk.", cues: ["Ağırlık ön ayakta", "Arka diz yere hafifçe yaklaşsın"], primary: ["legs", "glutes"], secondary: ["core"], perSide: true, min: 8, max: 12, pattern: "single_leg", difficulty: 2, restSec: 60 }],
  ["lunge_reverse_db", { name: "Dambıllı geri lunge", how: "Her elinde bir dambılla geri lunge yap.", cues: ["Dambıllar yanlarda sallanmasın", "Gövde dik"], primary: ["legs", "glutes"], secondary: ["core", "arms"], equipment: ["dumbbell"], perSide: true, min: 8, max: 12, pattern: "single_leg", difficulty: 3, restSec: 75 }],
  ["bulgarian_split_squat", { name: "Bulgarian split squat", how: "Arka ayağının üstü sandalyede; ön bacakla aşağı in ve kalk.", cues: ["Ön ayağı yeterince öne koy", "Gövdeyi hafif öne eğersen kalça daha çok çalışır"], primary: ["legs", "glutes"], secondary: ["core"], props: ["chair"], perSide: true, min: 8, max: 12, pattern: "single_leg", difficulty: 3, restSec: 75 }],
  ["bulgarian_split_squat_db", { name: "Dambıllı Bulgarian split squat", how: "Her elinde dambılla Bulgarian split squat yap.", cues: ["Ön topuk yerde kalsın", "Dipte bir an dur"], primary: ["legs", "glutes"], secondary: ["core", "arms"], equipment: ["dumbbell"], props: ["chair"], perSide: true, min: 6, max: 12, pattern: "single_leg", difficulty: 4, restSec: 90 }],
  ["bulgarian_split_squat_1_5", { name: "1,5 tekrarlı Bulgarian split squat", how: "Dibe in, yarıya kalk, tekrar dibe in, tamamen kalk. Dambıllı yap.", cues: ["Yarım kalkışta dengeyi koru", "İnişleri yavaş tut"], primary: ["legs", "glutes"], secondary: ["core"], equipment: ["dumbbell"], props: ["chair"], perSide: true, min: 6, max: 10, pattern: "single_leg", difficulty: 5, restSec: 90 }],
  ["step_up_low", { name: "Alçak basamağa çıkış", how: "Bir basamağa ya da sağlam alçak bir yüzeye tek ayakla bas, o ayaktan iterek çık, kontrollü in.", cues: ["Alttaki ayakla zıplama", "Çıkan diz içe kaçmasın"], primary: ["legs", "glutes"], secondary: ["core"], props: ["step"], perSide: true, min: 8, max: 12, pattern: "single_leg", difficulty: 1, restSec: 60 }],
  ["step_up_high", { name: "Yüksek basamağa çıkış", how: "Diz yüksekliğine yakın sağlam bir yüzeye (sandalye ya da iki basamak) çık ve yavaş in.", cues: ["Yüzeyin kaymadığından emin ol", "İnişi 2 saniyede yap"], primary: ["legs", "glutes"], secondary: ["core"], props: ["chair"], perSide: true, min: 8, max: 12, pattern: "single_leg", difficulty: 3, restSec: 75 }],
  ["step_up_db", { name: "Dambıllı basamağa çıkış", how: "Her elinde dambılla yüksek basamağa çık ve yavaş in.", cues: ["Ön ayağın tamamı basamakta", "Gövde dik"], primary: ["legs", "glutes"], secondary: ["core"], equipment: ["dumbbell"], props: ["chair"], perSide: true, min: 8, max: 12, pattern: "single_leg", difficulty: 4, restSec: 75 }],

  // ---- Hinge ----
  ["hip_hinge_drill", { name: "Kalça menteşesi (good morning)", how: "Eller göğüste, dizler hafif bükük; sırt düzken kalçanı geri it, gövdeyi öne eğ, kalçanı sıkarak doğrul.", cues: ["Kalçanla arkadaki duvara dokunmaya çalış", "Sırtın kamburlaşmasın"], primary: ["glutes", "legs"], secondary: ["back"], min: 12, max: 15, pattern: "hinge", difficulty: 1, restSec: 60 }],
  ["rdl_db", { name: "Dambıl Romanian deadlift", how: "Dambılları bacaklarının önünde tut; kalçayı geri iterek diz altına kadar indir, kalçanı sıkarak kalk.", cues: ["Dambıllar bacağına yakın insin", "Arka bacakta gerilme hissetmelisin", "Sırt düz, boyun nötr"], primary: ["glutes", "legs"], secondary: ["back"], equipment: ["dumbbell"], min: 8, max: 15, pattern: "hinge", difficulty: 2, restSec: 90 }],
  ["rdl_db_tempo", { name: "Tempolu dambıl RDL (3 sn iniş)", how: "RDL yap, inişi 3 saniyede tamamla.", cues: ["En altta 1 sn gerilmeyi hisset", "Kalkarken kalçayı öne it, beli değil"], primary: ["glutes", "legs"], secondary: ["back"], equipment: ["dumbbell"], min: 8, max: 12, pattern: "hinge", difficulty: 3, tempo: "3-1-1", restSec: 90 }],
  ["rdl_single_leg_supported", { name: "Destekli tek bacak RDL", how: "Bir elinle duvara dokun; tek bacak üstünde kalçadan öne eğil, arka bacak geriye uzansın.", cues: ["Kalçalar yere paralel kalsın, açılmasın", "Duruş bacağının dizi hafif bükük"], primary: ["glutes", "legs"], secondary: ["core"], equipment: ["bodyweight", "dumbbell"], props: ["wall"], perSide: true, min: 8, max: 12, pattern: "hinge", difficulty: 3, restSec: 60 }],
  ["rdl_single_leg_db", { name: "Tek bacak dambıl RDL", how: "Karşı elinde dambılla, desteksiz tek bacak RDL yap.", cues: ["Yavaş in, dengeyi kur", "Dambıl ayağa doğru dikey insin"], primary: ["glutes", "legs"], secondary: ["core", "back"], equipment: ["dumbbell"], perSide: true, min: 8, max: 12, pattern: "hinge", difficulty: 4, restSec: 75 }],

  // ---- Glute bridge ----
  ["glute_bridge", { name: "Kalça köprüsü (glute bridge)", how: "Sırt üstü yat, dizler bükük; topuklarından iterek kalçanı kaldır, tepede sık, yavaş in.", cues: ["Beli değil kalçayı kullan: tepede kaburgalar aşağıda", "Topuklar kalçana yakın"], primary: ["glutes"], secondary: ["legs", "core"], equipment: ["mat"], min: 12, max: 20, pattern: "glute_bridge", difficulty: 1, restSec: 60 }],
  ["glute_bridge_pause", { name: "Bekletmeli köprü (tepede 3 sn)", how: "Köprü yap, her tekrarda tepede 3 saniye bekle.", cues: ["Tepede kalçanı gerçekten sık", "Dizler dışa doğru hafif itilsin"], primary: ["glutes"], secondary: ["legs", "core"], equipment: ["mat"], min: 10, max: 15, pattern: "glute_bridge", difficulty: 2, tempo: "1-3-2", restSec: 60 }],
  ["glute_bridge_db", { name: "Dambıllı köprü", how: "Dambılı kalça kemiklerinin üstüne koy, elinle sabitle ve köprü yap.", cues: ["Dambılın altına havlu koy", "Tepede 1 sn sık"], primary: ["glutes"], secondary: ["legs"], equipment: ["dumbbell", "mat"], props: ["towel"], min: 10, max: 15, pattern: "glute_bridge", difficulty: 3, restSec: 60 }],
  ["hip_thrust_db", { name: "Dambıllı hip thrust", how: "Kürek kemiklerin koltuk kenarında, dambıl kalçanda; kalçanı tam açılana kadar kaldır.", cues: ["Çene göğse yakın, bakış ileri", "Tepede dizler 90 derece"], primary: ["glutes"], secondary: ["legs"], equipment: ["dumbbell"], props: ["couch", "towel"], min: 8, max: 15, pattern: "glute_bridge", difficulty: 3, restSec: 75 }],
  ["glute_bridge_single_leg", { name: "Tek bacak köprü", how: "Bir bacağın havada, diğer topuktan iterek köprü yap.", cues: ["Kalçalar aynı hizada kalsın", "Yavaş in"], primary: ["glutes"], secondary: ["legs", "core"], equipment: ["mat"], perSide: true, min: 8, max: 15, pattern: "glute_bridge", difficulty: 4, restSec: 60 }],
  ["hip_thrust_single_leg", { name: "Tek bacak hip thrust", how: "Sırtın koltuk kenarında, tek bacakla kalçanı yukarı it.", cues: ["Pelvis yana düşmesin", "Tepede 1 sn sık"], primary: ["glutes"], secondary: ["legs", "core"], props: ["couch"], perSide: true, min: 8, max: 12, pattern: "glute_bridge", difficulty: 5, restSec: 75 }],

  // ---- Hamstring curl ----
  ["bridge_walkout", { name: "Köprüde topuk yürüyüşü", how: "Köprü pozisyonunda kalçanı yukarıda tut, topuklarınla küçük adımlarla öne yürü ve geri gel.", cues: ["Kalça düşmesin", "Bacak uzadıkça zorlaşır, kontrollü git"], primary: ["legs"], secondary: ["glutes", "core"], equipment: ["mat"], min: 6, max: 10, pattern: "hamstring_curl", difficulty: 2, restSec: 60 }],
  ["leg_curl_towel", { name: "Havlu üstünde leg curl", how: "Kaygan zeminde topukların havluda; köprüye kalk, topukları kalçana çek, sonra yavaşça uzat.", cues: ["Kalça boyunca yukarıda", "Uzatırken 3 saniye say"], primary: ["legs"], secondary: ["glutes"], props: ["towel"], min: 6, max: 12, pattern: "hamstring_curl", difficulty: 3, restSec: 75 }],
  ["leg_curl_towel_single", { name: "Tek bacak havlu leg curl", how: "Havlu leg curl'ü tek bacakla yap, diğer bacak havada.", cues: ["Kalçayı düşürmeden çek", "Zorlanırsan sadece uzatma kısmını yap"], primary: ["legs"], secondary: ["glutes", "core"], props: ["towel"], perSide: true, min: 5, max: 10, pattern: "hamstring_curl", difficulty: 5, restSec: 75 }],

  // ---- Horizontal push ----
  ["pushup_wall", { name: "Duvar şınavı", how: "Duvara kol boyu uzaklıkta dur, eller omuz hizasında; göğsünü duvara yaklaştır ve it.", cues: ["Vücut baştan topuğa düz", "Dirsekler gövdeyle 45 derece"], primary: ["chest"], secondary: ["arms", "shoulders"], props: ["wall"], min: 10, max: 20, pattern: "push_horizontal", difficulty: 1, restSec: 60 }],
  ["pushup_counter", { name: "Tezgah şınavı", how: "Ellerini mutfak tezgahına ya da sağlam bir masa kenarına koy ve şınav çek.", cues: ["Kalça sarkmasın", "Göğüs kenara yaklaşsın"], primary: ["chest"], secondary: ["arms", "shoulders"], props: ["table"], min: 8, max: 15, pattern: "push_horizontal", difficulty: 1, restSec: 60 }],
  ["pushup_incline_low", { name: "Alçak eğimli şınav", how: "Ellerini koltuğa ya da basamağa koy; daha alçak yüzey daha zor.", cues: ["Karnını sık", "Tam aşağı in, tam yukarı it"], primary: ["chest"], secondary: ["arms", "shoulders"], props: ["couch"], min: 8, max: 15, pattern: "push_horizontal", difficulty: 2, restSec: 75 }],
  ["pushup_knee", { name: "Dizden şınav", how: "Dizler yerde, kalçadan başa düz bir çizgi; göğüs yere yaklaşana kadar in ve it.", cues: ["Kalçayı kırma", "Eller omuzların biraz dışında"], primary: ["chest"], secondary: ["arms", "shoulders"], equipment: ["mat"], min: 8, max: 15, pattern: "push_horizontal", difficulty: 2, restSec: 75 }],
  ["pushup", { name: "Klasik şınav", how: "Eller omuzların biraz dışında, vücut tahta gibi düz; göğüs yere bir yumruk kalana kadar in ve it.", cues: ["Karın ve kalça sıkı", "Dirsekleri yana açma"], primary: ["chest"], secondary: ["arms", "shoulders", "core"], min: 6, max: 20, pattern: "push_horizontal", difficulty: 3, restSec: 90 }],
  ["pushup_tempo", { name: "Tempolu şınav (3 sn iniş)", how: "3 saniyede in, altta 1 saniye dur, güçlü it.", cues: ["Altta göğüs yere değmesin", "Omuzlar kulaktan uzak"], primary: ["chest"], secondary: ["arms", "shoulders", "core"], min: 6, max: 15, pattern: "push_horizontal", difficulty: 3, tempo: "3-1-1", restSec: 90 }],
  ["pushup_feet_elevated", { name: "Ayak yükseltilmiş şınav", how: "Ayakların sandalyede, eller yerde şınav çek; üst göğüs ve omuz daha çok çalışır.", cues: ["Bel çukurlaşmasın", "Baş gövdeyle aynı hizada"], primary: ["chest"], secondary: ["shoulders", "arms", "core"], props: ["chair"], min: 6, max: 15, pattern: "push_horizontal", difficulty: 4, restSec: 90 }],
  ["pushup_deficit", { name: "Derin şınav (eller yükseltide)", how: "Eller kitap yığını ya da dambıllar üstünde; göğüs ellerin seviyesinin altına insin.", cues: ["Altta göğüste gerilme hisset", "Bilekler düz, dambıl kaymasın"], primary: ["chest"], secondary: ["arms", "shoulders", "core"], props: ["books"], min: 6, max: 15, pattern: "push_horizontal", difficulty: 4, restSec: 90 }],
  ["pushup_backpack", { name: "Sırt çantalı şınav", how: "Sırt çantasına kitap ya da su şişesi koy, giy ve şınav çek.", cues: ["Çanta sırtın ortasında, sıkı bağlı", "Formu bozan yük fazla demek"], primary: ["chest"], secondary: ["arms", "shoulders", "core"], props: ["backpack"], min: 6, max: 15, pattern: "push_horizontal", difficulty: 5, restSec: 105 }],
  ["floor_press_db", { name: "Dambıl floor press", how: "Yerde sırt üstü, dizler bükük; dambılları göğüs hizasından yukarı it, dirsekler yere hafifçe değene kadar indir.", cues: ["Dirsekler gövdeyle 45 derece", "Dambıllar tepede birbirine çarpmasın"], primary: ["chest"], secondary: ["arms", "shoulders"], equipment: ["dumbbell", "mat"], min: 8, max: 15, pattern: "push_horizontal", difficulty: 2, restSec: 90 }],
  ["floor_press_db_pause", { name: "Duraklamalı floor press", how: "Dirsekler yere değince 1 saniye dur, sonra it.", cues: ["Dururken gevşeme", "Kürek kemikleri yere bastırılı"], primary: ["chest"], secondary: ["arms", "shoulders"], equipment: ["dumbbell", "mat"], min: 8, max: 12, pattern: "push_horizontal", difficulty: 3, restSec: 90 }],
  ["floor_fly_db", { name: "Yerde dambıl fly", how: "Yerde sırt üstü, dirsekler hafif bükük; kolları yana aç, göğsünü sıkarak birleştir.", cues: ["Dirsek açısı sabit kalsın", "Kollar yere yumuşak değsin, çarpma"], primary: ["chest"], secondary: ["shoulders"], equipment: ["dumbbell", "mat"], min: 10, max: 20, pattern: "push_horizontal", difficulty: 2, restSec: 60 }],
  ["floor_fly_db_tempo", { name: "Tempolu yerde fly (3 sn açılış)", how: "Fly yap, kolları 3 saniyede aç.", cues: ["Açılırken göğüste gerilme hisset", "Tepede 1 sn sık"], primary: ["chest"], secondary: ["shoulders"], equipment: ["dumbbell", "mat"], min: 10, max: 15, pattern: "push_horizontal", difficulty: 3, tempo: "3-0-1", restSec: 60 }],

  // ---- Vertical push ----
  ["ohp_db_seated", { name: "Oturarak dambıl omuz press", how: "Sandalyede dik otur; dambılları kulak hizasından yukarı it ve kontrollü indir.", cues: ["Karnını sık, bel boşluğu artmasın", "Tepede kollar kulakların yanında"], primary: ["shoulders"], secondary: ["arms"], equipment: ["dumbbell"], props: ["chair"], min: 8, max: 15, pattern: "push_vertical", difficulty: 1, restSec: 75 }],
  ["ohp_db_standing", { name: "Ayakta dambıl omuz press", how: "Ayakta, kalça ve karın sıkı; dambılları yukarı it.", cues: ["Dizleri kullanma", "Başını hafif geri al, dambıllar yüzünün önünden geçsin"], primary: ["shoulders"], secondary: ["arms", "core"], equipment: ["dumbbell"], min: 8, max: 12, pattern: "push_vertical", difficulty: 2, restSec: 75 }],
  ["ohp_db_single_arm", { name: "Tek kol ayakta omuz press", how: "Tek dambılla ayakta press yap; gövde yana eğilmesin.", cues: ["Boştaki elin yumruk, karın sıkı", "İnişi 2 saniyede yap"], primary: ["shoulders"], secondary: ["arms", "core"], equipment: ["dumbbell"], perSide: true, min: 8, max: 12, pattern: "push_vertical", difficulty: 3, restSec: 60 }],
  ["pike_pushup", { name: "Pike şınav", how: "Kalça yukarıda ters V pozisyonu; başını ellerin önüne doğru indir ve it.", cues: ["Başın ve ellerin bir üçgen oluşturur", "Dirsekleri yana değil geriye bük"], primary: ["shoulders"], secondary: ["arms", "chest"], equipment: ["mat"], min: 6, max: 12, pattern: "push_vertical", difficulty: 3, restSec: 90 }],
  ["pike_pushup_elevated", { name: "Ayak yükseltilmiş pike şınav", how: "Ayakların sandalyede, kalça omuzların üstünde; pike şınav çek.", cues: ["Kalça yukarıda kalsın", "Başını yavaşça indir"], primary: ["shoulders"], secondary: ["arms", "chest"], props: ["chair"], min: 5, max: 12, pattern: "push_vertical", difficulty: 4, restSec: 105 }],
  ["pike_pushup_deficit", { name: "Derin pike şınav (eller kitapta)", how: "Eller kitapların üstünde, ayaklar yükseltide; baş ellerin seviyesinin altına insin.", cues: ["Hareket açıklığını yavaş yavaş artır", "Boynunu zorlama"], primary: ["shoulders"], secondary: ["arms", "chest"], props: ["chair", "books"], min: 5, max: 10, pattern: "push_vertical", difficulty: 5, restSec: 105 }],

  // ---- Horizontal pull ----
  ["row_db_bent_two_arm", { name: "Eğik iki kol dambıl row", how: "Kalçadan öne eğil, sırt düz; iki dambılı göbeğine doğru çek.", cues: ["Kürek kemiklerini birbirine yaklaştır", "Omuzlar kulaklardan uzak"], primary: ["back"], secondary: ["arms", "shoulders"], equipment: ["dumbbell"], min: 10, max: 15, pattern: "pull_horizontal", difficulty: 1, restSec: 75 }],
  ["row_db_single_arm", { name: "Tek kol dambıl row", how: "Bir el ve diz sandalyede; dambılı kalçana doğru çek, yavaş indir.", cues: ["Dirsek gövdeye yakın geçsin", "Gövdeyi döndürme"], primary: ["back"], secondary: ["arms", "shoulders"], equipment: ["dumbbell"], props: ["chair"], perSide: true, min: 8, max: 15, pattern: "pull_horizontal", difficulty: 2, restSec: 60 }],
  ["row_db_single_arm_pause", { name: "Tek kol row, tepede 2 sn", how: "Tek kol row yap, tepede 2 saniye sık.", cues: ["Tepede kürek kemiğini omurgaya yaklaştır", "Ağırlığı sallayarak çekme"], primary: ["back"], secondary: ["arms", "shoulders"], equipment: ["dumbbell"], props: ["chair"], perSide: true, min: 8, max: 12, pattern: "pull_horizontal", difficulty: 3, tempo: "1-2-2", restSec: 60 }],
  ["row_db_single_arm_tempo", { name: "Tek kol row, 4 sn iniş", how: "Hızlı çek, 4 saniyede indir.", cues: ["İnişte sırtın gerildiğini hisset", "Altta kolu tam aç"], primary: ["back"], secondary: ["arms", "shoulders"], equipment: ["dumbbell"], props: ["chair"], perSide: true, min: 8, max: 12, pattern: "pull_horizontal", difficulty: 4, tempo: "4-1-1", restSec: 60 }],
  ["row_towel_door", { name: "Kapıda havlu row", how: "Havluyu kapı kolunun iki yanına dola, kapıyı kapat; havludan tutup geriye yaslan ve kendini kapıya çek.", cues: ["Kapı kapalı ve senden uzağa açılan taraf olmalı", "Vücut düz, göğsünü ellerine götür"], primary: ["back"], secondary: ["arms"], props: ["towel", "door"], min: 8, max: 15, pattern: "pull_horizontal", difficulty: 1, restSec: 60 }],
  ["row_inverted_table_bent", { name: "Masa altında ters kürek (dizler bükük)", how: "Sağlam bir masanın altına sırt üstü gir, kenarı tut ve göğsünü masaya çek.", cues: ["Masanın devrilmeyeceğinden emin ol", "Kalça düşmesin"], primary: ["back"], secondary: ["arms", "shoulders"], props: ["table"], min: 6, max: 15, pattern: "pull_horizontal", difficulty: 3, restSec: 90 }],
  ["row_inverted_table", { name: "Ters kürek (bacaklar düz)", how: "Masa altında bacaklar düz, topuklar yerde; göğsünü masaya çek.", cues: ["Vücut tek çizgi", "Tepede kürek kemiklerini sık"], primary: ["back"], secondary: ["arms", "shoulders", "core"], props: ["table"], min: 6, max: 15, pattern: "pull_horizontal", difficulty: 4, restSec: 90 }],
  ["row_inverted_table_feet_elevated", { name: "Ayaklar yüksekte ters kürek", how: "Ayakların sandalyede, vücut yere paralel; göğsünü masaya çek.", cues: ["En zor varyasyon, yavaş in", "Kalçayı sık"], primary: ["back"], secondary: ["arms", "shoulders", "core"], props: ["table", "chair"], min: 5, max: 12, pattern: "pull_horizontal", difficulty: 5, restSec: 90 }],

  // ---- Rear delt / upper back ----
  ["prone_y_raise", { name: "Yüzüstü Y kaldırma", how: "Yüzüstü yat, kolları Y şeklinde öne uzat, başparmaklar yukarı; kolları yerden kaldır, 1 sn tut.", cues: ["Boynunu uzat, başını kaldırma", "Hareket kürek kemiklerinden başlasın"], primary: ["shoulders", "back"], secondary: [], equipment: ["mat"], min: 10, max: 15, pattern: "rear_delt", difficulty: 1, restSec: 45 }],
  ["reverse_fly_db", { name: "Eğik dambıl reverse fly", how: "Kalçadan öne eğil, dirsekler hafif bükük; kolları yana aç ve yavaş indir.", cues: ["Hafif dambıl yeter", "Omuz silkme"], primary: ["shoulders", "back"], secondary: [], equipment: ["dumbbell"], min: 12, max: 20, pattern: "rear_delt", difficulty: 2, restSec: 45 }],
  ["reverse_fly_db_pause", { name: "Reverse fly, tepede 2 sn", how: "Reverse fly yap, kollar açıkken 2 saniye tut.", cues: ["Kollar omuz hizasını geçmesin", "Göğüs aşağıya baksın"], primary: ["shoulders", "back"], secondary: [], equipment: ["dumbbell"], min: 10, max: 15, pattern: "rear_delt", difficulty: 3, restSec: 45 }],

  // ---- Lateral raise ----
  ["lateral_raise_db", { name: "Dambıl yana açış", how: "Dirsekler hafif bükük; dambılları omuz hizasına kadar yana kaldır, yavaş indir.", cues: ["Dirseklerinle yönlendir, bileklerinle değil", "Gövdeyi sallama"], primary: ["shoulders"], secondary: [], equipment: ["dumbbell"], min: 12, max: 20, pattern: "lateral_raise", difficulty: 1, restSec: 45 }],
  ["lateral_raise_db_tempo", { name: "Yana açış, 3 sn iniş", how: "Yana açış yap, indirmeyi 3 saniyede tamamla.", cues: ["Tepede omuz silkme", "Altta tam dinlenme, gerilim kalsın"], primary: ["shoulders"], secondary: [], equipment: ["dumbbell"], min: 10, max: 15, pattern: "lateral_raise", difficulty: 2, tempo: "1-0-3", restSec: 45 }],
  ["lateral_raise_lean_away", { name: "Eğik tek kol yana açış", how: "Bir elinle kapı kasasına tutun, gövdeyi hafif yatır; diğer kolla yana açış yap.", cues: ["Hareket aşağıda daha zor, acele etme", "Hafif dambıl kullan"], primary: ["shoulders"], secondary: [], equipment: ["dumbbell"], props: ["door"], perSide: true, min: 10, max: 15, pattern: "lateral_raise", difficulty: 3, restSec: 30 }],

  // ---- Biceps ----
  ["curl_db", { name: "Dambıl curl", how: "Dirsekler gövdenin yanında sabit; dambılları omuza doğru kaldır, yavaş indir.", cues: ["Gövdeyi sallama", "Aşağıda kolu tam aç"], primary: ["arms"], secondary: [], equipment: ["dumbbell"], min: 10, max: 15, pattern: "biceps", difficulty: 1, restSec: 45 }],
  ["curl_hammer", { name: "Hammer curl", how: "Avuç içleri birbirine bakarken curl yap.", cues: ["Bilekler düz", "Dirsekler öne kaymasın"], primary: ["arms"], secondary: [], equipment: ["dumbbell"], min: 10, max: 15, pattern: "biceps", difficulty: 2, restSec: 45 }],
  ["curl_db_slow_eccentric", { name: "Yavaş inişli curl (4 sn)", how: "Normal hızda kaldır, 4 saniyede indir.", cues: ["İnişte saymayı unutma", "Son tekrarlar zor olmalı"], primary: ["arms"], secondary: [], equipment: ["dumbbell"], min: 8, max: 12, pattern: "biceps", difficulty: 3, tempo: "4-0-1", restSec: 45 }],

  // ---- Triceps ----
  ["dips_chair_bent", { name: "Sandalye dips (dizler bükük)", how: "Ellerin arkandaki sandalyenin kenarında; dirsekleri geriye bükerek in ve it.", cues: ["Omuzlar kulaklara yükselmesin", "Dirsekler 90 dereceyi çok geçmesin"], primary: ["arms"], secondary: ["chest", "shoulders"], props: ["chair"], min: 8, max: 15, pattern: "triceps", difficulty: 1, restSec: 60 }],
  ["dips_chair_straight", { name: "Sandalye dips (bacaklar düz)", how: "Topuklar yerde, bacaklar düz; sandalye dips yap.", cues: ["Sırtın sandalyeye yakın insin", "Kontrollü in"], primary: ["arms"], secondary: ["chest", "shoulders"], props: ["chair"], min: 8, max: 15, pattern: "triceps", difficulty: 2, restSec: 60 }],
  ["pushup_close", { name: "Dar şınav", how: "Eller göğsün altında, omuz genişliğinden dar; dirsekler gövdeye yakın şınav çek.", cues: ["Dirsekler geriye baksın", "Gerekirse dizden yap"], primary: ["arms"], secondary: ["chest", "shoulders", "core"], min: 6, max: 15, pattern: "triceps", difficulty: 3, restSec: 75 }],
  ["kickback_db", { name: "Dambıl kickback", how: "Öne eğil, üst kol gövdeye paralel ve sabit; ön kolu geriye uzat, arka kolu sık.", cues: ["Üst kol hareket etmesin", "Tepede 1 sn sık"], primary: ["arms"], secondary: [], equipment: ["dumbbell"], min: 10, max: 15, pattern: "triceps", difficulty: 1, restSec: 45 }],
  ["overhead_extension_db", { name: "Baş üstü dambıl triceps uzatma", how: "Tek dambılı iki elle baş üstünde tut; dirsekleri bükerek ensene indir, yukarı uzat.", cues: ["Dirsekler öne baksın, yana açılmasın", "Karnını sık, belini oyma"], primary: ["arms"], secondary: [], equipment: ["dumbbell"], min: 10, max: 15, pattern: "triceps", difficulty: 2, restSec: 60 }],
  ["overhead_extension_db_tempo", { name: "Baş üstü uzatma, 3 sn iniş", how: "Baş üstü uzatmayı 3 saniyelik inişle yap.", cues: ["Altta arka kolda gerilme hisset", "Dirsekleri sabit tut"], primary: ["arms"], secondary: [], equipment: ["dumbbell"], min: 8, max: 12, pattern: "triceps", difficulty: 3, tempo: "3-0-1", restSec: 60 }],

  // ---- Calves ----
  ["calf_raise", { name: "Baldır kaldırma", how: "Duvara hafifçe tutun; parmak uçlarında yüksel, 1 sn bekle, yavaş in.", cues: ["En tepeye çık", "Dizleri bükme"], primary: ["legs"], secondary: [], props: ["wall"], min: 15, max: 25, pattern: "calves", difficulty: 1, restSec: 45 }],
  ["calf_raise_single", { name: "Tek bacak baldır kaldırma (basamakta)", how: "Parmak ucun basamağın kenarında; topuğu aşağı sarkıt, sonra en tepeye yüksel.", cues: ["Altta 1 sn esnet", "Zıplatma, yavaş çalış"], primary: ["legs"], secondary: [], props: ["step", "wall"], perSide: true, min: 10, max: 20, pattern: "calves", difficulty: 2, restSec: 30 }],
  ["calf_raise_single_db", { name: "Dambıllı tek bacak baldır kaldırma", how: "Aynı taraftaki elinde dambılla tek bacak baldır kaldırma yap.", cues: ["Diğer elinle duvara tutun", "Tam hareket açıklığı"], primary: ["legs"], secondary: [], equipment: ["dumbbell"], props: ["step", "wall"], perSide: true, min: 10, max: 15, pattern: "calves", difficulty: 3, restSec: 30 }],

  // ---- Core ----
  ["dead_bug", { name: "Dead bug", how: "Sırt üstü, kollar tavana, dizler 90 derece havada; karşı kol ve bacağı yavaşça uzat ve geri getir.", cues: ["Bel yere yapışık kalsın", "Nefesini vererek uzat"], primary: ["core"], secondary: [], equipment: ["mat"], perSide: true, min: 6, max: 12, pattern: "core_anti_extension", difficulty: 1, restSec: 45 }],
  ["dead_bug_slow", { name: "Yavaş dead bug (3 sn)", how: "Dead bug yap, her uzatmayı 3 saniyede tamamla.", cues: ["Uzatınca 1 sn tut", "Bel kalkarsa hareketi kısalt"], primary: ["core"], secondary: [], equipment: ["mat"], perSide: true, min: 6, max: 10, pattern: "core_anti_extension", difficulty: 2, restSec: 45 }],
  ["dead_bug_db", { name: "Dambıllı dead bug", how: "Ellerinde hafif bir dambılla dead bug yap.", cues: ["Dambıl göğsün üstünde sabit", "Bacaklar yavaş uzansın"], primary: ["core"], secondary: [], equipment: ["dumbbell", "mat"], perSide: true, min: 6, max: 10, pattern: "core_anti_extension", difficulty: 3, restSec: 45 }],
  ["plank_knee", { name: "Dizden plank", how: "Dirsekler omuz altında, dizler yerde; kalçadan başa düz kal.", cues: ["Karnını içe çek", "Kalçayı kaldırma"], primary: ["core"], secondary: ["shoulders"], equipment: ["mat"], unit: "seconds", min: 15, max: 40, pattern: "core_anti_extension", difficulty: 1, restSec: 45 }],
  ["plank", { name: "Plank", how: "Dirsekler omuz altında, ayak uçlarında; baştan topuğa düz kal.", cues: ["Kalçanı ve karnını sık", "Bel çukurlaşmasın"], primary: ["core"], secondary: ["shoulders"], equipment: ["mat"], unit: "seconds", min: 20, max: 60, pattern: "core_anti_extension", difficulty: 2, restSec: 45 }],
  ["plank_shoulder_tap", { name: "Omuz dokunuşlu plank", how: "Şınav pozisyonunda, kalça sallanmadan elinle karşı omzuna dokun.", cues: ["Ayaklarını biraz aç, denge kolaylaşır", "Yavaş ve sessiz"], primary: ["core"], secondary: ["shoulders"], equipment: ["mat"], perSide: true, min: 8, max: 15, pattern: "core_anti_extension", difficulty: 3, restSec: 45 }],
  ["hollow_tuck_hold", { name: "Toplu hollow tutuş", how: "Sırt üstü, dizler göğse yakın, omuzlar hafif kalkık; beli yere bastırarak bekle.", cues: ["Bel boşluğu kalmasın", "Çene hafif içeride"], primary: ["core"], secondary: [], equipment: ["mat"], unit: "seconds", min: 15, max: 40, pattern: "core_anti_extension", difficulty: 2, restSec: 45 }],
  ["hollow_hold", { name: "Hollow tutuş", how: "Kollar baş üstünde, bacaklar düz ve yerden hafif kalkık; beli yere bastırarak bekle.", cues: ["Bel kalkıyorsa bacakları yükselt", "Nefes almaya devam et"], primary: ["core"], secondary: [], equipment: ["mat"], unit: "seconds", min: 15, max: 45, pattern: "core_anti_extension", difficulty: 4, restSec: 60 }],
  ["side_plank_knee", { name: "Dizden yan plank", how: "Yan yat, dirsek omuz altında, dizler bükük; kalçanı kaldır ve bekle.", cues: ["Kalça öne düşmesin", "Omuz kulaktan uzak"], primary: ["core"], secondary: ["glutes"], equipment: ["mat"], unit: "seconds", perSide: true, min: 15, max: 40, pattern: "core_lateral", difficulty: 1, restSec: 30 }],
  ["side_plank", { name: "Yan plank", how: "Ayaklar üst üste, dirsek omuz altında; vücut yandan düz bir çizgi.", cues: ["Kalçayı yukarı it", "Üst el belde ya da havada"], primary: ["core"], secondary: ["glutes", "shoulders"], equipment: ["mat"], unit: "seconds", perSide: true, min: 15, max: 45, pattern: "core_lateral", difficulty: 2, restSec: 30 }],
  ["side_plank_hip_dip", { name: "Yan plank, kalça indir-kaldır", how: "Yan plankta kalçanı yere yaklaştır ve yukarı kaldır.", cues: ["Kontrollü hareket, sıçratma", "Tepede 1 sn tut"], primary: ["core"], secondary: ["glutes"], equipment: ["mat"], perSide: true, min: 8, max: 15, pattern: "core_lateral", difficulty: 3, restSec: 30 }],
  ["bird_dog", { name: "Bird dog", how: "Dört ayak pozisyonunda karşı kol ve bacağı uzat, 2 sn tut, geri getir.", cues: ["Sırtında su bardağı var gibi düz kal", "Kalça yana açılmasın"], primary: ["core"], secondary: ["glutes", "back"], equipment: ["mat"], perSide: true, min: 6, max: 12, pattern: "core_anti_extension", difficulty: 1, restSec: 30 }],
  ["bird_dog_hold", { name: "Bekletmeli bird dog (5 sn)", how: "Bird dog yap, uzattığında 5 saniye tut.", cues: ["Parmak uçlarından uzan", "Nefesini tutma"], primary: ["core"], secondary: ["glutes", "back"], equipment: ["mat"], perSide: true, min: 5, max: 8, pattern: "core_anti_extension", difficulty: 2, restSec: 30 }],
  ["reverse_crunch", { name: "Ters mekik", how: "Sırt üstü, dizler bükük; kalçanı yerden hafifçe kaldırıp dizleri göğsüne çek.", cues: ["Bacakları sallama, karnınla çek", "Yavaş in"], primary: ["core"], secondary: [], equipment: ["mat"], min: 8, max: 15, pattern: "core_flexion", difficulty: 2, restSec: 45 }],
  ["lying_leg_raise", { name: "Yerde bacak kaldırma", how: "Sırt üstü, eller kalça altında; düz bacakları dikeye kaldır, beli yere bastırarak indir.", cues: ["Bel kalkarsa daha az indir", "3 sn'de indir"], primary: ["core"], secondary: [], equipment: ["mat"], min: 8, max: 15, pattern: "core_flexion", difficulty: 3, restSec: 45 }],

  // ---- Hip abduction ----
  ["clamshell", { name: "İstiridye (clamshell)", how: "Yan yat, dizler bükük, ayaklar birleşik; üstteki dizi açıp kapat.", cues: ["Kalçayı geriye devirme", "Tepede 1 sn sık"], primary: ["glutes"], secondary: [], equipment: ["mat"], perSide: true, min: 12, max: 20, pattern: "hip_abduction", difficulty: 1, restSec: 30 }],
  ["side_lying_abduction", { name: "Yan yatarak bacak kaldırma", how: "Yan yat, alt diz bükük; üst bacağı düz ve hafif geride tutarak kaldır.", cues: ["Ayak ucu öne baksın, tavana değil", "Yavaş in"], primary: ["glutes"], secondary: [], equipment: ["mat"], perSide: true, min: 12, max: 20, pattern: "hip_abduction", difficulty: 2, restSec: 30 }],
  ["side_lying_abduction_pause", { name: "Bekletmeli bacak kaldırma (2 sn)", how: "Yan yatarak bacak kaldır, tepede 2 saniye tut.", cues: ["Kalçanın yanında yanmayı hisset", "Gövdeyi sabit tut"], primary: ["glutes"], secondary: [], equipment: ["mat"], perSide: true, min: 10, max: 15, pattern: "hip_abduction", difficulty: 3, restSec: 30 }],

  // ---- Conditioning (seconds) ----
  ["march_in_place", { name: "Yerinde tempolu yürüyüş", how: "Kollarını sallayarak, dizlerini kalça hizasına doğru kaldırarak yerinde yürü.", cues: ["Dik dur", "Tempoyu yavaş yavaş artır"], primary: ["legs"], secondary: ["core"], unit: "seconds", category: "conditioning", min: 30, max: 60, pattern: "conditioning", difficulty: 1, impact: "low", restSec: 15 }],
  ["step_jack", { name: "Adım açma (zıplamasız jumping jack)", how: "Bir ayağını yana açarken kollarını başının üstüne kaldır; diğer tarafa geç.", cues: ["Ritmik ve hızlı", "Dizler yumuşak"], primary: ["legs", "shoulders"], secondary: [], unit: "seconds", category: "conditioning", min: 20, max: 45, pattern: "conditioning", difficulty: 1, impact: "low", restSec: 15 }],
  ["squat_to_calf_raise", { name: "Squat + parmak ucu", how: "Squat yap, kalkarken parmak uçlarına yüksel.", cues: ["Akıcı bir hareket", "Squatta topuklar yerde"], primary: ["legs", "glutes"], secondary: [], unit: "seconds", category: "conditioning", min: 20, max: 45, pattern: "conditioning", difficulty: 2, impact: "low", restSec: 15 }],
  ["skater_step", { name: "Kayakçı adımı", how: "Yana büyük bir adım at, arka ayağı çaprazına götür; diğer tarafa geç.", cues: ["Kalçayı alçak tut", "Zıplamadan da olur"], primary: ["legs", "glutes"], secondary: ["core"], unit: "seconds", category: "conditioning", min: 20, max: 45, pattern: "conditioning", difficulty: 2, impact: "low", restSec: 15 }],
  ["mountain_climber_slow", { name: "Yavaş dağcı", how: "Şınav pozisyonunda dizlerini sırayla göğsüne çek.", cues: ["Kalça omuz hizasında", "Hızdan önce form"], primary: ["core"], secondary: ["shoulders", "legs"], equipment: ["mat"], unit: "seconds", category: "conditioning", min: 20, max: 40, pattern: "conditioning", difficulty: 2, impact: "low", restSec: 15 }],
  ["burpee_no_jump", { name: "Zıplamasız burpee", how: "Çömel, ellerini yere koy, ayaklarını geri at, geri topla ve ayağa kalk.", cues: ["Ayaklarını tek tek de atabilirsin", "Sırtı sarkıtma"], primary: ["legs", "chest"], secondary: ["core", "shoulders"], unit: "seconds", category: "conditioning", min: 20, max: 40, pattern: "conditioning", difficulty: 3, impact: "low", restSec: 20 }],
  ["high_knees", { name: "Yüksek diz", how: "Yerinde koşar gibi dizlerini kalça hizasına kaldır.", cues: ["Parmak uçlarında yumuşak bas", "Kollar da çalışsın"], primary: ["legs"], secondary: ["core"], unit: "seconds", category: "conditioning", min: 20, max: 40, pattern: "conditioning", difficulty: 3, impact: "high", restSec: 20 }],
  ["jumping_jack", { name: "Jumping jack", how: "Zıplayarak ayakları açıp kapat, kollar baş üstünde birleşsin.", cues: ["Yumuşak in", "Dizler kilitli değil"], primary: ["legs", "shoulders"], secondary: [], unit: "seconds", category: "conditioning", min: 20, max: 45, pattern: "conditioning", difficulty: 2, impact: "high", restSec: 15 }],
  ["squat_jump", { name: "Squat sıçrama", how: "Yarım squat yap, patlayıcı şekilde sıçra, yumuşak in.", cues: ["İnişte dizler içe kaçmasın", "Sessiz in"], primary: ["legs", "glutes"], secondary: [], unit: "seconds", category: "conditioning", min: 15, max: 30, pattern: "conditioning", difficulty: 4, impact: "high", restSec: 30 }],

  // ---- Mobility (warm-up) ----
  ["arm_circles", { name: "Kol çevirme", how: "Kollar yana açık, küçükten büyüğe daireler çiz; yön değiştir.", cues: ["Omuzlar gevşek", "Daireleri büyüt"], primary: ["shoulders"], secondary: [], unit: "seconds", category: "mobility", min: 20, max: 30, pattern: "mobility", difficulty: 1, restSec: 0 }],
  ["cat_cow", { name: "Kedi-inek", how: "Dört ayak üstünde sırtını yavaşça yuvarla, sonra çukurlaştır.", cues: ["Nefesle eşleştir", "Acele etme"], primary: ["core", "back"], secondary: [], equipment: ["mat"], category: "mobility", min: 6, max: 8, pattern: "mobility", difficulty: 1, restSec: 0 }],
  ["worlds_greatest_stretch", { name: "Dünyanın en iyi esnemesi", how: "Geniş lunge pozisyonunda ön ayağın yanına elini koy, diğer kolu tavana aç.", cues: ["Arka diz yerde olabilir", "Göğsü tavana çevir"], primary: ["legs", "glutes", "back"], secondary: [], equipment: ["mat"], perSide: true, category: "mobility", min: 3, max: 5, pattern: "mobility", difficulty: 1, restSec: 0 }],
  ["leg_swings", { name: "Bacak sallama", how: "Duvara tutun, bacağını önden arkaya rahatça salla.", cues: ["Gövde dik", "Salınımı yavaş büyüt"], primary: ["legs", "glutes"], secondary: [], props: ["wall"], perSide: true, category: "mobility", min: 10, max: 12, pattern: "mobility", difficulty: 1, restSec: 0 }],
  ["ankle_rocks", { name: "Ayak bileği öne-arka", how: "Bir ayak önde, dizini ayak ucunun üstünden öne doğru it ve geri gel.", cues: ["Topuk yerde kalsın", "Yavaş ve ritmik"], primary: ["legs"], secondary: [], perSide: true, category: "mobility", min: 10, max: 10, pattern: "mobility", difficulty: 1, restSec: 0 }],
  ["scap_pushup", { name: "Kürek kemiği şınavı", how: "Şınav pozisyonunda kolları bükmeden, kürek kemiklerini birbirine yaklaştır ve uzaklaştır.", cues: ["Dirsekler düz", "Küçük ama tam hareket"], primary: ["shoulders", "back"], secondary: [], equipment: ["mat"], category: "mobility", min: 8, max: 12, pattern: "mobility", difficulty: 1, restSec: 0 }],
  ["thoracic_open_book", { name: "Açılan kitap (göğüs rotasyonu)", how: "Yan yat, dizler bükük, kollar önde; üstteki kolu açarak göğsünü tavana çevir.", cues: ["Dizler birbirinden ayrılmasın", "Gözlerin elini takip etsin"], primary: ["back"], secondary: ["chest"], equipment: ["mat"], perSide: true, category: "mobility", min: 6, max: 8, pattern: "mobility", difficulty: 1, restSec: 0 }],

  // ---- Stretch (cool-down) ----
  ["hip_flexor_stretch", { name: "Kalça önü esnetme", how: "Bir diz yerde, diğer ayak önde; kalçanı sık ve hafifçe öne kaydır.", cues: ["Bel çukurlaşmasın", "Arka bacağın kalça önünde gerilme"], primary: ["legs"], secondary: [], equipment: ["mat"], unit: "seconds", perSide: true, category: "stretch", min: 30, max: 45, pattern: "stretch", difficulty: 1, restSec: 0 }],
  ["hamstring_stretch", { name: "Arka bacak esnetme", how: "Sırt üstü yat, bir bacağı düz şekilde yukarı kaldır, havluyla ya da ellerinle tut.", cues: ["Diz hafif bükük olabilir", "Zorlama, nefes al"], primary: ["legs"], secondary: [], equipment: ["mat"], props: ["towel"], unit: "seconds", perSide: true, category: "stretch", min: 30, max: 45, pattern: "stretch", difficulty: 1, restSec: 0 }],
  ["figure_four_stretch", { name: "4 esnetmesi (kalça)", how: "Sırt üstü, bir ayak bileğini diğer dizin üstüne koy, alttaki bacağı göğsüne çek.", cues: ["Baş ve omuzlar yerde", "Kalçanın dışında gerilme"], primary: ["glutes"], secondary: [], equipment: ["mat"], unit: "seconds", perSide: true, category: "stretch", min: 30, max: 45, pattern: "stretch", difficulty: 1, restSec: 0 }],
  ["doorway_chest_stretch", { name: "Kapı kasasında göğüs esnetme", how: "Ön kolunu kapı kasasına yasla, gövdeni hafifçe öne ve karşıya çevir.", cues: ["Dirsek omuz hizasında", "Omuz öne kaçmasın"], primary: ["chest", "shoulders"], secondary: [], props: ["door"], unit: "seconds", perSide: true, category: "stretch", min: 30, max: 30, pattern: "stretch", difficulty: 1, restSec: 0 }],
  ["childs_pose", { name: "Çocuk pozu", how: "Dizlerin üstüne otur, kollarını öne uzatıp alnını yere bırak.", cues: ["Nefesi sırtına gönder", "Kalça topuklara doğru"], primary: ["back"], secondary: [], equipment: ["mat"], unit: "seconds", category: "stretch", min: 45, max: 60, pattern: "stretch", difficulty: 1, restSec: 0 }],
  ["calf_stretch_wall", { name: "Duvarda baldır esnetme", how: "Ellerin duvarda, bir bacak geride düz, topuğu yere bastır.", cues: ["Arka ayak ucu ileri baksın", "Kalçayı öne ver"], primary: ["legs"], secondary: [], props: ["wall"], unit: "seconds", perSide: true, category: "stretch", min: 30, max: 30, pattern: "stretch", difficulty: 1, restSec: 0 }],
  ["quad_stretch_standing", { name: "Ayakta ön bacak esnetme", how: "Duvara tutun, ayak bileğini tutup topuğunu kalçana çek.", cues: ["Dizler yan yana", "Kalçanı hafif öne it"], primary: ["legs"], secondary: [], props: ["wall"], unit: "seconds", perSide: true, category: "stretch", min: 30, max: 30, pattern: "stretch", difficulty: 1, restSec: 0 }],
  ["box_breathing", { name: "Kutu nefes (4-4-4-4)", how: "4 sn nefes al, 4 sn tut, 4 sn ver, 4 sn bekle.", cues: ["Burundan al", "Omuzlar gevşek"], primary: ["core"], secondary: [], unit: "seconds", category: "stretch", min: 60, max: 90, pattern: "stretch", difficulty: 1, restSec: 0 }],
];

function build(): Record<string, Exercise> {
  const out: Record<string, Exercise> = {};
  for (const [id, e] of LIST) {
    out[id] = {
      id,
      name: e.name,
      how: e.how,
      cues: e.cues,
      primary: e.primary,
      secondary: e.secondary ?? [],
      equipment: e.equipment ?? ["bodyweight"],
      props: e.props,
      unit: e.unit ?? "reps",
      perSide: e.perSide,
      min: e.min,
      max: e.max,
      restSec: e.restSec ?? 60,
      category: e.category ?? "strength",
      pattern: e.pattern,
      difficulty: e.difficulty,
      impact: e.impact,
      tempo: e.tempo,
    };
  }
  return out;
}

export const EXERCISES: Record<string, Exercise> = build();

// ---------------------------------------------------------------------------
// Progression ladders (easier -> harder). Ids are stable; append new steps at the end.
// ---------------------------------------------------------------------------

export const LADDERS: Record<string, Ladder> = {
  squat: { id: "squat", name: "Squat", pattern: "squat", steps: ["squat_chair_sit_stand", "squat_bodyweight", "squat_tempo", "squat_goblet", "squat_goblet_pause", "squat_goblet_1_5"] },
  single_leg: { id: "single_leg", name: "Tek bacak (lunge / split squat)", pattern: "single_leg", steps: ["lunge_reverse_supported", "lunge_reverse", "split_squat", "lunge_reverse_db", "bulgarian_split_squat", "bulgarian_split_squat_db", "bulgarian_split_squat_1_5"] },
  step_up: { id: "step_up", name: "Basamağa çıkış", pattern: "single_leg", steps: ["step_up_low", "step_up_high", "step_up_db"] },
  hinge: { id: "hinge", name: "Kalça menteşesi (RDL)", pattern: "hinge", steps: ["hip_hinge_drill", "rdl_db", "rdl_db_tempo", "rdl_single_leg_supported", "rdl_single_leg_db"] },
  glute_bridge: { id: "glute_bridge", name: "Kalça köprüsü / hip thrust", pattern: "glute_bridge", steps: ["glute_bridge", "glute_bridge_pause", "glute_bridge_db", "hip_thrust_db", "glute_bridge_single_leg", "hip_thrust_single_leg"] },
  hamstring_curl: { id: "hamstring_curl", name: "Arka bacak bükme", pattern: "hamstring_curl", steps: ["bridge_walkout", "leg_curl_towel", "leg_curl_towel_single"] },
  push_horizontal: { id: "push_horizontal", name: "Şınav", pattern: "push_horizontal", steps: ["pushup_wall", "pushup_counter", "pushup_incline_low", "pushup_knee", "pushup", "pushup_tempo", "pushup_feet_elevated", "pushup_deficit", "pushup_backpack"] },
  press_db: { id: "press_db", name: "Dambıl göğüs press", pattern: "push_horizontal", steps: ["floor_press_db", "floor_press_db_pause"] },
  fly_db: { id: "fly_db", name: "Göğüs fly", pattern: "push_horizontal", steps: ["floor_fly_db", "floor_fly_db_tempo"] },
  ohp_db: { id: "ohp_db", name: "Dambıl omuz press", pattern: "push_vertical", steps: ["ohp_db_seated", "ohp_db_standing", "ohp_db_single_arm"] },
  pike: { id: "pike", name: "Pike şınav", pattern: "push_vertical", steps: ["pike_pushup", "pike_pushup_elevated", "pike_pushup_deficit"] },
  row_db: { id: "row_db", name: "Dambıl row", pattern: "pull_horizontal", steps: ["row_db_bent_two_arm", "row_db_single_arm", "row_db_single_arm_pause", "row_db_single_arm_tempo"] },
  row_bodyweight: { id: "row_bodyweight", name: "Ters kürek", pattern: "pull_horizontal", steps: ["row_towel_door", "row_inverted_table_bent", "row_inverted_table", "row_inverted_table_feet_elevated"] },
  rear_delt: { id: "rear_delt", name: "Arka omuz", pattern: "rear_delt", steps: ["prone_y_raise", "reverse_fly_db", "reverse_fly_db_pause"] },
  lateral_raise: { id: "lateral_raise", name: "Yana açış", pattern: "lateral_raise", steps: ["lateral_raise_db", "lateral_raise_db_tempo", "lateral_raise_lean_away"] },
  biceps: { id: "biceps", name: "Ön kol (biceps)", pattern: "biceps", steps: ["curl_db", "curl_hammer", "curl_db_slow_eccentric"] },
  triceps_bw: { id: "triceps_bw", name: "Arka kol (vücut ağırlığı)", pattern: "triceps", steps: ["dips_chair_bent", "dips_chair_straight", "pushup_close"] },
  triceps_db: { id: "triceps_db", name: "Arka kol (dambıl)", pattern: "triceps", steps: ["kickback_db", "overhead_extension_db", "overhead_extension_db_tempo"] },
  calves: { id: "calves", name: "Baldır", pattern: "calves", steps: ["calf_raise", "calf_raise_single", "calf_raise_single_db"] },
  dead_bug: { id: "dead_bug", name: "Dead bug", pattern: "core_anti_extension", steps: ["dead_bug", "dead_bug_slow", "dead_bug_db"] },
  plank: { id: "plank", name: "Plank", pattern: "core_anti_extension", steps: ["plank_knee", "plank", "plank_shoulder_tap"] },
  hollow: { id: "hollow", name: "Hollow", pattern: "core_anti_extension", steps: ["hollow_tuck_hold", "hollow_hold"] },
  side_plank: { id: "side_plank", name: "Yan plank", pattern: "core_lateral", steps: ["side_plank_knee", "side_plank", "side_plank_hip_dip"] },
  bird_dog: { id: "bird_dog", name: "Bird dog", pattern: "core_anti_extension", steps: ["bird_dog", "bird_dog_hold"] },
  leg_raise: { id: "leg_raise", name: "Alt karın", pattern: "core_flexion", steps: ["reverse_crunch", "lying_leg_raise"] },
  hip_abduction: { id: "hip_abduction", name: "Kalça yanı", pattern: "hip_abduction", steps: ["clamshell", "side_lying_abduction", "side_lying_abduction_pause"] },
};

// ---------------------------------------------------------------------------
// Warm-ups and cool-downs
// ---------------------------------------------------------------------------

export const ROUTINES: Record<string, Routine> = {
  warmup_full: {
    id: "warmup_full",
    title: "Isınma (tüm vücut)",
    minutes: 6,
    steps: [
      { exercise: "march_in_place", seconds: 60 },
      { exercise: "arm_circles", seconds: 30 },
      { exercise: "cat_cow", reps: 6 },
      { exercise: "worlds_greatest_stretch", reps: 3, perSide: true },
      { exercise: "scap_pushup", reps: 8 },
      { exercise: "squat_bodyweight", reps: 10 },
      { exercise: "glute_bridge", reps: 10 },
    ],
    closing: "İlk hareketin bir setini, hedefin yarısı kadar tekrarla ve rahat yap.",
  },
  warmup_lower: {
    id: "warmup_lower",
    title: "Isınma (bacak ağırlıklı)",
    minutes: 6,
    steps: [
      { exercise: "march_in_place", seconds: 60 },
      { exercise: "leg_swings", reps: 10, perSide: true },
      { exercise: "ankle_rocks", reps: 10, perSide: true },
      { exercise: "worlds_greatest_stretch", reps: 3, perSide: true },
      { exercise: "hip_hinge_drill", reps: 8 },
      { exercise: "squat_bodyweight", reps: 10 },
      { exercise: "glute_bridge", reps: 10 },
    ],
    closing: "İlk hareketin bir setini, hedefin yarısı kadar tekrarla ve rahat yap.",
  },
  warmup_run: {
    id: "warmup_run",
    title: "Koşu öncesi ısınma",
    minutes: 3,
    steps: [
      { exercise: "leg_swings", reps: 10, perSide: true },
      { exercise: "ankle_rocks", reps: 10, perSide: true },
      { exercise: "march_in_place", seconds: 30 },
    ],
    closing: "Sonra 5 dakika tempolu yürüyüşle başla.",
  },
  cooldown_full: {
    id: "cooldown_full",
    title: "Soğuma ve esneme",
    minutes: 5,
    steps: [
      { exercise: "hip_flexor_stretch", seconds: 30, perSide: true },
      { exercise: "hamstring_stretch", seconds: 30, perSide: true },
      { exercise: "figure_four_stretch", seconds: 30, perSide: true },
      { exercise: "doorway_chest_stretch", seconds: 30, perSide: true },
      { exercise: "childs_pose", seconds: 45 },
      { exercise: "box_breathing", seconds: 60 },
    ],
  },
  cooldown_run: {
    id: "cooldown_run",
    title: "Koşu sonrası esneme",
    minutes: 4,
    steps: [
      { exercise: "calf_stretch_wall", seconds: 30, perSide: true },
      { exercise: "quad_stretch_standing", seconds: 30, perSide: true },
      { exercise: "hip_flexor_stretch", seconds: 30, perSide: true },
      { exercise: "hamstring_stretch", seconds: 30, perSide: true },
    ],
  },
};

// ---------------------------------------------------------------------------
// Benchmarks: week 1 baseline, week 12 retest (plus tape measures from body.ts)
// ---------------------------------------------------------------------------

export const BENCHMARKS: Benchmark[] = [
  { id: "max_pushups", name: "En çok şınav (kendi seviyende)", how: "Şınav merdiveninde şu an yaptığın varyasyonla, form bozulana kadar tek set.", unit: "reps", users: ["tolga", "eylul"] },
  { id: "plank_hold", name: "En uzun plank", how: "Plank (Eylül dizden başlayabilir), bel çukurlaşınca dur.", unit: "seconds", users: ["tolga", "eylul"] },
  { id: "squat_60s", name: "60 saniyede squat", how: "Vücut ağırlığı squat, kalça diz hizasına insin.", unit: "reps", users: ["tolga", "eylul"] },
  { id: "row_max", name: "En çok ters kürek", how: "Masa altı ters kürekte (dizler bükük) form bozulana kadar.", unit: "reps", users: ["tolga"] },
  { id: "walk_12min", name: "12 dakikada yürüyüş mesafesi", how: "Sahilde düz bir parkurda 12 dakika olabildiğince hızlı yürü; telefondan mesafeyi oku.", unit: "meters", users: ["eylul"] },
];

// ---------------------------------------------------------------------------
// Tolga: 12-week hypertrophy, 3 full-body sessions/week
// ---------------------------------------------------------------------------

const TOLGA_TEMPLATES: SessionTemplate[] = [
  {
    id: "t_A",
    title: "Tüm vücut A",
    subtitle: "Squat, şınav, row, omuz, kol",
    warmup: "warmup_full",
    cooldown: "cooldown_full",
    met: 5.0,
    slots: [
      { ladder: "squat", role: "main", startStep: 1, restSec: 90 },
      { ladder: "push_horizontal", role: "main", pair: "A", startStep: 4 },
      { ladder: "row_db", role: "main", pair: "A", startStep: 1 },
      { ladder: "lateral_raise", role: "accessory", pair: "B", startStep: 0 },
      { ladder: "biceps", role: "accessory", pair: "B", startStep: 0 },
      { ladder: "hollow", role: "core", startStep: 0 },
    ],
  },
  {
    id: "t_B",
    title: "Tüm vücut B",
    subtitle: "Tek bacak, pike, ters kürek, kalça, arka kol",
    warmup: "warmup_lower",
    cooldown: "cooldown_full",
    met: 5.0,
    slots: [
      { ladder: "single_leg", role: "main", startStep: 1, restSec: 75 },
      { ladder: "pike", role: "main", pair: "A", startStep: 0 },
      { ladder: "row_bodyweight", role: "main", pair: "A", startStep: 1 },
      { ladder: "glute_bridge", role: "accessory", startStep: 2 },
      { ladder: "triceps_db", role: "accessory", pair: "B", startStep: 1 },
      { ladder: "fly_db", role: "accessory", pair: "B", startStep: 0 },
      { ladder: "calves", role: "accessory", startStep: 1, note: "Baldırı dinlenme aralarında da yapabilirsin." },
    ],
  },
  {
    id: "t_C",
    title: "Tüm vücut C",
    subtitle: "RDL, göğüs press, row, basamak, arka omuz",
    warmup: "warmup_lower",
    cooldown: "cooldown_full",
    met: 5.0,
    slots: [
      { ladder: "hinge", role: "main", startStep: 1, restSec: 90 },
      { ladder: "press_db", role: "main", pair: "A", startStep: 0, note: "Dambıllar hafifse aynı yerde şınav merdivenindeki seviyeni kullan." },
      { ladder: "row_db", role: "main", pair: "A", startStep: 1 },
      { ladder: "step_up", role: "accessory", startStep: 1 },
      { ladder: "rear_delt", role: "accessory", pair: "B", startStep: 1 },
      { ladder: "biceps", role: "accessory", pair: "B", startStep: 1 },
      { ladder: "leg_raise", role: "core", startStep: 0 },
    ],
  },
];

const TOLGA_PHASES: Phase[] = [
  {
    id: "t_learn",
    name: "Temel",
    weeks: [1, 2, 3],
    goal: "Hareketleri öğren, merdivende doğru seviyeyi bul.",
    sets: { main: 2, accessory: 2, core: 2 },
    rir: { main: [2, 3], accessory: [2, 3], core: [2, 3] },
    deload: false,
    note: "Her sette 2-3 tekrar daha yapabilecek gibi bitir. Form her şeyden önce.",
  },
  {
    id: "t_build",
    name: "Gelişim",
    weeks: [4, 5, 6, 7],
    goal: "Hacmi artır, her hafta tekrar ya da seviye ekle.",
    sets: { main: 3, accessory: 3, core: 2 },
    rir: { main: [1, 2], accessory: [1, 2], core: [1, 2] },
    deload: false,
    note: "Her sette 1-2 tekrar kalana kadar git. Tüm setlerde üst sınıra ulaşınca seviye atla.",
  },
  {
    id: "t_deload",
    name: "Hafif hafta",
    weeks: [8],
    goal: "Toparlan; kaslar bu hafta büyür.",
    sets: { main: 2, accessory: 1, core: 1 },
    rir: { main: [3, 4], accessory: [3, 4], core: [3, 4] },
    deload: true,
    note: "Aynı seviyeler, daha az set, rahat bitir. Yemeyi azaltma.",
  },
  {
    id: "t_push",
    name: "Yüklenme",
    weeks: [9, 10, 11],
    goal: "En yüksek hacim; son setler tükenmeye yakın.",
    sets: { main: 4, accessory: 3, core: 2 },
    rir: { main: [1, 2], accessory: [0, 1], core: [1, 2] },
    deload: false,
    note: "Ana hareketlerde 4 set, 1-2 tekrar yedek. Yardımcı hareketlerin son setinde neredeyse tükenene kadar git.",
  },
  {
    id: "t_test",
    name: "Test ve toparlanma",
    weeks: [12],
    goal: "Ölç, karşılaştır, yeni bloka hazırlan.",
    sets: { main: 2, accessory: 2, core: 1 },
    rir: { main: [2, 3], accessory: [2, 3], core: [2, 3] },
    deload: true,
    note: "İlk seansta testleri yap, sonra hafif çalış. 1. haftayla karşılaştır.",
  },
];

// ---------------------------------------------------------------------------
// Eylül: 12-week fat loss + shape, 2 -> 3 full-body sessions/week, lower-body emphasis
// ---------------------------------------------------------------------------

const EYLUL_TEMPLATES: SessionTemplate[] = [
  {
    id: "e_A",
    title: "Güç A",
    subtitle: "Squat, kalça köprüsü, şınav, row, karın",
    warmup: "warmup_lower",
    cooldown: "cooldown_full",
    met: 4.5,
    slots: [
      { ladder: "squat", role: "main", startStep: 0, restSec: 75 },
      { ladder: "glute_bridge", role: "main", startStep: 0, restSec: 60 },
      { ladder: "push_horizontal", role: "accessory", pair: "A", startStep: 1 },
      { ladder: "row_db", role: "accessory", pair: "A", startStep: 0 },
      { ladder: "hip_abduction", role: "accessory", pair: "B", startStep: 0 },
      { ladder: "dead_bug", role: "core", pair: "B", startStep: 0 },
    ],
  },
  {
    id: "e_B",
    title: "Güç B",
    subtitle: "Lunge, RDL, omuz press, row, kol, yan karın",
    warmup: "warmup_lower",
    cooldown: "cooldown_full",
    met: 4.5,
    slots: [
      { ladder: "single_leg", role: "main", startStep: 0, restSec: 60 },
      { ladder: "hinge", role: "main", startStep: 0, restSec: 75 },
      { ladder: "ohp_db", role: "accessory", pair: "A", startStep: 0 },
      { ladder: "row_bodyweight", role: "accessory", pair: "A", startStep: 0 },
      { ladder: "triceps_db", role: "accessory", pair: "B", startStep: 0 },
      { ladder: "side_plank", role: "core", pair: "B", startStep: 0 },
    ],
  },
  {
    id: "e_C",
    title: "Güç C",
    subtitle: "Basamak, hip thrust, şınav, row, omuz, plank",
    warmup: "warmup_full",
    cooldown: "cooldown_full",
    met: 4.5,
    slots: [
      { ladder: "step_up", role: "main", startStep: 0, restSec: 60 },
      { ladder: "glute_bridge", role: "main", startStep: 1, restSec: 60 },
      { ladder: "push_horizontal", role: "accessory", pair: "A", startStep: 1 },
      { ladder: "row_db", role: "accessory", pair: "A", startStep: 0 },
      { ladder: "lateral_raise", role: "accessory", pair: "B", startStep: 0 },
      { ladder: "plank", role: "core", pair: "B", startStep: 0 },
    ],
  },
];

const EYLUL_PHASES: Phase[] = [
  {
    id: "e_start",
    name: "Alışma",
    weeks: [1, 2],
    goal: "Haftada 2 antrenman, alışkanlık kur.",
    sets: { main: 2, accessory: 1, core: 1 },
    rir: { main: [3, 4], accessory: [3, 4], core: [3, 4] },
    deload: false,
    note: "Rahat bitir, yorulmadan çık. Amaç gelmek, zorlamak değil.",
  },
  {
    id: "e_build",
    name: "Güçlenme",
    weeks: [3, 4, 5, 6, 7],
    goal: "Haftada 3 antrenman, setleri ve seviyeleri artır.",
    sets: { main: 3, accessory: 2, core: 2 },
    rir: { main: [2, 3], accessory: [2, 3], core: [2, 3] },
    deload: false,
    note: "Son 2 tekrar zor gelmeli ama form bozulmamalı.",
  },
  {
    id: "e_deload",
    name: "Hafif hafta",
    weeks: [8],
    goal: "Toparlan, yürüyüşleri koru.",
    sets: { main: 2, accessory: 1, core: 1 },
    rir: { main: [3, 4], accessory: [3, 4], core: [3, 4] },
    deload: true,
    note: "Daha az set, aynı seviye. Adımlarını düşürme.",
  },
  {
    id: "e_shape",
    name: "Şekillenme",
    weeks: [9, 10, 11],
    goal: "En yüksek hacim; kalça ve bacak hacmi en üstte.",
    sets: { main: 3, accessory: 3, core: 2 },
    rir: { main: [1, 2], accessory: [1, 2], core: [1, 2] },
    deload: false,
    note: "Son setler gerçekten zor olmalı. Bu haftalar planlı bakım kalorisine denk gelirse daha da iyi: antrenman en verimli burada.",
  },
  {
    id: "e_test",
    name: "Test ve ölçüm",
    weeks: [12],
    goal: "Ölç, fotoğraf çek, 1. haftayla karşılaştır.",
    sets: { main: 2, accessory: 2, core: 1 },
    rir: { main: [2, 3], accessory: [2, 3], core: [2, 3] },
    deload: true,
    note: "İlk seansta testleri yap; bel, kalça, uyluk ve kol ölçülerini al.",
  },
];

// ---------------------------------------------------------------------------
// Cardio: Eylül walk -> walk/run, Tolga optional easy conditioning
// ---------------------------------------------------------------------------

const m = (n: number) => n * 60;

function walkRun(id: string, title: string, rounds: number, runSec: number, walkSec: number, finalRun?: number): CardioSession {
  const segs: Segment[] = [{ kind: "brisk", sec: m(5), cue: "Tempolu yürüyüşle ısın" }];
  for (let i = 0; i < rounds; i++) {
    segs.push({ kind: "jog", sec: runSec, cue: "Hafif koş, konuşabilecek tempoda" });
    segs.push({ kind: "walk", sec: walkSec, cue: "Yürü, nefesini topla" });
  }
  if (finalRun) segs.push({ kind: "jog", sec: finalRun });
  segs.push({ kind: "walk", sec: m(5), cue: "Yavaş yürüyerek soğu" });
  return { id, title, feel: "Koşarken kısa cümleler kurabilmelisin. Nefesin kesilirse yürüyüşü uzat, bu başarısızlık değil.", segments: segs, rpe: [5, 7], cooldown: "cooldown_run" };
}

function walk(id: string, title: string, minutes: number, brisk: boolean): CardioSession {
  return {
    id,
    title,
    feel: brisk ? "Konuşabiliyorsun ama şarkı söyleyemiyorsun." : "Rahat tempo, sohbet ederek.",
    segments: [{ kind: brisk ? "brisk" : "walk", sec: m(minutes) }],
    rpe: brisk ? [4, 5] : [2, 3],
  };
}

export const CARDIO: Record<string, CardioSession> = {
  walk_brisk_20: walk("walk_brisk_20", "Sahilde tempolu yürüyüş 20 dk", 20, true),
  walk_brisk_25: walk("walk_brisk_25", "Sahilde tempolu yürüyüş 25 dk", 25, true),
  walk_brisk_30: walk("walk_brisk_30", "Sahilde tempolu yürüyüş 30 dk", 30, true),
  walk_easy_45: walk("walk_easy_45", "Birlikte uzun sahil yürüyüşü 45 dk", 45, false),
  walk_easy_30: walk("walk_easy_30", "Kolay yürüyüş 30 dk", 30, false),
  wr_1: walkRun("wr_1", "Yürü-koş 1: 8 x (1 dk koş / 1,5 dk yürü)", 8, 60, 90),
  wr_2: walkRun("wr_2", "Yürü-koş 2: 6 x (1,5 dk koş / 2 dk yürü)", 6, 90, 120),
  wr_3: walkRun("wr_3", "Yürü-koş 3: 6 x (2 dk koş / 1,5 dk yürü)", 6, 120, 90),
  wr_4: walkRun("wr_4", "Yürü-koş 4: 5 x (3 dk koş / 1,5 dk yürü)", 5, 180, 90),
  wr_deload: walkRun("wr_deload", "Hafif yürü-koş: 6 x (2 dk koş / 2 dk yürü)", 6, 120, 120),
  wr_5: walkRun("wr_5", "Yürü-koş 5: 4 x (5 dk koş / 2 dk yürü)", 4, m(5), 120),
  wr_6: walkRun("wr_6", "Yürü-koş 6: 3 x (8 dk koş / 2 dk yürü)", 3, m(8), 120),
  wr_7: walkRun("wr_7", "Yürü-koş 7: 2 x (12 dk koş / 2 dk yürü)", 2, m(12), 120),
  wr_test: walkRun("wr_test", "Hedef: 20 dk kesintisiz hafif koşu", 0, 0, 0, m(20)),
  // Tolga, optional; low interference with hypertrophy, extra kcal gets eaten back by the engine
  t_easy_walk: walk("t_easy_walk", "Eylül'le sahil yürüyüşü 30-45 dk", 40, false),
  t_easy_run: {
    id: "t_easy_run",
    title: "Kolay koşu 20 dk + 4 kısa hızlanma",
    feel: "Burnundan nefes alabileceğin tempo. Hızlanmalar 15 sn, sprint değil.",
    segments: [
      { kind: "brisk", sec: m(5) },
      { kind: "easy_run", sec: m(20) },
      { kind: "stride", sec: 15 },
      { kind: "walk", sec: 45 },
      { kind: "stride", sec: 15 },
      { kind: "walk", sec: 45 },
      { kind: "stride", sec: 15 },
      { kind: "walk", sec: 45 },
      { kind: "stride", sec: 15 },
      { kind: "walk", sec: m(3) },
    ],
    rpe: [3, 5],
    cooldown: "cooldown_run",
  },
};

/** Eylül's optional short low-impact interval circuit (from week 5, once a week, may replace a walk). */
export const CIRCUITS: Record<string, CircuitSession> = {
  e_hiit_low_1: {
    id: "e_hiit_low_1",
    title: "Zıplamasız 12 dk interval",
    feel: "Çalışma aralarında zorlan (10 üzerinden 7-8), dinlenmede tamamen yavaşla.",
    moves: ["march_in_place", "squat_to_calf_raise", "step_jack", "skater_step", "mountain_climber_slow", "burpee_no_jump"],
    workSec: 20,
    restSec: 40,
    rounds: 2,
    restBetweenRoundsSec: 60,
    met: 7.0,
  },
  e_hiit_low_2: {
    id: "e_hiit_low_2",
    title: "Zıplamasız 14 dk interval",
    feel: "Çalışma 30 sn, dinlenme 30 sn. Tempoyu ilk turda abartma.",
    moves: ["squat_to_calf_raise", "step_jack", "skater_step", "mountain_climber_slow", "burpee_no_jump", "march_in_place"],
    workSec: 30,
    restSec: 30,
    rounds: 2,
    restBetweenRoundsSec: 60,
    met: 7.5,
  },
};

// ---------------------------------------------------------------------------
// Plan builders
// ---------------------------------------------------------------------------

function phaseOf(phases: Phase[], week: number): Phase {
  for (const p of phases) if (p.weeks.indexOf(week) >= 0) return p;
  return phases[phases.length - 1];
}

function templateById(ts: SessionTemplate[], id: string): SessionTemplate {
  for (const t of ts) if (t.id === id) return t;
  throw new Error("unknown template " + id);
}

/** rough duration: warm-up + work + rest (supersets share rest) + cool-down */
function estimateMinutes(t: SessionTemplate, rx: Prescription[]): number {
  let sec = 0;
  const pairsSeen: Record<string, boolean> = {};
  for (const p of rx) {
    const first = EXERCISES[LADDERS[p.ladder].steps[p.startStep]];
    const work = first.unit === "seconds" ? (first.min + first.max) / 2 : 40;
    const sides = first.perSide ? 2 : 1;
    if (p.pair) {
      sec += p.sets * work * sides;
      if (!pairsSeen[p.pair]) {
        sec += p.sets * p.restSec;
        pairsSeen[p.pair] = true;
      }
    } else sec += p.sets * (work * sides + p.restSec);
  }
  sec += ROUTINES[t.warmup].minutes * 60 + ROUTINES[t.cooldown].minutes * 60 + 60;
  return Math.round(sec / 60 / 5) * 5;
}

function prescribe(t: SessionTemplate, ph: Phase, day: Weekday, tests?: string[]): PlannedSession {
  const rx: Prescription[] = t.slots.map((s) => {
    const first = EXERCISES[LADDERS[s.ladder].steps[s.startStep]];
    const baseRest = s.restSec ?? first.restSec;
    return {
      ladder: s.ladder,
      role: s.role,
      pair: s.pair,
      sets: ph.sets[s.role],
      rir: ph.rir[s.role],
      // in a superset you rest after the pair, so a little shorter per exercise
      restSec: s.pair ? Math.max(45, baseRest - 15) : baseRest,
      startStep: s.startStep,
      note: s.note,
    };
  });
  return { templateId: t.id, title: t.title, day, prescriptions: rx, estMinutes: estimateMinutes(t, rx), met: ph.deload ? t.met - 0.5 : t.met, tests };
}

const DAY_LABEL: Record<Weekday, string> = { pzt: "Pazartesi", sal: "Salı", car: "Çarşamba", per: "Perşembe", cum: "Cuma", cmt: "Cumartesi", paz: "Pazar" };
export { DAY_LABEL };

/** Engine-compatible step ramp: baseline + 500/week, 3000 floor, 9000 cap (lose); flat for gain. */
export function stepTargetFor(user: UserId, week: number, baseline: number): number {
  if (user === "tolga") return week <= 4 ? 7000 : 8000; // NEAT stays modest so the surplus survives
  const s = Math.round((baseline + 500 * (week - 1)) / 500) * 500;
  return Math.max(3000, Math.min(9000, s));
}

function buildTolga(): UserPlan {
  const weeks: PlanWeek[] = [];
  const ts = TOLGA_TEMPLATES;
  for (let w = 1; w <= 12; w++) {
    const ph = phaseOf(TOLGA_PHASES, w);
    const tests = w === 1 ? ["max_pushups", "plank_hold", "squat_60s", "row_max"] : w === 12 ? ["max_pushups", "plank_hold", "squat_60s", "row_max"] : undefined;
    const strength = [prescribe(templateById(ts, "t_A"), ph, "pzt", tests), prescribe(templateById(ts, "t_B"), ph, "car"), prescribe(templateById(ts, "t_C"), ph, "cum")];
    const runWeek = w >= 5 && !ph.deload;
    const cardio = runWeek ? [CARDIO.t_easy_walk, CARDIO.t_easy_run] : [CARDIO.t_easy_walk];
    const schedule: DayEntry[] = [
      { day: "pzt", kind: "strength", ref: "t_A", label: "Tüm vücut A" },
      { day: "sal", kind: "rest", label: "Dinlen, adımlarını tamamla" },
      { day: "car", kind: "strength", ref: "t_B", label: "Tüm vücut B" },
      runWeek
        ? { day: "per", kind: "cardio", ref: "t_easy_run", optional: true, label: "İstersen kolay koşu (bir shake ekle)" }
        : { day: "per", kind: "rest", label: "Dinlen" },
      { day: "cum", kind: "strength", ref: "t_C", label: "Tüm vücut C" },
      { day: "cmt", kind: "walk", ref: "t_easy_walk", optional: true, together: true, label: "Eylül'le sahil yürüyüşü" },
      { day: "paz", kind: "rest", label: "Tam dinlenme" },
    ];
    weeks.push({
      week: w,
      phaseId: ph.id,
      deload: ph.deload,
      strength,
      cardio,
      circuits: [],
      stepTarget: stepTargetFor("tolga", w, 6000),
      schedule,
      coachNote: tolgaNote(w, ph),
    });
  }
  return {
    user: "tolga",
    title: "12 haftada kas: evde tüm vücut",
    goal: "Ağırlıklı olarak kas olmak üzere kilo almak (haftada 0,25-0,5 kg).",
    sessionsPerWeek: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    phases: TOLGA_PHASES,
    templates: ts,
    weeks,
    volumeTargets: { t_learn: 8, t_build: 12, t_deload: 6, t_push: 15, t_test: 8 },
  };
}

function tolgaNote(w: number, ph: Phase): string {
  if (w === 1) return "İlk seansta testleri yap. Her harekette seviyeni bul: 2-3 tekrar yedekle hedef aralığın içinde kalabildiğin en zor varyasyon.";
  if (w === 4) return "Setler 3'e çıktı. Kilo trendine bak: haftada 0,25 kg'ın altındaysan bir öğün daha ekle, kas kalorisiz büyümez.";
  if (w === 8) return "Hafif hafta. Daha az set ama aynı yemek. Eklemlerin ve kafan dinlensin.";
  if (w === 9) return "En ağır blok. Ana hareketler 4 set; uyku 7 saatin altına düşerse hazırlık kontrolü seansı otomatik hafifletir.";
  if (w === 12) return "Testleri tekrarla ve 1. haftayla karşılaştır. Sonraki 12 hafta aynı yapıyla, daha yüksek basamaklardan devam eder.";
  return ph.note;
}

function buildEylul(): UserPlan {
  const weeks: PlanWeek[] = [];
  const ts = EYLUL_TEMPLATES;
  // walk/run ladder: weeks 1-3 walking base, weeks 4-12 run-walk
  const wr: Record<number, string> = { 4: "wr_1", 5: "wr_2", 6: "wr_3", 7: "wr_4", 8: "wr_deload", 9: "wr_5", 10: "wr_6", 11: "wr_7", 12: "wr_test" };
  const brisk: Record<number, string> = { 1: "walk_brisk_20", 2: "walk_brisk_25", 3: "walk_brisk_30" };
  for (let w = 1; w <= 12; w++) {
    const ph = phaseOf(EYLUL_PHASES, w);
    const tests = w === 1 || w === 12 ? ["max_pushups", "plank_hold", "squat_60s", "walk_12min"] : undefined;
    const two = w <= 2;
    const strength = two
      ? [prescribe(templateById(ts, "e_A"), ph, "pzt", tests), prescribe(templateById(ts, "e_B"), ph, "per")]
      : [prescribe(templateById(ts, "e_A"), ph, "pzt", tests), prescribe(templateById(ts, "e_B"), ph, "car"), prescribe(templateById(ts, "e_C"), ph, "cum")];
    const mainCardio = w <= 3 ? CARDIO[brisk[w]] : CARDIO[wr[w]];
    const cardio: CardioSession[] = [mainCardio, CARDIO.walk_easy_45];
    const circuits: CircuitSession[] = w >= 5 && !ph.deload ? [w >= 9 ? CIRCUITS.e_hiit_low_2 : CIRCUITS.e_hiit_low_1] : [];
    const cardioKind: DayKind = w <= 3 ? "walk" : "cardio";
    const schedule: DayEntry[] = two
      ? [
          { day: "pzt", kind: "strength", ref: "e_A", label: "Güç A" },
          { day: "sal", kind: "walk", ref: mainCardio.id, label: mainCardio.title },
          { day: "car", kind: "rest", label: "Dinlen, adım hedefini tamamla" },
          { day: "per", kind: "strength", ref: "e_B", label: "Güç B" },
          { day: "cum", kind: "walk", ref: mainCardio.id, label: mainCardio.title },
          { day: "cmt", kind: "walk", ref: "walk_easy_45", together: true, label: "Tolga'yla uzun sahil yürüyüşü" },
          { day: "paz", kind: "rest", label: "Dinlen" },
        ]
      : [
          { day: "pzt", kind: "strength", ref: "e_A", label: "Güç A" },
          { day: "sal", kind: cardioKind, ref: mainCardio.id, label: mainCardio.title },
          { day: "car", kind: "strength", ref: "e_B", label: "Güç B" },
          circuits.length
            ? { day: "per", kind: "circuit", ref: circuits[0].id, optional: true, label: circuits[0].title + " (istersen; yoksa 30 dk yürüyüş)" }
            : { day: "per", kind: "walk", ref: "walk_easy_30", label: "Kolay yürüyüş 30 dk" },
          { day: "cum", kind: "strength", ref: "e_C", label: "Güç C" },
          { day: "cmt", kind: cardioKind, ref: mainCardio.id, together: true, label: mainCardio.title + " (Tolga'yla)" },
          { day: "paz", kind: "walk", ref: "walk_easy_45", optional: true, together: true, label: "Uzun kolay yürüyüş" },
        ];
    weeks.push({
      week: w,
      phaseId: ph.id,
      deload: ph.deload,
      strength,
      cardio,
      circuits,
      stepTarget: stepTargetFor("eylul", w, 4000),
      schedule,
      coachNote: eylulNote(w, ph),
    });
  }
  return {
    user: "eylul",
    title: "12 haftada sıkılaş: evde güç + sahil",
    goal: "Kası koruyarak yağ yakmak; bel, kalça, uyluk ve kollarda görünür değişim.",
    sessionsPerWeek: [2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    phases: EYLUL_PHASES,
    templates: ts,
    weeks,
    volumeTargets: { e_start: 4, e_build: 8, e_deload: 5, e_shape: 10, e_test: 6 },
  };
}

function eylulNote(w: number, ph: Phase): string {
  if (w === 1) return "İlk seansta testleri yap, ölçülerini ve fotoğrafını al. Bu hafta sadece 2 antrenman: gelmek yeter.";
  if (w === 3) return "Artık haftada 3 antrenman. 30 dakikayı geçmiyor; zor gün geçirirsen mini antrenman da seriyi korur.";
  if (w === 4) return "Yürü-koş başlıyor. Bir seans zor geldiyse haftayı tekrar et, takvim beklemez değil, bekler.";
  if (w === 8) return "Hafif hafta. Setler azaldı, adımlar ve yemek düzeni aynı.";
  if (w === 9) return "En verimli blok. Kalça ve bacak setleri en üstte; ölçüler tartıdan daha çok şey söyler.";
  if (w === 12) return "Testleri tekrarla, ölçü ve fotoğrafı 1. haftayla yan yana koy. 20 dakika kesintisiz koşu hedefi bu hafta.";
  return ph.note;
}

export const PLANS: Record<UserId, UserPlan> = { tolga: buildTolga(), eylul: buildEylul() };

// ---------------------------------------------------------------------------
// Readiness (both users) and cycle-aware option (Eylül). No automatic phase-based changes.
// ---------------------------------------------------------------------------

export interface ReadinessInput {
  sleepHours?: number;
  /** 1 (bitkin) .. 5 (çok iyi) */
  energy: 1 | 2 | 3 | 4 | 5;
  /** 0 yok, 1 hafif, 2 belirgin kas ağrısı */
  soreness: 0 | 1 | 2;
  /** user chose "adet ağrım var / bugün kötüyüm" (only offered to the cycle tracker) */
  periodSymptoms?: boolean;
  pain?: boolean; // joint pain or sharp pain: never train through it
}

export interface ReadinessResult {
  mode: "normal" | "light" | "swap_walk" | "rest";
  setsDelta: number;
  rirDelta: number;
  message: string;
}

export function readiness(r: ReadinessInput): ReadinessResult {
  if (r.pain) return { mode: "rest", setsDelta: 0, rirDelta: 0, message: "Eklem ya da keskin ağrı varsa bugün antrenman yok. 2-3 gün sürerse bir uzmana görün." };
  let score = r.energy;
  if (r.sleepHours !== undefined && r.sleepHours < 6) score -= 1;
  if (r.soreness === 2) score -= 1;
  if (r.periodSymptoms) score -= 1;
  if (score <= 1) return { mode: "swap_walk", setsDelta: 0, rirDelta: 0, message: "Bugün kolay bir yürüyüş ya da 5 dakikalık mini antrenman yap. Seri bozulmaz." };
  if (score === 2) return { mode: "light", setsDelta: -1, rirDelta: 2, message: "Hafif gün: her harekette 1 set az, 2 tekrar daha fazla yedek. Seviyeler aynı kalır." };
  return { mode: "normal", setsDelta: 0, rirDelta: 0, message: "Hazırsın. Plana göre devam." };
}

/** Shown in the cycle screen; honest framing of the evidence. */
export const CYCLE_TRAINING_NOTE =
  "Araştırmalar adet döngüsünün antrenman performansına etkisinin çok küçük ve kişiden kişiye farklı olduğunu gösteriyor. Bu yüzden program döngüne göre kendiliğinden değişmiyor. Kendini kötü hissettiğin günlerde antrenman öncesi 'bugün nasılsın' kontrolü seansı hafifletir. Birkaç döngü kaydedince, enerjinin hangi günlerde düştüğünü sana kendi verinden gösteririm.";

// ---------------------------------------------------------------------------
// Progression: double progression inside a step, then climb the ladder
// ---------------------------------------------------------------------------

export type Effort = "easy" | "right" | "hard"; // ~RIR 4+, 1-3, 0

export interface NextRx {
  step: number;
  exerciseId: string;
  /** per-set targets for next time (reps or seconds) */
  targets: number[];
  change: "level_up" | "level_down" | "add_reps" | "repeat" | "top_of_ladder";
  message: string;
}

/**
 * lastSets: what was done in each working set (reps or seconds, per side if perSide).
 * effort: the user's tap after the last set (optional).
 */
export function suggestNext(ladderId: string, step: number, lastSets: number[], effort?: Effort, prescribed?: number): NextRx {
  const ladder = LADDERS[ladderId];
  const s = Math.max(0, Math.min(ladder.steps.length - 1, step));
  const ex = EXERCISES[ladder.steps[s]];
  const done: number[] = [];
  for (const v of lastSets) if (v > 0) done.push(v);
  // a light day (fewer sets) must not count as "all sets at the top"
  const sets = Math.max(1, prescribed ?? lastSets.length);
  const inc = ex.unit === "seconds" ? 5 : 1;
  const fill = (n: number): number[] => {
    const out: number[] = [];
    for (let i = 0; i < sets; i++) out.push(n);
    return out;
  };
  if (!done.length) return { step: s, exerciseId: ex.id, targets: fill(ex.min), change: "repeat", message: "Geçen sefer kayıt yok; hedef aralığın altından başla." };

  let allTop = true;
  for (const v of done) if (v < ex.max) allTop = false;
  const first = done[0];

  if (allTop && done.length === sets && effort !== "hard") {
    if (s < ladder.steps.length - 1) {
      const nx = EXERCISES[ladder.steps[s + 1]];
      return { step: s + 1, exerciseId: nx.id, targets: fill(nx.min), change: "level_up", message: `Tüm setlerde üst sınıra ulaştın. Yeni seviye: ${nx.name}.` };
    }
    return { step: s, exerciseId: ex.id, targets: fill(ex.max), change: "top_of_ladder", message: "Merdivenin tepesindesin. Tempoyu yavaşlat, set ekle ya da daha ağır dambıl kullan." };
  }
  if (first < ex.min && (effort === "hard" || first < ex.min - 2 * inc) && s > 0) {
    const pv = EXERCISES[ladder.steps[s - 1]];
    return { step: s - 1, exerciseId: pv.id, targets: fill(Math.round((pv.min + pv.max) / 2)), change: "level_down", message: `Bu seviye şimdilik ağır. Bir basamak geri: ${pv.name}. Sorun değil, oradan daha hızlı çıkarsın.` };
  }
  if (effort === "hard") return { step: s, exerciseId: ex.id, targets: done.length === sets ? done : fill(first), change: "repeat", message: "Zor geldi: aynı hedefi tekrar et, bu sefer biraz daha temiz." };
  // add one rep (or 5 s) to the weakest sets first, capped at max
  const targets: number[] = [];
  for (let i = 0; i < sets; i++) {
    const v = lastSets[i] > 0 ? lastSets[i] : first;
    targets.push(Math.min(ex.max, Math.max(ex.min, v + inc)));
  }
  return { step: s, exerciseId: ex.id, targets, change: "add_reps", message: ex.unit === "seconds" ? "Her sete 5 saniye ekle." : "Her sete bir tekrar ekle." };
}

// ---------------------------------------------------------------------------
// PRs and kcal for the finish screen
// ---------------------------------------------------------------------------

export interface LadderBest {
  ladder: string;
  step: number;
  best: number; // best single set at that step
}

export type PRKind = "new_level" | "most_reps" | "longest_hold";

export interface PR {
  kind: PRKind;
  ladder: string;
  exerciseId: string;
  value: number;
  previous?: number;
}

/** Compare a finished exercise against the stored best for that ladder. */
export function detectPR(prev: LadderBest | undefined, ladder: string, step: number, sets: number[]): PR | null {
  let best = 0;
  for (const v of sets) if (v > best) best = v;
  if (best <= 0) return null;
  const ex = EXERCISES[LADDERS[ladder].steps[step]];
  if (!prev || step > prev.step) return prev ? { kind: "new_level", ladder, exerciseId: ex.id, value: best } : null; // first log is a baseline, not a PR
  if (step === prev.step && best > prev.best) return { kind: ex.unit === "seconds" ? "longest_hold" : "most_reps", ladder, exerciseId: ex.id, value: best, previous: prev.best };
  return null;
}

/** Net kcal above rest, same convention as src/lib/activity.ts: (MET - 1) x kg x hours. */
export function netKcal(met: number, kg: number, minutes: number): number {
  return Math.round(Math.max(0, met - 1) * kg * (minutes / 60));
}

const SEG_MET: Record<Segment["kind"], number> = { walk: 3.5, brisk: 4.3, jog: 7.0, easy_run: 8.3, stride: 10.0, rest: 1.3 };

export function cardioKcal(c: CardioSession, kg: number): { minutes: number; kcal: number } {
  let kcal = 0;
  let sec = 0;
  for (const s of c.segments) {
    sec += s.sec;
    kcal += Math.max(0, SEG_MET[s.kind] - 1) * kg * (s.sec / 3600);
  }
  return { minutes: Math.round(sec / 60), kcal: Math.round(kcal) };
}

export function circuitMinutes(c: CircuitSession): number {
  const sec = c.rounds * c.moves.length * (c.workSec + c.restSec) + (c.rounds - 1) * c.restBetweenRoundsSec;
  return Math.round(sec / 60);
}

// ---------------------------------------------------------------------------
// Fractional weekly volume for a planned session (direct 1, indirect 0.5)
// ---------------------------------------------------------------------------

export function sessionVolume(ps: PlannedSession, steps?: Record<string, number>): Partial<Record<Muscle, number>> {
  const out: Partial<Record<Muscle, number>> = {};
  for (const p of ps.prescriptions) {
    const lad = LADDERS[p.ladder];
    const st = steps && steps[p.ladder] !== undefined ? steps[p.ladder] : p.startStep;
    const ex = EXERCISES[lad.steps[Math.min(lad.steps.length - 1, st)]];
    for (const mu of ex.primary) out[mu] = (out[mu] ?? 0) + p.sets;
    for (const mu of ex.secondary) out[mu] = (out[mu] ?? 0) + p.sets * 0.5;
  }
  return out;
}

export function weekVolume(pw: PlanWeek): Partial<Record<Muscle, number>> {
  const out: Partial<Record<Muscle, number>> = {};
  for (const s of pw.strength) {
    const v = sessionVolume(s);
    for (const k in v) {
      const mu = k as Muscle;
      out[mu] = (out[mu] ?? 0) + (v[mu] ?? 0);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Integrity check (cheap; call from a test or dev route)
// ---------------------------------------------------------------------------

export function validatePrograms(): string[] {
  const errs: string[] = [];
  for (const k in LADDERS) {
    const l = LADDERS[k];
    if (l.id !== k) errs.push("ladder id mismatch " + k);
    for (const id of l.steps) if (!EXERCISES[id]) errs.push(`ladder ${k}: missing exercise ${id}`);
  }
  for (const k in ROUTINES) for (const st of ROUTINES[k].steps) if (!EXERCISES[st.exercise]) errs.push(`routine ${k}: missing ${st.exercise}`);
  for (const k in CIRCUITS) for (const id of CIRCUITS[k].moves) if (!EXERCISES[id]) errs.push(`circuit ${k}: missing ${id}`);
  const users: UserId[] = ["tolga", "eylul"];
  for (const u of users) {
    const plan = PLANS[u];
    if (plan.weeks.length !== 12) errs.push(u + ": expected 12 weeks");
    for (const t of plan.templates) {
      if (!ROUTINES[t.warmup] || !ROUTINES[t.cooldown]) errs.push(`${t.id}: missing routine`);
      for (const s of t.slots) {
        const l = LADDERS[s.ladder];
        if (!l) errs.push(`${t.id}: missing ladder ${s.ladder}`);
        else if (s.startStep >= l.steps.length) errs.push(`${t.id}: startStep out of range on ${s.ladder}`);
      }
    }
  }
  return errs;
}
