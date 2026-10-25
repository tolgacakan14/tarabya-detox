"use client";
import { useState } from "react";
import { useApp, Bar, Section, Stat, fmt, Check } from "./ui";
import { GAP_FILLERS, PROTEIN_FILLERS } from "@/lib/meals";
import { WATER_TARGET } from "@/lib/state-constants";

const REACTIONS = [
  { type: "highfive", label: "Beşlik çak", emoji: "🙌" },
  { type: "cheer", label: "Tezahürat", emoji: "📣" },
  { type: "proud", label: "Gurur duyuyorum", emoji: "💛" },
  { type: "walk", label: "Sahile yürüyüşe gel", emoji: "🌊" },
];
const REACTION_TEXT: Record<string, string> = {
  highfive: "beşlik çaktı",
  cheer: "sana tezahürat yapıyor",
  proud: "seninle gurur duyuyor",
  walk: "seni sahile yürüyüşe çağırıyor",
};

export default function Today() {
  const { s, act, go } = useApp();
  const t = s.engine.targets;
  const gain = s.profile.goal === "gain";
  const [weight, setWeight] = useState("");
  const [steps, setSteps] = useState("");
  const [sleep, setSleep] = useState("");
  const [todo, setTodo] = useState("");
  const hour = new Date().getHours();
  const kcalLeft = t.kcal - s.totals.kcal;
  const proteinLeft = t.protein - s.totals.protein;

  const fillers = gain ? GAP_FILLERS : PROTEIN_FILLERS;
  const showFiller = gain ? hour >= 17 && kcalLeft > 300 : hour >= 15 && proteinLeft > 20;

  return (
    <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
      <div className="space-y-4">
        {s.engine.insights.length > 0 && (
          <div className="space-y-2">
            {s.engine.insights.map((i, k) => (
              <p
                key={k}
                className="panel !py-3"
                style={{
                  background: i.tone === "warn" ? "var(--warn-soft)" : i.tone === "good" ? "var(--me-soft)" : "var(--paper)",
                  color: i.tone === "warn" ? "var(--warn)" : "var(--ink)",
                }}
              >
                {i.text}
              </p>
            ))}
          </div>
        )}

        <Section title="Bugünkü hedefler" aside={<span className="label">{s.engine.phase === "maintenance" ? "Bakım dönemi" : gain ? "Fazla dönemi" : "Açık dönemi"}</span>}>
          <div className="grid grid-cols-2 gap-5">
            <div>
              <Stat value={fmt(s.totals.kcal)} unit={`/ ${fmt(t.kcal)}`} label="kcal" />
              <div className="mt-2">
                <Bar value={s.totals.kcal} max={t.kcal} label="Kalori" />
              </div>
            </div>
            <div>
              <Stat value={fmt(s.totals.protein)} unit={`/ ${t.protein} g`} label="protein" />
              <div className="mt-2">
                <Bar value={s.totals.protein} max={t.protein} label="Protein" />
              </div>
            </div>
          </div>
          <p className="text-sm mt-4" style={{ color: "var(--ink-2)" }}>
            {gain
              ? kcalLeft > 0
                ? `Hedefe ${fmt(kcalLeft)} kcal kaldı. Eksik kalmak, fazla yemekten daha büyük sorun.`
                : "Bugünün kalorisi tamam. Harika."
              : kcalLeft >= 0
                ? `${fmt(kcalLeft)} kcal alanın var. Önce proteini tamamla.`
                : "Bugün biraz fazla oldu, sorun değil. Haftalık ortalamaya bakıyoruz, telafi etmeye çalışma."}
          </p>
          <button className="btn btn-me mt-4" onClick={() => go("yemek")}>
            Yemek ekle
          </button>
        </Section>

        {showFiller && (
          <Section title={gain ? "Açığı kapat" : "Proteini tamamla"}>
            <p className="text-sm mb-3" style={{ color: "var(--ink-2)" }}>
              {gain ? `${fmt(kcalLeft)} kcal eksik. Tek dokunuşla ekle:` : `${fmt(proteinLeft)} g protein eksik. Hafif seçenekler:`}
            </p>
            <div className="grid sm:grid-cols-2 gap-2">
              {fillers.map((f) => (
                <button
                  key={f.text}
                  className="chip justify-between !rounded-xl !py-3"
                  onClick={async () => {
                    for (const it of f.items) await act({ action: "addFood", foodId: it.id, qty: it.qty, planned: true });
                  }}
                >
                  <span className="text-left">{f.text}</span>
                  <span className="num label">{f.kcal} kcal</span>
                </button>
              ))}
            </div>
          </Section>
        )}

        <Section title="Görevler" aside={<span className="num label">{s.todayScore.points} puan bugün</span>}>
          <ul className="divide-y" style={{ borderColor: "var(--line)" }}>
            {s.todayScore.tasks.map((task) => {
              const isTodo = task.id.startsWith("todo:");
              return (
                <li key={task.id} className="flex items-center gap-3 py-2.5">
                  <button
                    className="tick"
                    data-on={task.done}
                    disabled={!isTodo}
                    aria-label={task.done ? "Tamamlandı" : "Tamamla"}
                    onClick={() => isTodo && act({ action: "toggleTodo", id: task.id.slice(5) }, task.done ? undefined : { toast: "Görev tamam", points: 10 })}
                  >
                    {task.done && <Check />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={task.done ? "line-through opacity-60" : ""}>{task.label}</p>
                    {task.hint && <p className="label">{task.hint}</p>}
                  </div>
                  <span className="num text-sm" style={{ color: task.earned ? "var(--me-ink)" : "var(--ink-3)" }}>
                    {task.earned}/{task.points}
                  </span>
                </li>
              );
            })}
          </ul>
          <form
            className="flex gap-2 mt-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!todo.trim()) return;
              if (await act({ action: "addTodo", text: todo })) setTodo("");
            }}
          >
            <input className="field" placeholder="Kendi görevini ekle" value={todo} onChange={(e) => setTodo(e.target.value)} />
            <button className="btn">Ekle</button>
          </form>
        </Section>
      </div>

      <div className="space-y-4">
        <Section title="Su" aside={<span className="num label">{s.water} / {WATER_TARGET} bardak</span>}>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: Math.max(WATER_TARGET, s.water) }).map((_, i) => (
              <span
                key={i}
                className={`w-8 h-10 rounded-b-xl rounded-t-sm border-2 ${i < s.water ? "pop" : ""}`}
                style={{ borderColor: "var(--me)", background: i < s.water ? "var(--me)" : "transparent" }}
                aria-hidden
              />
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <button className="btn btn-me flex-1" onClick={() => act({ action: "water", delta: 1 }, { toast: "Bir bardak su", points: s.water < WATER_TARGET ? 5 : 0 })}>
              + 1 bardak
            </button>
            <button className="btn btn-ghost" onClick={() => act({ action: "water", delta: -1 })} disabled={!s.water}>
              Geri al
            </button>
          </div>
        </Section>

        <Section title="Bugünün ölçümleri">
          <div className="grid grid-cols-3 gap-2">
            <MiniInput label="Kilo (kg)" value={weight} set={setWeight} current={s.weighedToday} onSave={() => act({ action: "weight", kg: Number(weight.replace(",", ".")) }, { toast: "Tartı kaydedildi", points: 10 }).then((ok) => ok && setWeight(""))} />
            <MiniInput label="Adım" value={steps} set={setSteps} current={s.steps || undefined} onSave={() => act({ action: "steps", steps: Number(steps) }, { toast: "Adımlar kaydedildi" }).then((ok) => ok && setSteps(""))} />
            <MiniInput label="Uyku (saat)" value={sleep} set={setSleep} current={s.sleep} onSave={() => act({ action: "sleep", hours: Number(sleep.replace(",", ".")) }, { toast: "Uyku kaydedildi" }).then((ok) => ok && setSleep(""))} />
          </div>
          <div className="mt-3">
            <div className="flex justify-between label">
              <span>Adım hedefi</span>
              <span className="num">{fmt(s.steps)} / {fmt(t.steps)}</span>
            </div>
            <Bar value={s.steps} max={t.steps} height={8} label="Adım" />
          </div>
        </Section>

        <Section title={s.plan.training ? s.plan.session.title : "Dinlenme günü"}>
          <p style={{ color: "var(--ink-2)" }}>
            {s.plan.training
              ? `Bu hafta ${s.plan.sessionsDoneThisWeek}/${t.sessionsPerWeek} antrenman. ${s.plan.session.exercises.length} hareket, yaklaşık ${s.profile.goal === "gain" ? 45 : 30} dakika.`
              : `${s.plan.cardio.title}: ${s.plan.cardio.detail}`}
          </p>
          <button className="btn btn-me mt-3" onClick={() => go("antrenman")}>
            {s.plan.training ? "Antrenmana başla" : "Yürüyüşü kaydet"}
          </button>
        </Section>

        <Section title={s.scores.partner.name}>
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            Bugün {s.scores.partner.todayTasks.filter((x) => x.done).length}/{s.scores.partner.todayTasks.length} görev tamam.
          </p>
          <div className="grid grid-cols-2 gap-2 mt-3">
            {REACTIONS.map((r) => (
              <button key={r.type} className="chip !rounded-xl !py-2.5 justify-center" onClick={() => act({ action: "react", type: r.type }, { toast: "Gönderildi" })}>
                <span aria-hidden>{r.emoji}</span> {r.label}
              </button>
            ))}
          </div>
          {s.reactions.length > 0 && (
            <ul className="mt-4 space-y-1.5">
              {s.reactions.slice(0, 4).map((r) => (
                <li key={r.id} className="text-sm">
                  <span className="font-semibold">{s.scores.partner.name}</span> {REACTION_TEXT[r.type] ?? "bir şey gönderdi"}
                  <span className="label ml-2">{r.date === s.today ? "bugün" : r.date}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <p className="label px-2">
          Alışkanlık sayacı: {s.habitDay}. gün / ~66. Bir günü kaçırmak süreci bozmaz.
        </p>
      </div>
    </div>
  );
}

function MiniInput({ label, value, set, current, onSave }: { label: string; value: string; set: (v: string) => void; current?: number; onSave: () => void }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value) onSave();
      }}
    >
      <label className="label block mb-1">{label}</label>
      <input className="field num" inputMode="decimal" value={value} placeholder={current !== undefined ? String(current) : "—"} onChange={(e) => set(e.target.value)} />
      <button className="btn btn-ghost w-full mt-1.5 !py-1.5 text-sm" disabled={!value}>
        Kaydet
      </button>
    </form>
  );
}
