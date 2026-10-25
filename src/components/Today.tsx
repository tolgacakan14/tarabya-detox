"use client";
import QuickLog from "./QuickLog";
import { TogetherStreak } from "./CoupleMeter";
import { usePhotoPicker } from "./PhotoAvatar";
import { WeighIn, WeightCharts } from "./Weight";
// Home: deliberately simple. Where am I (kg + progress bar), today's three rings, and the one next thing to do.
import { useApp, fmt, kg } from "./ui";
import Avatar, { moodFor } from "./Avatar";
import { Ring } from "./fx";
import { useMenu } from "./useMenu";
import { nextQuestions } from "@/lib/menu";
import { WATER_TARGET } from "@/lib/state-constants";
import { FOODS } from "@/lib/foods";
import { CycleMini } from "./Cycle";

function statusLine(goal: "gain" | "lose", rate: number | null, phase: string, weighIns: number, w: number) {
  if (weighIns < 4 || rate === null) return "Birkaç sabah tartıl, hızını hesaplayayım.";
  if (phase === "maintenance") return "Bakım dönemindesin, kilonu koruyorsun.";
  if (goal === "gain") {
    if (rate > 0.5) return "Hızlı alıyorsun, biraz yavaşlatalım.";
    if (rate >= 0.12) return "Sağlıklı hızda alıyorsun. Böyle devam!";
    if (rate > 0) return "Doğru yöndesin ama yavaş. Bir shake ekle.";
    return "Bu ara yerinde sayıyor. Öğünleri atlamayalım.";
  }
  if (rate < -0.007 * w) return "Çok hızlı veriyorsun, kalorini biraz artırdım.";
  if (rate <= -0.1) return "Sağlıklı hızda veriyorsun. Harika gidiyor!";
  if (rate < 0) return "Yavaş ama doğru yöndesin. Tartı dalgalanır, trende bak.";
  return "Bu hafta yerinde. Adımları biraz artıralım.";
}

export default function Today() {
  const { s } = useApp();
  return (
    <div className="grid grid-cols-1 gap-4 items-start">
      <div className="space-y-4">
        <ProgressHero />
        <WeighIn />
        <QuickLog />
        <RingsCard />
      </div>
      <div className="space-y-4">
        <NextUp />
        <WeightCharts compact />
        <CycleMini />
        <PartnerStrip />
        {s.engine.insights.filter((i) => i.tone === "warn").map((i, k) => (
          <p key={k} className="panel !py-3 text-sm" style={{ background: "var(--warn-soft)", color: "var(--warn)" }}>
            {i.text}
          </p>
        ))}
      </div>
    </div>
  );
}

function progressOf(goal: "gain" | "lose", start: number, current: number, target: number) {
  const change = current - start;
  const total = target - start;
  const pct = total === 0 ? 0 : Math.max(0, Math.min(1, change / total));
  const left = Math.max(0, goal === "gain" ? target - current : current - target);
  return { change, pct, left };
}

function ProgressHero() {
  const { s } = useApp();
  const p = s.profile;
  const e = s.engine;
  const { change, pct, left } = progressOf(p.goal, p.startWeight, e.currentWeight, p.targetWeight);
  const gain = p.goal === "gain";
  const good = gain ? change >= 0 : change <= 0;
  const sign = change > 0 ? "+" : change < 0 ? "−" : "";
  const photo = usePhotoPicker();

  return (
    <section className="panel !p-5 relative overflow-hidden">
      {photo.el}
      <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full grad-me opacity-15" aria-hidden />
      <div className="flex items-center gap-4">
        <button className="relative shrink-0 press rounded-full" onClick={photo.open} aria-label="Profil fotoğrafını değiştir">
          <Avatar who={s.user} mood={moodFor(s.todayScore.completion)} level={s.scores.me.level.index} size={104} />
          <span className="absolute -left-1 bottom-0 grid place-items-center w-8 h-8 rounded-full bg-white shadow text-sm" aria-hidden>
            📷
          </span>
        </button>
        <div>
          <p className="label">{gain ? "Aldığın kilo" : "Verdiğin kilo"}</p>
          <p className={`display font-bold leading-none num text-6xl ${good ? "text-grad" : ""}`}>
            {sign}
            {kg(Math.abs(change))}
            <span className="text-2xl font-semibold ml-1" style={{ color: "var(--ink-2)" }}>kg</span>
          </p>
        </div>
      </div>

      <div className="mt-6">
        <div className="relative h-6 rounded-full overflow-hidden" style={{ background: "var(--line)" }}>
          <div className="h-full rounded-full grad-me shine transition-[width] duration-1000" style={{ width: `${Math.max(4, pct * 100)}%` }} />
        </div>
        <div className="flex justify-between mt-2 text-sm num" style={{ color: "var(--ink-2)" }}>
          <span>{kg(p.startWeight)} kg</span>
          <span className="font-semibold" style={{ color: "var(--ink)" }}>
            Şimdi {kg(e.currentWeight)} kg
          </span>
          <span>Hedef {kg(p.targetWeight)} kg</span>
        </div>
      </div>

      <p className="mt-4 text-lg font-semibold">
        {left > 0 ? `Hedefe ${kg(left)} kg kaldı.` : "Hedefe ulaştın! 🎉"}{" "}
        <span className="font-normal" style={{ color: "var(--ink-2)" }}>
          {statusLine(p.goal, e.weeklyRate, e.phase, e.trend.length, e.currentWeight)}
        </span>
      </p>
    </section>
  );
}

function RingsCard() {
  const { s, act } = useApp();
  const t = s.engine.targets;
  return (
    <section className="panel">
      <div className="grid grid-cols-3 gap-2 justify-items-center">
        <div className="text-center">
          <Ring value={s.totals.kcal} max={t.kcal} colors={["#ff8a00", "#ff4d6d"]} label="Kalori">
            <div>
              <p className="display font-bold text-xl num leading-none">{fmt(s.totals.kcal)}</p>
              <p className="text-[11px]" style={{ color: "var(--ink-3)" }}>/ {fmt(t.kcal)}</p>
            </div>
          </Ring>
          <p className="text-sm font-semibold mt-1">Kalori</p>
        </div>
        <div className="text-center">
          <Ring value={s.totals.protein} max={t.protein} colors={["#8b5cf6", "#3a86ff"]} label="Protein">
            <div>
              <p className="display font-bold text-xl num leading-none">{fmt(s.totals.protein)}</p>
              <p className="text-[11px]" style={{ color: "var(--ink-3)" }}>/ {t.protein} g</p>
            </div>
          </Ring>
          <p className="text-sm font-semibold mt-1">Protein</p>
        </div>
        <button
          className="text-center press"
          onClick={() => act({ action: "water", delta: 1 }, { toast: "💧 Bir bardak su", points: s.water < WATER_TARGET ? 5 : 0, celebrate: s.water + 1 === WATER_TARGET })}
          aria-label="Bir bardak su ekle"
        >
          <Ring value={s.water} max={WATER_TARGET} colors={["#4cc9f0", "#10b5a3"]} label="Su">
            <div>
              <p className="display font-bold text-xl num leading-none">{s.water}</p>
              <p className="text-[11px]" style={{ color: "var(--ink-3)" }}>/ {WATER_TARGET} 💧</p>
            </div>
          </Ring>
          <p className="text-sm font-semibold mt-1">Su +1</p>
        </button>
      </div>
    </section>
  );
}

function NextUp() {
  const { s, act, go } = useApp();
  const { menu, prefs, eaten } = useMenu(s);
  const hour = new Date().getHours();
  const asks = nextQuestions(prefs, 1);

  // which meal is next by clock, skipping eaten ones
  const order = menu.meals
    .map((m, i) => ({ m, i }))
    .filter(({ i }) => !eaten(i));
  const bySlotHour = (slot: string) => (slot === "kahvaltı" ? 7 : slot === "öğle" ? 12 : slot === "akşam" ? 19 : 16);
  const next = order.sort((a, b) => Math.abs(bySlotHour(a.m.slot) - hour) - Math.abs(bySlotHour(b.m.slot) - hour))[0];
  const workoutDone = s.workoutsToday.some((x) => x.type === "strength" || x.type === "mini");

  return (
    <>
      {next && (
        <section className="panel">
          <div className="flex items-baseline justify-between">
            <p className="display text-xl font-bold capitalize">Sıradaki: {next.m.slot}</p>
            <span className="label num">{next.m.kcal} kcal</span>
          </div>
          <p className="mt-1 text-lg">{next.m.items.map((i) => (i.qty !== 1 ? `${i.qty}× ` : "") + i.name).join(" + ")}</p>
          <div className="flex gap-2 mt-3">
            <button
              className="btn btn-me flex-1 press"
              onClick={async () => {
                for (let k = 0; k < next.m.items.length; k++) {
                  const it = next.m.items[k];
                  const last = k === next.m.items.length - 1;
                  await act({ action: "addFood", foodId: it.foodId, qty: it.qty, meal: next.m.slot, planned: true }, last ? { toast: "Afiyet olsun 😋", celebrate: true } : undefined);
                }
              }}
            >
              Yedim ✓
            </button>
            <button className="btn btn-ghost press" onClick={() => go("yemek")}>
              Değiştir
            </button>
          </div>
        </section>
      )}

      {s.plan.training && !workoutDone && (
        <button className="panel w-full text-left press flex items-center gap-4" onClick={() => go("antrenman")}>
          <span className="text-4xl" aria-hidden>
            🏋️
          </span>
          <span>
            <span className="display text-xl font-bold block">Bugün antrenman var</span>
            <span style={{ color: "var(--ink-2)" }}>{s.plan.session.title}, ~{s.profile.goal === "gain" ? 45 : 30} dk. Dokun, başla.</span>
          </span>
        </button>
      )}

      {asks[0] && <AskFood foodId={asks[0].id} />}

      <button className="panel w-full text-left press flex items-center justify-between" onClick={() => go("yaris")}>
        <span>
          <span className="display text-lg font-bold">Bugün {s.todayScore.points} puan</span>
          <span className="block text-sm" style={{ color: "var(--ink-2)" }}>
            {s.todayScore.tasks.filter((x) => x.done).length}/{s.todayScore.tasks.length} görev tamam
          </span>
        </span>
        <span className="text-2xl" aria-hidden>
          🏆
        </span>
      </button>
    </>
  );
}

function AskFood({ foodId }: { foodId: string }) {
  const { act } = useApp();
  const f = FOODS.find((x) => x.id === foodId)!;
  return (
    <section className="panel">
      <p className="label">Seni tanıyayım</p>
      <p className="display text-2xl font-bold mt-1">{f.name} yer misin?</p>
      <div className="grid grid-cols-3 gap-2 mt-3">
        <button className="btn btn-ghost press !px-2" onClick={() => act({ action: "foodPref", foodId, value: -1 })}>
          Yemem 🙅
        </button>
        <button className="btn btn-ghost press !px-2" onClick={() => act({ action: "foodPref", foodId, value: 1 })}>
          Yerim 🙂
        </button>
        <button className="btn btn-me press !px-2" onClick={() => act({ action: "foodPref", foodId, value: 2 })}>
          Bayılırım 😍
        </button>
      </div>
    </section>
  );
}

function PartnerStrip() {
  const { s, act } = useApp();
  const pp = s.partnerProgress;
  const pid = s.user === "tolga" ? "eylul" : "tolga";
  const { change, pct } = progressOf(pp.goal, pp.start, pp.current, pp.target);
  const sign = change > 0 ? "+" : change < 0 ? "−" : "";
  const done = s.scores.partner.todayTasks.filter((x) => x.done).length / Math.max(1, s.scores.partner.todayTasks.length);
  return (
    <section className="panel" data-user={pid}>
      <div className="flex items-center gap-3">
        <Avatar who={pid} mood={moodFor(done)} level={s.scores.partner.level.index} size={60} bob={false} />
        <div className="flex-1">
          <div className="flex items-baseline justify-between">
            <p className="display text-lg font-bold">{pp.name}</p>
            <p className="display font-bold num">
              {sign}
              {kg(Math.abs(change))} kg
            </p>
          </div>
          <div className="h-3 rounded-full overflow-hidden mt-1.5" style={{ background: "var(--line)" }}>
            <div className="h-full rounded-full grad-me" style={{ width: `${Math.max(4, pct * 100)}%` }} />
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button className="btn btn-ghost flex-1 press !px-2" onClick={() => act({ action: "react", type: "highfive" }, { toast: "🙌 Beşlik gönderildi" })}>
          🙌 Beşlik
        </button>
        <button className="btn btn-ghost flex-1 press !px-2" onClick={() => act({ action: "react", type: "walk" }, { toast: "🌊 Davet gönderildi" })}>
          🌊 Yürüyüşe gel
        </button>
      </div>
      {s.reactions[0] && s.reactions[0].date === s.today && (
        <p className="text-sm mt-2" style={{ color: "var(--ink-2)" }}>
          {pp.name}: {{ highfive: "sana beşlik çaktı 🙌", cheer: "tezahürat yapıyor 📣", proud: "seninle gurur duyuyor 💛", walk: "seni sahile çağırıyor 🌊" }[s.reactions[0].type] ?? "bir şey gönderdi"}
        </p>
      )}
      <TogetherStreak />
    </section>
  );
}
