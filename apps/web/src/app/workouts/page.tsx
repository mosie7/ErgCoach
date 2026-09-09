import { getRecentWorkouts } from '@ergcoach/services';
import { requireSessionAthlete } from '@/lib/session';
import { WorkoutRow } from '@/components/ui';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function WorkoutsPage() {
  const { athlete } = await requireSessionAthlete();
  const workouts = await getRecentWorkouts(athlete.id, 50);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="label">Training log</p>
          <h1 className="page-title text-[32px]">Workouts</h1>
        </div>
        <Link href="/workouts/new" className="btn-primary">
          Log workout
        </Link>
      </div>
      <section className="panel px-5">
        {workouts.length === 0 ? (
          <p className="py-8 text-[14px] text-apple-gray-500">
            No workouts yet.{' '}
            <Link href="/settings" className="text-apple-blue hover:underline">
              Connect Concept2
            </Link>{' '}
            or log one manually.
          </p>
        ) : (
          workouts.map((w) => {
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
          })
        )}
      </section>
    </div>
  );
}
