import Avatar from "@/components/Avatar";

// Internal preview of all character moods (not linked from the app).
export default function AvatarTest() {
  const moods = ["calm", "happy", "proud", "party"] as const;
  return (
    <main className="p-6 space-y-6">
      {(["tolga", "eylul"] as const).map((w) => (
        <div key={w} className="flex gap-6">
          {moods.map((m, i) => (
            <Avatar key={m} who={w} mood={m} level={i + 1} size={240} bob={false} />
          ))}
        </div>
      ))}
    </main>
  );
}
