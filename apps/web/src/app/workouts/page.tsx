import { getRecentWorkouts } from '@ergcoach/services';
import { getDemoAthleteId } from '@/lib/session';
import { WorkoutRow } from '@/components/ui';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function WorkoutsPage() {
  const athleteId = await getDemoAthleteId();
  if (!athleteId) {
    return <p className="text-ink-400">No athlete found. Seed the database first.</p>;
  }
  const workouts = await getRecentWorkouts(athleteId, 50);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="label">Training log</p>
          <h1 className="font-display text-3xl font-semibold">Workouts</h1>
        </div>
        <Link href="/workouts/new" className="btn-primary">
          Log workout
        </Link>
      </div>
      <section className="panel px-5">
        {workouts.map((w) => {
          const ai = w.analysis?.aiAnalysis as { sessionVerdict?: string } | null;
          return (
            <WorkoutRow
              key={w.id}
              id={w.id}
              title={w.title}
              startedAt={w.startedAt}
              distanceMeters={w.distanceMeters}
              durationSeconds={w.durationSeconds}
              averagePaceSeconds500m={w.averagePaceSeconds500m}
              workoutType={w.workoutType}
              averageHeartRate={w.averageHeartRate}
              verdict={ai?.sessionVerdict ?? w.analysis?.sessionVerdict}
            />
          );
        })}
      </section>
    </div>
  );
}
