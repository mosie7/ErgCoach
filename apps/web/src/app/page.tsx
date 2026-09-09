import { getDashboardData } from '@ergcoach/services';
import { formatDistance, formatDuration, formatPace } from '@ergcoach/shared';
import { getDemoAthleteId } from '@/lib/session';
import { Metric, WorkoutRow } from '@/components/ui';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const athleteId = await getDemoAthleteId();
  if (!athleteId) {
    return (
      <div className="panel p-8">
        <h1 className="font-display text-2xl font-semibold">Welcome to ErgCoach</h1>
        <p className="mt-2 max-w-xl text-ink-300">
          No athlete data found. Run database migrations and seed to load the synthetic marathon
          athlete, then refresh.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-ink-950 p-4 text-xs text-ink-300">
          {`pnpm db:migrate:dev\npnpm db:seed`}
        </pre>
        <Link href="/login" className="btn-primary mt-4">
          Sign in
        </Link>
      </div>
    );
  }

  const data = await getDashboardData(athleteId);
  const readiness = data.readiness;
  const projection = data.projection;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label">Athlete dashboard</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-50">
            {data.athlete.user.displayName}
          </h1>
          <p className="mt-1 text-sm text-ink-400">
            Evidence-based Concept2 coaching — metrics first, AI interpretation second.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/workouts/new" className="btn-primary">
            Log workout
          </Link>
          <Link href="/coach" className="btn-ghost">
            Ask coach
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="panel p-5 lg:col-span-1">
          <p className="label">Current goal</p>
          <h2 className="mt-2 font-display text-xl font-semibold">
            {data.goal ? 'Concept2 Marathon' : 'No active goal'}
          </h2>
          {data.goal ? (
            <div className="mt-4 grid grid-cols-2 gap-4">
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

        <section className="panel p-5 lg:col-span-1">
          <p className="label">Current readiness</p>
          <div className="mt-2 flex items-end gap-3">
            <span className="font-display text-5xl font-semibold tabular-nums text-accent-soft">
              {readiness.score}
            </span>
            <div className="pb-1 text-sm text-ink-300">
              <div className="capitalize">{readiness.confidence} confidence</div>
              <div className="text-xs text-ink-500">Explainable heuristic — not a VO₂ model</div>
            </div>
          </div>
          <p className="mt-4 text-sm text-ink-300">
            <span className="text-ink-400">Primary limiter: </span>
            {readiness.primaryLimiter}
          </p>
          <ul className="mt-3 space-y-1.5 text-sm text-ink-300">
            {readiness.positiveEvidence.slice(0, 2).map((e) => (
              <li key={e} className="flex gap-2">
                <span className="text-teal-400">+</span>
                <span>{e}</span>
              </li>
            ))}
            {readiness.limitingEvidence.slice(0, 1).map((e) => (
              <li key={e} className="flex gap-2">
                <span className="text-amber-400">!</span>
                <span>{e}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel p-5 lg:col-span-1">
          <p className="label">This week</p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <Metric label="Metres" value={formatDistance(data.thisWeek.totalMeters)} />
            <Metric label="Duration" value={formatDuration(data.thisWeek.totalDurationSeconds)} />
            <Metric label="Sessions" value={String(data.thisWeek.sessionCount)} />
            <Metric
              label="28d volume"
              value={formatDistance(data.rolling28.totalMeters)}
              sub={`${data.rolling28.sessionCount} sessions`}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(data.thisWeek.intensityBreakdown).map(([k, v]) => (
              <span
                key={k}
                className="rounded-md bg-ink-800 px-2 py-1 font-mono text-[11px] text-ink-300"
              >
                {k} {formatDistance(v)}
              </span>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel p-5">
          <div className="flex items-center justify-between">
            <p className="label">Progress</p>
          </div>
          <div className="mt-4 space-y-3">
            {[
              ['UT2 efficiency', data.trends.ut2Efficiency],
              ['UT1 efficiency', data.trends.ut1Efficiency],
              ['Benchmark trend', data.trends.benchmarkTrend],
              ['Long-row durability', data.trends.longRowDurability],
            ].map(([label, trend]) => {
              const t = trend as {
                direction: string;
                summary: string;
              };
              return (
                <div
                  key={label as string}
                  className="flex items-start justify-between gap-3 border-b border-ink-800/70 pb-3"
                >
                  <div>
                    <div className="text-sm font-medium text-ink-100">{label as string}</div>
                    <div className="mt-0.5 text-xs text-ink-400">{t.summary}</div>
                  </div>
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs capitalize ${
                      t.direction === 'improving'
                        ? 'bg-teal-500/15 text-teal-300'
                        : t.direction === 'declining'
                          ? 'bg-rose-500/15 text-rose-300'
                          : 'bg-ink-800 text-ink-300'
                    }`}
                  >
                    {t.direction.replace('_', ' ')}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="panel p-5">
          <p className="label">Goal projection</p>
          <h2 className="mt-2 font-display text-lg font-semibold text-ink-50">
            Estimated marathon pace capability
          </h2>
          {projection ? (
            <>
              <div className="mt-4 font-mono text-3xl tabular-nums text-accent-soft">
                {projection.estimatedPaceRange.lowFormatted}–{projection.estimatedPaceRange.highFormatted}
              </div>
              <div className="mt-2 text-sm text-ink-300">
                Target {projection.targetPaceFormatted} · {projection.confidence} confidence
              </div>
              <p className="mt-4 text-sm text-ink-300">
                <span className="text-ink-400">Primary limiter: </span>
                {projection.primaryLimiter}
              </p>
              <div className="mt-3">
                <p className="label">Evidence needed</p>
                <ul className="mt-2 space-y-1 text-sm text-ink-300">
                  {(projection.evidenceNeeded.length
                    ? projection.evidenceNeeded
                    : ['Continue accumulating long-row and UT1 evidence']
                  )
                    .slice(0, 4)
                    .map((e) => (
                      <li key={e}>• {e}</li>
                    ))}
                </ul>
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-ink-400">
              Not enough evidence yet for a pace projection.
            </p>
          )}
          <p className="mt-4 text-xs text-ink-500">
            Early MVP estimate — explainable heuristic, not physiological precision.
          </p>
        </section>
      </div>

      <section className="panel flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="label">AI coach chat</p>
          <h2 className="mt-1 font-display text-xl font-semibold text-ink-50">
            Ask about progress, execution, or marathon pace realism
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-400">
            Included with <Link href="/pricing" className="text-accent-soft hover:underline">Pro Coach</Link>.
            The coach retrieves your goal, recent workouts, and trends — it does not dump the whole
            database into the model.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link href="/coach" className="btn-primary">
            Open coach chat
          </Link>
          <Link href="/pricing" className="btn-ghost">
            Plans
          </Link>
        </div>
      </section>

      <section className="panel p-5">
        <div className="flex items-center justify-between">
          <p className="label">Recent training</p>
          <Link href="/workouts" className="text-sm text-accent-soft hover:underline">
            View all
          </Link>
        </div>
        <div className="mt-2">
          {data.recentWorkouts.map((w) => {
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
        </div>
      </section>
    </div>
  );
}
