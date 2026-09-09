import { generateWeeklyReview } from '@ergcoach/services';
import { formatDistance, formatDuration } from '@ergcoach/shared';
import { requireSessionAthlete } from '@/lib/session';
import { Metric } from '@/components/ui';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type ReviewSummary = {
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
  narrative?: { narrative?: string; recommendedEmphasis?: string[] };
  aiLocked?: boolean;
};

export default async function ReviewPage() {
  const { athlete } = await requireSessionAthlete();

  let review: { weekStart: string | Date; aiNarrative?: string | null; summary: unknown } | null = null;
  let error: string | null = null;

  try {
    review = await generateWeeklyReview(athlete.id);
  } catch (err) {
    console.error('[ReviewPage] generateWeeklyReview failed:', err);
    error = err instanceof Error ? err.message : 'Failed to generate weekly review';
  }

  if (error || !review) {
    return (
      <div className="space-y-6">
        <div>
          <p className="label">Weekly review</p>
          <h1 className="page-title text-[32px]">This week</h1>
        </div>
        <section className="panel p-5">
          <p className="text-[14px] text-apple-gray-500">
            {error ?? 'No review data available yet.'}
          </p>
          <p className="mt-2 text-[13px] text-apple-gray-400">
            Log some workouts first, then come back for your weekly review.
          </p>
          <Link href="/workouts/new" className="btn-primary mt-4 inline-block">
            Log a workout
          </Link>
        </section>
      </div>
    );
  }

  const summary = (review.summary ?? {}) as ReviewSummary;

  return (
    <div className="space-y-6">
      <div>
        <p className="label">Weekly review</p>
        <h1 className="page-title text-[32px]">This week</h1>
        <p className="mt-2 text-[15px] text-apple-gray-500">
          Week of {new Date(review.weekStart).toLocaleDateString()} — totals first, coaching second.
        </p>
      </div>

      <section className="panel grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Sessions" value={String(summary.sessionsCompleted ?? 0)} />
        <Metric label="Missed" value={String(summary.sessionsMissed ?? 0)} />
        <Metric label="Metres" value={formatDistance(summary.actualMeters)} />
        <Metric label="Duration" value={formatDuration(summary.durationSeconds)} />
      </section>

      <section className="panel p-5">
        <p className="label">Narrative</p>
        <p className="mt-3 text-[16px] leading-relaxed text-apple-gray-700 dark:text-apple-gray-100">
          {review.aiNarrative ?? summary.narrative?.narrative ?? 'No narrative generated for this week.'}
        </p>
        {summary.aiLocked ? (
          <Link href="/pricing" className="mt-3 inline-block text-[13px] text-apple-blue hover:underline">
            Upgrade to Pro for AI weekly coaching
          </Link>
        ) : null}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel space-y-4 p-5 text-[14px]">
          <div>
            <p className="label">Strongest workout</p>
            <p className="mt-1">{summary.strongestWorkout ?? '—'}</p>
          </div>
          <div>
            <p className="label">Positive signal</p>
            <p className="mt-1">{summary.biggestPositiveSignal ?? '—'}</p>
          </div>
          <div>
            <p className="label">Watch-out</p>
            <p className="mt-1">{summary.potentialConcern ?? '—'}</p>
          </div>
        </section>
        <section className="panel p-5">
          <p className="label">Volume</p>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <Metric label="Planned" value={formatDistance(summary.plannedMeters)} />
            <Metric label="Actual" value={formatDistance(summary.actualMeters)} />
          </div>
          <p className="label mt-6">Next week focus</p>
          <ul className="mt-2 space-y-1 text-[14px] text-apple-gray-600 dark:text-apple-gray-300">
            {(summary.narrative?.recommendedEmphasis ?? summary.recommendedEmphasis ?? []).map(
              (item) => (
                <li key={item}>• {item}</li>
              ),
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
