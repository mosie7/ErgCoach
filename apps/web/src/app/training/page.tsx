import Link from 'next/link';
import {
  getCurrentTrainingContext,
  getTrainingBlock,
  listUpcomingPlannedWorkouts,
} from '@ergcoach/services';
import { formatDistance, formatDuration, formatPace } from '@ergcoach/shared';
import { requireSessionAthlete } from '@/lib/session';
import { Metric, WorkoutRow } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function TrainingPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { athlete } = await requireSessionAthlete();
  const params = await searchParams;
  const filter = (params.type ?? 'all').toLowerCase();
  const ctx = await getCurrentTrainingContext(athlete.id);
  const block = ctx.activeTrainingBlock
    ? await getTrainingBlock(athlete.id, ctx.activeTrainingBlock.id)
    : null;
  const upcoming = await listUpcomingPlannedWorkouts(athlete.id, 6);

  const workouts = ctx.currentBlockWorkouts.filter((w) => {
    if (filter === 'all') return true;
    if (filter === 'long') return w.distanceMeters >= 15000;
    const type = (w.detectedClassification ?? w.workoutType).toLowerCase();
    return type === filter;
  });

  const filters = [
    ['all', 'All'],
    ['ut2', 'UT2'],
    ['ut1', 'UT1'],
    ['at', 'AT'],
    ['tr', 'TR'],
    ['benchmark', 'Benchmark'],
    ['long', 'Long row'],
  ] as const;

  if (!ctx.activeTrainingBlock) {
    return (
      <div className="space-y-6">
        <div>
          <p className="label">Training</p>
          <h1 className="page-title mt-1">No active training block</h1>
          <p className="mt-2 text-[15px] text-apple-gray-500">
            Start a Concept2 program to create a training block. Workouts after the block start date
            will be associated automatically.
          </p>
        </div>
        <Link href="/programs" className="btn-primary">
          Browse programs
        </Link>
      </div>
    );
  }

  const b = ctx.activeTrainingBlock;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label">Training block</p>
          <h1 className="page-title mt-1">{b.name}</h1>
          <p className="mt-2 text-[15px] text-apple-gray-500">
            {b.blockType.replace('_', ' ')}
            {ctx.currentWeek != null
              ? ` · Week ${ctx.currentWeek}${ctx.totalWeeks ? ` of ${ctx.totalWeeks}` : ''}`
              : ''}
          </p>
        </div>
        <Link href="/programs" className="btn-ghost">
          Change program
        </Link>
      </div>

      <section className="panel grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Target distance" value={formatDistance(b.targetDistance)} />
        <Metric label="Target pace" value={formatPace(b.targetPaceSeconds500m)} />
        <Metric
          label="Target time"
          value={b.targetTimeSeconds ? formatDuration(b.targetTimeSeconds) : '—'}
        />
        <Metric
          label="Progress"
          value={ctx.progressPercent != null ? `${ctx.progressPercent}%` : '—'}
          sub={`${ctx.blockSessionCount} sessions in block`}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="panel p-5">
          <p className="label">This week</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Metric label="Metres" value={formatDistance(ctx.thisWeek.totalMeters)} />
            <Metric label="Sessions" value={String(ctx.thisWeek.sessionCount)} />
          </div>
        </div>
        <div className="panel p-5">
          <p className="label">Block trends</p>
          <ul className="mt-4 space-y-2 text-[13px]">
            {(
              [
                ['UT2', ctx.currentTrends.ut2Efficiency],
                ['UT1', ctx.currentTrends.ut1Efficiency],
                ['Long row', ctx.currentTrends.longRowDurability],
              ] as const
            ).map(([label, trend]) => (
              <li key={label} className="flex justify-between gap-2">
                <span>{label}</span>
                <span className="capitalize text-apple-gray-500">
                  {trend.direction.replace('_', ' ')}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="panel p-5">
          <p className="label">Readiness</p>
          {ctx.readiness ? (
            <>
              <p className="mt-2 font-display text-[40px] font-semibold tabular-nums">
                {ctx.readiness.score}
              </p>
              <p className="text-[13px] capitalize text-apple-gray-500">
                {ctx.readiness.confidence} confidence
              </p>
              <p className="mt-2 text-[13px] text-apple-gray-500">
                {ctx.readiness.primaryLimiter}
              </p>
            </>
          ) : (
            <p className="mt-4 text-[14px] text-apple-gray-500">
              Set a target pace to unlock readiness scoring.
            </p>
          )}
        </div>
      </section>

      {ctx.coachState ? (
        <section className="panel p-5">
          <p className="label">Coach memory</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-[12px] text-apple-gray-400">Strengths</p>
              <ul className="mt-2 space-y-1 text-[13px]">
                {ctx.coachState.strengths.length
                  ? ctx.coachState.strengths.map((s) => <li key={s}>{s}</li>)
                  : <li className="text-apple-gray-400">—</li>}
              </ul>
            </div>
            <div>
              <p className="text-[12px] text-apple-gray-400">Limiters</p>
              <ul className="mt-2 space-y-1 text-[13px]">
                {ctx.coachState.currentLimiters.length
                  ? ctx.coachState.currentLimiters.map((s) => <li key={s}>{s}</li>)
                  : <li className="text-apple-gray-400">—</li>}
              </ul>
            </div>
            <div>
              <p className="text-[12px] text-apple-gray-400">Recent signals</p>
              <ul className="mt-2 space-y-1 text-[13px]">
                {ctx.coachState.recentProgressSignals.length
                  ? ctx.coachState.recentProgressSignals.map((s) => <li key={s}>{s}</li>)
                  : <li className="text-apple-gray-400">—</li>}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      <section className="panel px-5">
        <div className="flex flex-wrap items-center justify-between gap-3 py-4">
          <p className="label">Block workouts</p>
          <div className="flex flex-wrap gap-1">
            {filters.map(([key, label]) => (
              <Link
                key={key}
                href={key === 'all' ? '/training' : `/training?type=${key}`}
                className={`rounded-full px-3 py-1 text-[12px] ${
                  filter === key
                    ? 'bg-apple-gray-700 text-white dark:bg-white dark:text-black'
                    : 'text-apple-gray-500 hover:bg-apple-gray-100 dark:hover:bg-apple-gray-800'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
        {workouts.length === 0 ? (
          <p className="pb-6 text-[14px] text-apple-gray-500">No matching workouts in this block yet.</p>
        ) : (
          [...workouts].reverse().map((w) => (
            <WorkoutRow
              key={w.id}
              id={w.id}
              title={w.title}
              startedAt={w.startedAt}
              distanceMeters={w.distanceMeters}
              durationSeconds={w.durationSeconds}
              averagePaceSeconds500m={w.averagePaceSeconds500m}
              workoutType={w.detectedClassification ?? w.workoutType}
              averageHeartRate={w.averageHeartRate}
            />
          ))
        )}
      </section>

      {upcoming?.plannedWorkouts?.length ? (
        <section className="panel p-5">
          <p className="label">Upcoming planned</p>
          <ul className="mt-4 space-y-2 text-[13px]">
            {upcoming.plannedWorkouts.map((s) => (
              <li key={s.id} className="flex justify-between gap-3 border-b border-apple-gray-100 py-2 dark:border-apple-gray-800">
                <span>{s.title}</span>
                <span className="text-apple-gray-400">
                  {new Date(s.scheduledDate).toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {block?.trainingPlan ? (
        <p className="text-[12px] text-apple-gray-400">Plan · {block.trainingPlan.name}</p>
      ) : null}
    </div>
  );
}
