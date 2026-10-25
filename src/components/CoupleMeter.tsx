"use client";
import { useApp } from "./ui";
import Avatar, { moodFor } from "./Avatar";

/** Two weekly-completion bars filling from opposite ends and meeting in the middle. */
export default function CoupleMeter() {
  const { s } = useApp();
  const me = s.scores.me;
  const them = s.scores.partner;
  const partnerId = s.user === "tolga" ? "eylul" : "tolga";
  const couple = Math.round(s.scores.couple * 100);
  const lead = me.week - them.week;
  const pt = them.todayTasks;
  const theirMood = moodFor(pt.length ? pt.filter((x) => x.done).length / pt.length : 0);

  return (
    <section className="panel !p-4">
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
        <div className="text-center">
          <Avatar who={s.user} mood={moodFor(s.todayScore.completion)} level={me.level.index} size={84} />
          <p className="display font-bold mt-1">{s.profile.name}</p>
          <p className="display text-2xl font-bold num" style={{ color: `var(--${s.user})` }}>{me.week}</p>
        </div>
        <div>
          <p className="text-center display text-4xl font-bold num text-grad">%{couple}</p>
          <p className="text-center label">Biz Göstergesi</p>
          <div className="relative mt-2 h-6 rounded-full overflow-hidden" style={{ background: "var(--line)" }}>
            <div className="absolute left-0 top-0 h-full shine" style={{ width: `${Math.min(50, me.completion * 50)}%`, background: `linear-gradient(90deg, var(--${s.user}), var(--${s.user}-2))` }} />
            <div className="absolute right-0 top-0 h-full shine" style={{ width: `${Math.min(50, them.completion * 50)}%`, background: `linear-gradient(270deg, var(--${partnerId}), var(--${partnerId}-2))` }} />
            <div className="absolute top-0 bottom-0 w-1 left-1/2 -translate-x-1/2" style={{ background: "var(--paper)" }} />
          </div>
          <p className="text-center text-sm mt-2" style={{ color: "var(--ink-2)" }}>
            {couple >= 85 ? "Ortak ödül açıldı! 🎁" : "İkiniz de %85'e ulaşınca ortak ödül 🎁"}
          </p>
        </div>
        <div className="text-center">
          <Avatar who={partnerId} mood={theirMood} level={them.level.index} size={84} />
          <p className="display font-bold mt-1">{them.name}</p>
          <p className="display text-2xl font-bold num" style={{ color: `var(--${partnerId})` }}>{them.week}</p>
        </div>
      </div>
      <p className="text-center font-semibold mt-2">
        {lead > 0 ? `Bu hafta ${lead} puan öndesin 🔥` : lead < 0 ? `${them.name} ${-lead} puan önde, yetiş! 🏃` : "Başa başsınız ⚖️"}
      </p>
    </section>
  );
}
