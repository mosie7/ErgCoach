import { getDashboardData } from '@ergcoach/services';
import { formatDistance, formatDuration, formatPace } from '@ergcoach/shared';
import { requireSessionAthlete } from '@/lib/session';
import { Metric, WorkoutRow } from '@/components/ui';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const { athlete, user } = await requireSessionAthlete();
  const data = await getDashboardData(athlete.id);
  const readiness = data.readiness;
  const projection = data.projection;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label">Dashboard</p>
          <h1 className="page-title mt-1">{user.displayName}</h1>
          <p className="mt-2 max-w-xl text-[15px] text-apple-gray-500">
            Metrics first. AI coaching when you need interpretation.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/workouts/new" className="btn-primary">
            Log workout
          </Link>
          <Link href="/settings" className="btn-ghost">
            Connect Concept2
          </Link>
          <Link href="/coach" className="btn-accent">
            Ask coach
          </Link>
        </div>
      </div>

      {!data.goal ? (
        <div className="panel flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="section-title">Finish setup</p>
            <p className="mt-1 text-[14px] text-apple-gray-500">
              Add your goal and connect your Concept2 Logbook to import workouts.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/onboarding" className="btn-primary">
              Set goal
            </Link>
            <Link href="/settings" className="btn-ghost">
              Concept2
            </Link>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="panel p-5">
          <p className="label">Current goal</p>
          <h2 className="section-title mt-2">
            {data.goal ? String(data.goal.eventType).replace('_', ' ') : 'No active goal'}
          </h2>
          {data.goal ? (
            <div className="mt-5 grid grid-cols-2 gap-4">
              <Metric
                label="Target date"
                value={
                  data.goal.targetDate
                    ? new Date(data.goal.targetDate).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })
                    : '—'
                }
              />
              <Metric label="Target pace" value={formatPace(data.goal.targetPaceSeconds500m)} />
              <Metric
                label="Target time"
                value={
                  data.goal.targetTimeSeconds
                    ? formatDuration(data.goal.targetTimeSeconds)
                    : '—'
                }
              />
              <Metric label="Distance" value={formatDistance(data.goal.targetDistance)} />
            </div>
          ) : null}
        </section>

        <section className="panel p-5">
          <p className="label">Readiness</p>
          <div className="mt-2 flex items-end gap-3">
            <span className="font-display text-[56px] font-semibold tracking-[-0.05em] tabular-nums">
              {readiness.score}
            </span>
            <div className="pb-2 text-[13px] text-apple-gray-500">
              <div className="capitalize">{readiness.confidence} confidence</div>
            </div>
          </div>
          <p className="mt-4 text-[14px] text-apple-gray-600 dark:text-apple-gray-300">
            <span className="text-apple-gray-400">Limiter · </span>
            {readiness.primaryLimiter}
          </p>
        </section>

        <section className="panel p-5">
          <p className="label">This week</p>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <Metric label="Metres" value={formatDistance(data.thisWeek.totalMeters)} />
            <Metric label="Duration" value={formatDuration(data.thisWeek.totalDurationSeconds)} />
            <Metric label="Sessions" value={String(data.thisWeek.sessionCount)} />
            <Metric
              label="28d volume"
              value={formatDistance(data.rolling28.totalMeters)}
              sub={`${data.rolling28.sessionCount} sessions`}
            />
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel p-5">
          <p className="label">Progress</p>
          <div className="mt-4 space-y-3">
            {[
              ['UT2 efficiency', data.trends.ut2Efficiency],
              ['UT1 efficiency', data.trends.ut1Efficiency],
              ['Benchmark', data.trends.benchmarkTrend],
              ['Long-row durability', data.trends.longRowDurability],
            ].map(([label, trend]) => {
              const t = trend as { direction: string; summary: string };
              return (
                <div
                  key={label as string}
                  className="flex items-start justify-between gap-3 border-b border-apple-gray-100 pb-3 dark:border-apple-gray-800"
                >
                  <div>
                    <div className="text-[14px] font-medium">{label as string}</div>
                    <div className="mt-0.5 text-[12px] text-apple-gray-400">{t.summary}</div>
                  </div>
                  <span className="rounded-full bg-apple-gray-100 px-2 py-0.5 text-[11px] capitalize text-apple-gray-600 dark:bg-apple-gray-800 dark:text-apple-gray-300">
                    {t.direction.replace('_', ' ')}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="panel p-5">
          <p className="label">Goal projection</p>
          <h2 className="section-title mt-2">Estimated race pace</h2>
          {projection ? (
            <>
              <div className="mt-4 font-mono text-[28px] tracking-[-0.02em] tabular-nums">
                {projection.estimatedPaceRange.lowFormatted}–{projection.estimatedPaceRange.highFormatted}
              </div>
              <div className="mt-2 text-[13px] text-apple-gray-500">
                Target {projection.targetPaceFormatted} · {projection.confidence} confidence
              </div>
            </>
          ) : (
            <p className="mt-4 text-[14px] text-apple-gray-500">
              Import or log workouts to unlock a pace projection.
            </p>
          )}
        </section>
      </div>

      <section className="panel px-5">
        <div className="flex items-center justify-between py-4">
          <p className="label">Recent training</p>
          <Link href="/workouts" className="text-[13px] text-apple-blue hover:underline">
            View all
          </Link>
        </div>
        {data.recentWorkouts.length === 0 ? (
          <p className="pb-6 text-[14px] text-apple-gray-500">
            No workouts yet. Connect Concept2 or log one manually.
          </p>
        ) : (
          data.recentWorkouts.map((w) => {
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
