import { getComparableWorkouts, getWorkout } from '@ergcoach/services';
import { formatDistance, formatDuration, formatPace } from '@ergcoach/shared';
import { Metric, VerdictBadge } from '@/components/ui';
import { SplitCharts } from '@/components/SplitCharts';
import { WhyEvidence, type WhyItem } from '@/components/WhyEvidence';
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
  const whyEvidence = (metrics.whyEvidence as WhyItem[] | undefined) ?? [];
  const trainingBlock = metrics.trainingBlock as { name?: string; id?: string } | null;
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

  const topComparable = whyEvidence[0] ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/workouts" className="text-sm text-apple-gray-500 hover:text-apple-gray-600 dark:text-apple-gray-200">
            ← Workouts
          </Link>
          <h1 className="mt-2 font-display text-3xl font-semibold">
            {workout.title ?? workout.workoutType}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-apple-gray-500">
            <span>
              {new Date(workout.startedAt).toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </span>
            <span className="rounded bg-apple-gray-100 dark:bg-apple-gray-800 px-1.5 py-0.5 font-mono text-[10px] uppercase">
              {workout.workoutType}
            </span>
            {workout.detectedClassification ? (
              <span className="rounded bg-apple-gray-100 dark:bg-apple-gray-800 px-1.5 py-0.5 font-mono text-[10px] uppercase text-teal-300">
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
              <div className="text-apple-gray-500">Planned</div>
              <div className="mt-1 text-apple-gray-700 dark:text-apple-gray-100">{workout.plannedWorkout.title}</div>
              <div className="mt-1 font-mono text-apple-gray-500">
                {formatDistance(workout.plannedWorkout.targetDistanceMeters)} · HR{' '}
                {workout.plannedWorkout.targetHrMin ?? '—'}–{workout.plannedWorkout.targetHrMax ?? '—'}
              </div>
            </div>
            <div>
              <div className="text-apple-gray-500">Actual</div>
              <div className="mt-1 text-apple-gray-700 dark:text-apple-gray-100">{workout.title}</div>
              <div className="mt-1 font-mono text-apple-gray-500">
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
              <thead className="text-apple-gray-500">
                <tr>
                  <th className="py-1">#</th>
                  <th>Pace</th>
                  <th>HR</th>
                  <th>SPM</th>
                  <th>W</th>
                </tr>
              </thead>
              <tbody className="font-mono tabular-nums text-apple-gray-600 dark:text-apple-gray-200">
                {workout.splits.map((s) => (
                  <tr key={s.id} className="border-t border-apple-gray-100 dark:border-apple-gray-800">
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="label">Session verdict</p>
            <h2 className="section-title mt-2">
              {ai?.sessionVerdict && ai.sessionVerdict !== 'unknown'
                ? `${ai.sessionVerdict.charAt(0).toUpperCase()}${ai.sessionVerdict.slice(1)} ${workout.detectedClassification ?? workout.workoutType}`
                : (ai?.summary?.split('.')[0] ?? 'Session analysed')}
            </h2>
            {trainingBlock?.name ? (
              <p className="mt-1 text-[13px] text-apple-gray-500">
                Compared within {trainingBlock.name}
                {typeof metrics.currentWeek === 'number' ? ` · week ${metrics.currentWeek}` : ''}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <VerdictBadge verdict={ai?.sessionVerdict ?? workout.analysis?.sessionVerdict} />
            {ai?.confidence ? (
              <span className="text-xs capitalize text-apple-gray-500">{ai.confidence} confidence</span>
            ) : null}
          </div>
        </div>

        {ai ? (
          <div className="mt-6 space-y-6">
            <div>
              <p className="label">What you achieved</p>
              <p className="mt-2 text-[15px] tabular-nums text-apple-gray-700 dark:text-apple-gray-100">
                {formatDistance(workout.distanceMeters)} · {formatPace(workout.averagePaceSeconds500m)}
                {workout.averageStrokeRate != null ? ` · ${workout.averageStrokeRate} spm` : ''}
                {workout.averageHeartRate != null
                  ? ` · avg HR ${Math.round(workout.averageHeartRate)}`
                  : ''}
              </p>
              <ListBlock title="" items={ai.whatWasAchieved} />
            </div>

            <div>
              <p className="label">How it compares</p>
              {topComparable?.previous ? (
                <div className="mt-2 grid gap-3 sm:grid-cols-2 text-[14px]">
                  <div className="rounded-apple bg-apple-gray-50 p-3 dark:bg-apple-gray-800">
                    <p className="text-[12px] text-apple-gray-400">Previous comparable</p>
                    <p className="mt-1 tabular-nums">
                      {topComparable.previous.paceFormatted ?? '—'}
                      {topComparable.previous.hr != null
                        ? ` · ${Math.round(topComparable.previous.hr)} bpm`
                        : ''}
                    </p>
                  </div>
                  <div className="rounded-apple bg-apple-gray-50 p-3 dark:bg-apple-gray-800">
                    <p className="text-[12px] text-apple-gray-400">Change</p>
                    <p className="mt-1 tabular-nums">
                      {topComparable.deltas?.paceSecondsFaster != null
                        ? `${topComparable.deltas.paceSecondsFaster > 0 ? '+' : ''}${topComparable.deltas.paceSecondsFaster}s/500m`
                        : '—'}
                      {topComparable.deltas?.hrDelta != null
                        ? ` · HR ${topComparable.deltas.hrDelta > 0 ? '+' : ''}${topComparable.deltas.hrDelta}`
                        : ''}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-[14px] text-apple-gray-500">
                  Not enough similar sessions in the current block yet for a tight comparison.
                </p>
              )}
              <WhyEvidence
                claim={
                  ai.positiveSignals?.[0] ??
                  ai.progressAssessment ??
                  'Comparison uses current-block priority scoring.'
                }
                items={whyEvidence}
                todayPace={workout.averagePaceSeconds500m}
                todayHr={workout.averageHeartRate}
              />
            </div>

            <div>
              <p className="label">What it means for your goal</p>
              <p className="mt-1 text-sm text-apple-gray-500">{ai.goalImpact}</p>
              <p className="mt-2 text-sm text-apple-gray-500">{ai.progressAssessment}</p>
            </div>

            <div>
              <p className="label">What to watch next</p>
              <ListBlock title="" items={ai.nextFocus} />
            </div>

            <details className="text-[13px] text-apple-gray-500">
              <summary className="cursor-pointer text-apple-blue">Full coach notes</summary>
              <div className="mt-3 space-y-3">
                <p>{ai.summary}</p>
                <ListBlock title="Execution" items={ai.executionAnalysis} />
                <ListBlock title="Positive signals" items={ai.positiveSignals} tone="good" />
                <ListBlock title="Concerns" items={ai.concerns} tone="warn" />
                <ListBlock title="Evidence" items={ai.evidence} />
              </div>
            </details>
          </div>
        ) : (
          <p className="mt-3 text-sm text-apple-gray-500">
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
                  className="flex items-center justify-between rounded-lg border border-apple-gray-200 dark:border-apple-gray-800 px-3 py-2 text-sm hover:bg-apple-gray-50 dark:bg-apple-gray-900"
                >
                  <span className="text-apple-gray-600 dark:text-apple-gray-200">
                    {'tier' in c ? `${String((c as { tier?: string }).tier ?? '').replace('_', ' ')} · ` : ''}
                    {c.reasons.slice(0, 2).join(' · ')}
                  </span>
                  <span className="font-mono text-apple-blue">{Math.round(c.similarityScore)}</span>
                </Link>
              </li>
            ))}
            {comparable.length === 0 ? (
              <li className="text-sm text-apple-gray-500">No strong historical matches yet.</li>
            ) : null}
          </ul>
        </section>

        <section className="panel p-5">
          <p className="label">Subjective feedback</p>
          {workout.subjectiveFeedback ? (
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex gap-4 font-mono text-apple-gray-600 dark:text-apple-gray-200">
                <span>RPE {workout.subjectiveFeedback.rpe ?? '—'}</span>
                <span>Fatigue {workout.subjectiveFeedback.fatigue ?? '—'}</span>
                <span>Sleep {workout.subjectiveFeedback.sleepQuality ?? '—'}</span>
              </div>
              <p className="text-apple-gray-500">{workout.subjectiveFeedback.notes ?? 'No notes.'}</p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-apple-gray-500">No RPE/notes recorded.</p>
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
      <ul className="mt-2 space-y-1.5 text-sm text-apple-gray-500">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span
              className={
                tone === 'good' ? 'text-teal-400' : tone === 'warn' ? 'text-amber-400' : 'text-apple-gray-700 dark:text-white0'
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
