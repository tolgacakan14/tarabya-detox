import ExerciseDemo from "@/components/ExerciseDemo";
import type { Pattern } from "@/lib/training";

// Internal preview of all exercise demos (not linked from the app).
const ALL: Pattern[] = ["squat", "single_leg", "hinge", "glute_bridge", "hamstring_curl", "push_horizontal", "push_vertical", "pull_horizontal", "rear_delt", "lateral_raise", "biceps", "triceps", "calves", "core_anti_extension", "core_lateral", "core_flexion", "hip_abduction", "conditioning", "mobility", "stretch"];
export default function DemoTest() {
  return (
    <main className="p-4 grid grid-cols-2 gap-3">
      {ALL.map((p) => (
        <div key={p} className="panel !p-2">
          <p className="label">{p}</p>
          <ExerciseDemo pattern={p} />
        </div>
      ))}
    </main>
  );
}
