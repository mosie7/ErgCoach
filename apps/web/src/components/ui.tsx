import { formatDistance, formatDuration, formatPace } from '@ergcoach/shared';
import Link from 'next/link';

export function Metric({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="metric mt-1">{value}</div>
      {sub ? <div className="mt-1 text-[12px] text-apple-gray-400">{sub}</div> : null}
    </div>
  );
}

export function VerdictBadge({ verdict }: { verdict?: string | null }) {
  const tone =
    verdict === 'excellent' || verdict === 'successful'
      ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
      : verdict === 'partial'
        ? 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
        : verdict === 'poor'
          ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
          : 'bg-apple-gray-100 text-apple-gray-500 dark:bg-apple-gray-800 dark:text-apple-gray-400';
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${tone}`}>
      {verdict ?? 'unanalysed'}
    </span>
  );
}

export function WorkoutRow({
  id,
  title,
  startedAt,
  distanceMeters,
  durationSeconds,
  averagePaceSeconds500m,
  workoutType,
  averageHeartRate,
  verdict,
}: {
  id: string;
  title?: string | null;
  startedAt: Date | string;
  distanceMeters: number;
  durationSeconds: number;
  averagePaceSeconds500m?: number | null;
  workoutType: string;
  averageHeartRate?: number | null;
  verdict?: string | null;
}) {
  const date = new Date(startedAt);
  return (
    <Link
      href={`/workouts/${id}`}
      className="flex flex-col gap-2 border-b border-apple-gray-100 py-4 transition hover:bg-apple-gray-50 dark:border-apple-gray-800 dark:hover:bg-apple-gray-900 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[15px] font-medium tracking-[-0.01em]">
            {title ?? workoutType}
          </span>
          <span className="rounded-full bg-apple-gray-100 px-2 py-0.5 font-mono text-[10px] uppercase text-apple-gray-500 dark:bg-apple-gray-800">
            {workoutType}
          </span>
          <VerdictBadge verdict={verdict} />
        </div>
        <div className="mt-1 text-[12px] text-apple-gray-400">
          {date.toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })}
        </div>
      </div>
      <div className="flex flex-wrap gap-4 font-mono text-[13px] tabular-nums text-apple-gray-600 dark:text-apple-gray-300">
        <span>{formatDistance(distanceMeters)}</span>
        <span>{formatDuration(durationSeconds)}</span>
        <span>{formatPace(averagePaceSeconds500m)}</span>
        <span>{averageHeartRate != null ? `${Math.round(averageHeartRate)} bpm` : '—'}</span>
      </div>
    </Link>
  );
}
