import Link from 'next/link';
import { TRAINING_PROGRAMS, listUpcomingPlannedWorkouts } from '@ergcoach/services';
import { formatDistance, formatDuration } from '@ergcoach/shared';
import { requireSessionAthlete } from '@/lib/session';
import { ProgramsClient } from './ProgramsClient';

export const dynamic = 'force-dynamic';

export default async function ProgramsPage() {
  const { athlete } = await requireSessionAthlete();
  const current = await listUpcomingPlannedWorkouts(athlete.id, 8);

  return (
    <div className="space-y-10">
      <ProgramsClient programs={TRAINING_PROGRAMS} />

      {current?.plannedWorkouts?.length ? (
        <section className="panel px-5">
          <div className="flex items-center justify-between py-4">
            <div>
              <p className="label">Current plan</p>
              <h2 className="section-title mt-1">{current.name}</h2>
            </div>
            <Link href="/" className="text-[13px] text-apple-blue hover:underline">
              Dashboard
            </Link>
          </div>
          <ul className="divide-y divide-apple-gray-100 dark:divide-apple-gray-800">
            {current.plannedWorkouts.map((session) => (
              <li key={session.id} className="flex items-start justify-between gap-4 py-3">
                <div>
                  <p className="text-[14px] font-medium">{session.title}</p>
                  <p className="mt-0.5 text-[12px] text-apple-gray-400">
                    {new Date(session.scheduledDate).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                    {' · '}
                    {session.workoutType}
                  </p>
                  {session.instructions ? (
                    <p className="mt-1 max-w-xl text-[12px] text-apple-gray-500">{session.instructions}</p>
                  ) : null}
                </div>
                <div className="shrink-0 text-right text-[12px] tabular-nums text-apple-gray-500">
                  <div>
                    {session.targetDistanceMeters
                      ? formatDistance(session.targetDistanceMeters)
                      : session.targetDurationSeconds
                        ? formatDuration(session.targetDurationSeconds)
                        : '—'}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
