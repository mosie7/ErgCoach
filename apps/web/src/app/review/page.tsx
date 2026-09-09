import { generateWeeklyReview } from '@ergcoach/services';
import { formatDistance, formatDuration } from '@ergcoach/shared';
import { getDemoAthleteId } from '@/lib/session';
import { Metric } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function ReviewPage() {
  const athleteId = await getDemoAthleteId();
  if (!athleteId) {
    return <p className="text-ink-400">No athlete found.</p>;
  }

  const review = await generateWeeklyReview(athleteId);
  const summary = review.summary as {
    sessionsCompleted?: number;
    sessionsMissed?: number;
    actualMeters?: number;
    plannedMeters?: number;
    durationSeconds?: number;
    intensityBreakdown?: Record<string, number>;
    strongestWorkout?: string;
    biggestPositiveSignal?: string;
    potentialConcern?: string;
    progressTowardGoal?: string;
    recommendedEmphasis?: string[];
    narrative?: {
      narrative?: string;
      recommendedEmphasis?: string[];
    };
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="label">Weekly review</p>
        <h1 className="font-display text-3xl font-semibold">This week’s coaching review</h1>
        <p className="mt-1 text-sm text-ink-400">
          Week of {new Date(review.weekStart).toLocaleDateString()} — deterministic totals first,
          narrative second.
        </p>
      </div>

      <section className="panel grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Sessions completed" value={String(summary.sessionsCompleted ?? 0)} />
        <Metric label="Sessions missed" value={String(summary.sessionsMissed ?? 0)} />
        <Metric label="Metres" value={formatDistance(summary.actualMeters)} />
        <Metric label="Duration" value={formatDuration(summary.durationSeconds)} />
      </section>

      <section className="panel p-5">
        <p className="label">Narrative</p>
        <p className="mt-3 text-base leading-relaxed text-ink-100">
          {review.aiNarrative ?? summary.narrative?.narrative}
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel space-y-3 p-5 text-sm">
          <div>
            <p className="label">Strongest workout</p>
            <p className="mt-1 text-ink-200">{summary.strongestWorkout}</p>
          </div>
          <div>
            <p className="label">Biggest positive signal</p>
            <p className="mt-1 text-ink-200">{summary.biggestPositiveSignal}</p>
          </div>
          <div>
            <p className="label">Potential concern</p>
            <p className="mt-1 text-ink-200">{summary.potentialConcern}</p>
          </div>
          <div>
            <p className="label">Progress toward goal</p>
            <p className="mt-1 text-ink-200">{summary.progressTowardGoal}</p>
          </div>
        </section>
        <section className="panel p-5">
          <p className="label">Planned vs actual volume</p>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <Metric label="Planned" value={formatDistance(summary.plannedMeters)} />
            <Metric label="Actual" value={formatDistance(summary.actualMeters)} />
          </div>
          <p className="label mt-6">Recommended emphasis next week</p>
          <ul className="mt-2 space-y-1 text-sm text-ink-300">
            {(summary.narrative?.recommendedEmphasis ?? summary.recommendedEmphasis ?? []).map(
              (item) => (
                <li key={item}>• {item}</li>
              ),
            )}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(summary.intensityBreakdown ?? {}).map(([k, v]) => (
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
    </div>
  );
}
