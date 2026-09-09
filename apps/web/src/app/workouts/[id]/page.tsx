import { getComparableWorkouts, getWorkout } from '@ergcoach/services';
import { formatDistance, formatDuration, formatPace } from '@ergcoach/shared';
import { Metric, VerdictBadge } from '@/components/ui';
import { SplitCharts } from '@/components/SplitCharts';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workout = await getWorkout(id);
  if (!workout) notFound();

  const comparable = await getComparableWorkouts(id, 5);
  const metrics = (workout.analysis?.calculatedMetrics ?? {}) as Record<string, unknown>;
  const ai = (workout.analysis?.aiAnalysis ?? null) as {
    summary?: string;
    sessionVerdict?: string;
    whatWasAchieved?: string[];
    executionAnalysis?: string[];
    positiveSignals?: string[];
    concerns?: string[];
    goalImpact?: string;
    progressAssessment?: string;
    nextFocus?: string[];
    confidence?: string;
    evidence?: string[];
  } | null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/workouts" className="text-sm text-ink-400 hover:text-ink-200">
            ← Workouts
          </Link>
          <h1 className="mt-2 font-display text-3xl font-semibold">
            {workout.title ?? workout.workoutType}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-400">
            <span>
              {new Date(workout.startedAt).toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </span>
            <span className="rounded bg-ink-800 px-1.5 py-0.5 font-mono text-[10px] uppercase">
              {workout.workoutType}
            </span>
            {workout.detectedClassification ? (
              <span className="rounded bg-ink-800 px-1.5 py-0.5 font-mono text-[10px] uppercase text-teal-300">
                detected {workout.detectedClassification}
              </span>
            ) : null}
            <VerdictBadge verdict={ai?.sessionVerdict ?? workout.analysis?.sessionVerdict} />
          </div>
        </div>
      </div>

      <section className="panel grid gap-4 p-5 sm:grid-cols-3 lg:grid-cols-6">
        <Metric label="Distance" value={formatDistance(workout.distanceMeters)} />
        <Metric label="Duration" value={formatDuration(workout.durationSeconds)} />
        <Metric label="Avg pace" value={formatPace(workout.averagePaceSeconds500m)} />
        <Metric
          label="Avg HR"
          value={workout.averageHeartRate != null ? `${Math.round(workout.averageHeartRate)}` : '—'}
          sub="bpm"
        />
        <Metric
          label="Max HR"
          value={workout.maxHeartRate != null ? `${Math.round(workout.maxHeartRate)}` : '—'}
          sub="bpm"
        />
        <Metric
          label="SPM"
          value={workout.averageStrokeRate != null ? String(workout.averageStrokeRate) : '—'}
        />
      </section>

      {workout.plannedWorkout ? (
        <section className="panel p-5">
          <p className="label">Planned vs actual</p>
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <div className="text-ink-400">Planned</div>
              <div className="mt-1 text-ink-100">{workout.plannedWorkout.title}</div>
              <div className="mt-1 font-mono text-ink-300">
                {formatDistance(workout.plannedWorkout.targetDistanceMeters)} · HR{' '}
                {workout.plannedWorkout.targetHrMin ?? '—'}–{workout.plannedWorkout.targetHrMax ?? '—'}
              </div>
            </div>
            <div>
              <div className="text-ink-400">Actual</div>
              <div className="mt-1 text-ink-100">{workout.title}</div>
              <div className="mt-1 font-mono text-ink-300">
                {formatDistance(workout.distanceMeters)} · avg HR{' '}
                {workout.averageHeartRate != null ? Math.round(workout.averageHeartRate) : '—'}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel p-5">
          <p className="label">Splits</p>
          <div className="mt-3">
            <SplitCharts splits={workout.splits} />
          </div>
          <div className="mt-4 max-h-56 overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-ink-400">
                <tr>
                  <th className="py-1">#</th>
                  <th>Pace</th>
                  <th>HR</th>
                  <th>SPM</th>
                  <th>W</th>
                </tr>
              </thead>
              <tbody className="font-mono tabular-nums text-ink-200">
                {workout.splits.map((s) => (
                  <tr key={s.id} className="border-t border-ink-800/80">
                    <td className="py-1">{s.index + 1}</td>
                    <td>{formatPace(s.paceSeconds500m)}</td>
                    <td>{s.heartRate ?? '—'}</td>
                    <td>{s.strokeRate ?? '—'}</td>
                    <td>{s.watts != null ? Math.round(s.watts) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel p-5">
          <p className="label">Calculated metrics</p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <Metric
              label="HR drift"
              value={
                metrics.heartRateDriftPercent != null
                  ? `${Number(metrics.heartRateDriftPercent).toFixed(1)}%`
                  : '—'
              }
            />
            <Metric
              label="Pace drift"
              value={
                metrics.paceDriftPercent != null
                  ? `${Number(metrics.paceDriftPercent).toFixed(1)}%`
                  : '—'
              }
            />
            <Metric
              label="Split consistency"
              value={
                metrics.splitConsistency != null
                  ? Number(metrics.splitConsistency).toFixed(0)
                  : '—'
              }
            />
            <Metric
              label="Compliance"
              value={
                metrics.complianceScore != null ? `${metrics.complianceScore}%` : '—'
              }
            />
            <Metric
              label="Pace variance"
              value={
                metrics.paceVariance != null ? Number(metrics.paceVariance).toFixed(2) : '—'
              }
            />
            <Metric
              label="Avg watts"
              value={
                workout.averageWatts != null
                  ? String(Math.round(workout.averageWatts))
                  : metrics.averageWatts != null
                    ? String(Math.round(Number(metrics.averageWatts)))
                    : '—'
              }
            />
          </div>
        </section>
      </div>

      <section className="panel p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="label">AI coaching report</p>
          {ai?.confidence ? (
            <span className="text-xs capitalize text-ink-400">{ai.confidence} confidence</span>
          ) : null}
        </div>
        {ai ? (
          <div className="mt-3 space-y-4">
            <p className="text-base leading-relaxed text-ink-100">{ai.summary}</p>
            <div className="grid gap-4 md:grid-cols-2">
              <ListBlock title="What was achieved" items={ai.whatWasAchieved} />
              <ListBlock title="Execution" items={ai.executionAnalysis} />
              <ListBlock title="Positive signals" items={ai.positiveSignals} tone="good" />
              <ListBlock title="Concerns" items={ai.concerns} tone="warn" />
            </div>
            <div>
              <p className="label">Goal impact</p>
              <p className="mt-1 text-sm text-ink-300">{ai.goalImpact}</p>
            </div>
            <div>
              <p className="label">Progress assessment</p>
              <p className="mt-1 text-sm text-ink-300">{ai.progressAssessment}</p>
            </div>
            <ListBlock title="Next focus" items={ai.nextFocus} />
            <ListBlock title="Evidence" items={ai.evidence} />
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink-400">
            No analysis yet. Re-analyse from settings or re-save the workout.
          </p>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel p-5">
          <p className="label">Comparable workouts</p>
          <ul className="mt-3 space-y-2">
            {comparable.map((c) => (
              <li key={c.workoutId}>
                <Link
                  href={`/workouts/${c.workoutId}`}
                  className="flex items-center justify-between rounded-lg border border-ink-800 px-3 py-2 text-sm hover:bg-ink-900/50"
                >
                  <span className="text-ink-200">{c.reasons.slice(0, 2).join(' · ')}</span>
                  <span className="font-mono text-accent-soft">{Math.round(c.similarityScore)}</span>
                </Link>
              </li>
            ))}
            {comparable.length === 0 ? (
              <li className="text-sm text-ink-400">No strong historical matches yet.</li>
            ) : null}
          </ul>
        </section>

        <section className="panel p-5">
          <p className="label">Subjective feedback</p>
          {workout.subjectiveFeedback ? (
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex gap-4 font-mono text-ink-200">
                <span>RPE {workout.subjectiveFeedback.rpe ?? '—'}</span>
                <span>Fatigue {workout.subjectiveFeedback.fatigue ?? '—'}</span>
                <span>Sleep {workout.subjectiveFeedback.sleepQuality ?? '—'}</span>
              </div>
              <p className="text-ink-300">{workout.subjectiveFeedback.notes ?? 'No notes.'}</p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-ink-400">No RPE/notes recorded.</p>
          )}
        </section>
      </div>
    </div>
  );
}

function ListBlock({
  title,
  items,
  tone,
}: {
  title: string;
  items?: string[];
  tone?: 'good' | 'warn';
}) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="label">{title}</p>
      <ul className="mt-2 space-y-1.5 text-sm text-ink-300">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span
              className={
                tone === 'good' ? 'text-teal-400' : tone === 'warn' ? 'text-amber-400' : 'text-ink-500'
              }
            >
              •
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
