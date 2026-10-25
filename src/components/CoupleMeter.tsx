"use client";
import { useApp } from "./ui";
import Avatar, { moodFor } from "./Avatar";

const LINES = {
  calm: ["Günaydın! Bir bardak suyla başlayalım mı?", "Bugün küçük bir adım yeter."],
  happy: ["Isındık! Sıradaki göreve geçelim.", "Güzel gidiyor, devam."],
  proud: ["Bugün iyisin, bitirmeye az kaldı.", "Bu tempoyla hafta senin."],
  party: ["Bugünün tüm görevleri tamam!", "Efsane gün. Yarın da böyle."],
};

/** The one bold element: two weekly-completion bars filling from opposite ends, meeting in the middle,
 * with the two characters reacting to each person's day. */
export default function CoupleMeter() {
  const { s, go } = useApp();
  const me = s.scores.me;
  const them = s.scores.partner;
  const partnerId = s.user === "tolga" ? "eylul" : "tolga";
  const myColor = `var(--${s.user})`;
  const theirColor = `var(--${partnerId})`;
  const couple = Math.round(s.scores.couple * 100);
  const unlocked = couple >= 85;
  const lead = me.week - them.week;
  const myMood = moodFor(s.todayScore.completion);
  const pt = them.todayTasks;
  const theirMood = moodFor(pt.length ? pt.filter((x) => x.done).length / pt.length : 0);
  const line = LINES[myMood][s.habitDay % 2];

  return (
    <div className="mt-4 panel !p-4 sm:!p-5">
      <div className="grid grid-cols-[auto_1fr_auto] items-end gap-2 sm:gap-4">
        <div className="text-center">
          <Avatar who={s.user} mood={myMood} level={me.level.index} size={96} />
          <p className="display font-bold leading-none mt-1">{s.profile.name}</p>
          <p className="label num">{me.week} puan</p>
        </div>
        <div className="pb-6">
          <p className="relative mx-auto max-w-xs text-center text-sm rounded-2xl px-3 py-2 mb-4" style={{ background: "var(--me-soft)", color: "var(--me-ink)" }}>
            {line}
          </p>
          <button onClick={() => go("yaris")} className="block w-full" aria-label="Yarış sayfasını aç">
            <div className="flex justify-between items-baseline">
              <span className="label">Bu hafta</span>
              <span className="display font-bold text-xl num">%{couple}</span>
              <span className="label">Biz Göstergesi</span>
            </div>
            <div className="relative mt-1.5 h-5 rounded-full overflow-hidden" style={{ background: "var(--line)" }}>
              <div className="absolute left-0 top-0 h-full transition-[width] duration-700" style={{ width: `${Math.min(50, me.completion * 50)}%`, background: myColor }} />
              <div className="absolute right-0 top-0 h-full transition-[width] duration-700" style={{ width: `${Math.min(50, them.completion * 50)}%`, background: theirColor }} />
              <div className="absolute top-0 bottom-0 w-0.5 left-1/2 -translate-x-1/2" style={{ background: "var(--paper)" }} />
            </div>
          </button>
        </div>
        <div className="text-center">
          <Avatar who={partnerId} mood={theirMood} level={them.level.index} size={96} />
          <p className="display font-bold leading-none mt-1">{them.name}</p>
          <p className="label num">{them.week} puan</p>
        </div>
      </div>
      <p className="text-sm mt-1 text-center" style={{ color: "var(--ink-2)" }}>
        {unlocked ? "Ortak ödül açıldı! Ne yapacağınıza birlikte karar verin." : "İkiniz de planın %85'ini tamamlarsanız ortak ödül açılıyor."}{" "}
        {lead > 0 ? `Yarışta ${lead} puan öndesin.` : lead < 0 ? `${them.name} ${-lead} puan önde.` : "Yarışta başa başsınız."}
      </p>
    </div>
  );
}
