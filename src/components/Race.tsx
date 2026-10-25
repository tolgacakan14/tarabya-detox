"use client";
import { useApp, Section, Bar } from "./ui";
import Avatar, { moodFor } from "./Avatar";
import { POINT_RULES } from "@/lib/state-constants";

export default function Race() {
  const { s } = useApp();
  const me = s.scores.me;
  const them = s.scores.partner;
  const partnerId = s.user === "tolga" ? "eylul" : "tolga";
  const rows = [
    { id: s.user, name: s.profile.name, sc: me },
    { id: partnerId, name: them.name, sc: them },
  ].sort((a, b) => b.sc.week - a.sc.week);
  const maxWeek = Math.max(1, ...me.weeks.map((w) => w.points), ...them.weeks.map((w) => w.points));

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Section title="Bu haftanın yarışı" aside={<span className="label">Pazartesi sıfırlanır</span>}>
        <ol className="space-y-4">
          {rows.map((r, i) => (
            <li key={r.id} className="flex items-center gap-3">
              <span className="display text-3xl font-bold w-6 num">{i + 1}</span>
              <Avatar who={r.id as "tolga" | "eylul"} mood={i === 0 && r.sc.week > 0 ? "party" : moodFor(r.sc.completion)} level={r.sc.level.index} size={70} bob={false} />
              <div className="flex-1">
                <div className="flex justify-between items-baseline">
                  <p className="display text-xl font-bold">{r.name}</p>
                  <p className="display text-2xl font-bold num">{r.sc.week}</p>
                </div>
                <Bar value={r.sc.week} max={Math.max(rows[0].sc.week, 1)} color={`var(--${r.id})`} label={`${r.name} haftalık puan`} />
                <p className="label mt-1">
                  Planın %{Math.round(r.sc.completion * 100)}'i tamam, {r.sc.streak} haftalık seri
                </p>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-sm mt-4" style={{ color: "var(--ink-2)" }}>
          Kazanılan haftalar: {s.profile.name} {s.scores.weeksWon.me}, {them.name} {s.scores.weeksWon.them}.
        </p>
      </Section>

      <Section title="Seviyeler">
        {[
          { name: s.profile.name, sc: me, id: s.user },
          { name: them.name, sc: them, id: partnerId },
        ].map((r) => (
          <div key={r.id} className="mb-4">
            <div className="flex justify-between items-baseline">
              <p className="font-semibold">
                {r.name}: {r.sc.level.index}. seviye, {r.sc.level.name}
              </p>
              <p className="num label">{r.sc.total.toLocaleString("tr-TR")} puan</p>
            </div>
            {r.sc.level.next && (
              <>
                <Bar value={r.sc.total} max={r.sc.level.next.at} color={`var(--${r.id})`} height={8} label={`${r.name} seviye ilerlemesi`} />
                <p className="label mt-1">
                  {r.sc.level.next.name} için {(r.sc.level.next.at - r.sc.total).toLocaleString("tr-TR")} puan
                </p>
              </>
            )}
          </div>
        ))}
        <p className="label">2. seviyede ter bandı, 3. seviyede madalya, 5. seviyede taç açılır.</p>
      </Section>

      <Section title="Son haftalar">
        <div className="flex items-end gap-3 h-40">
          {me.weeks.map((w, i) => {
            const o = them.weeks.find((x) => x.weekStart === w.weekStart);
            return (
              <div key={w.weekStart} className="flex-1 flex flex-col items-center gap-1">
                <div className="flex items-end gap-0.5 h-32 w-full justify-center">
                  <div className="w-1/3 rounded-t-md" style={{ height: `${(w.points / maxWeek) * 100}%`, background: `var(--${s.user})` }} title={`${s.profile.name}: ${w.points}`} />
                  <div className="w-1/3 rounded-t-md" style={{ height: `${((o?.points ?? 0) / maxWeek) * 100}%`, background: `var(--${partnerId})` }} title={`${them.name}: ${o?.points ?? 0}`} />
                </div>
                <span className="label num">{i + 1}. hf</span>
              </div>
            );
          })}
        </div>
        {me.weeks.some((w) => w.body) && (
          <ul className="mt-3 space-y-1 text-sm">
            {me.weeks
              .filter((w) => w.body)
              .slice(-3)
              .map((w) => (
                <li key={w.weekStart}>
                  {w.weekStart} haftası vücut puanı: {w.body!.points} ({w.body!.label})
                </li>
              ))}
          </ul>
        )}
      </Section>

      <Section title="Puan nasıl kazanılır?">
        <ul className="divide-y text-sm" style={{ borderColor: "var(--line)" }}>
          {POINT_RULES.map((r) => (
            <li key={r.what} className="flex justify-between gap-3 py-2">
              <span>{r.what}</span>
              <span className="num font-semibold whitespace-nowrap">{r.points}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm mt-3" style={{ color: "var(--ink-2)" }}>
          Biriniz kilo alıyor, biriniz veriyor. Bu yüzden vücut puanı kilo farkından değil, kendi hedefinize sağlıklı hızda ilerlemenizden geliyor. Çok hızlı almak ya da vermek puan getirmez.
        </p>
      </Section>
    </div>
  );
}
