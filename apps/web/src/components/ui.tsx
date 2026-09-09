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
      {sub ? <div className="mt-1 text-xs text-ink-400">{sub}</div> : null}
    </div>
  );
}

export function VerdictBadge({ verdict }: { verdict?: string | null }) {
  const tone =
    verdict === 'excellent' || verdict === 'successful'
      ? 'bg-teal-500/15 text-teal-300'
      : verdict === 'partial'
        ? 'bg-amber-500/15 text-amber-200'
        : verdict === 'poor'
          ? 'bg-rose-500/15 text-rose-300'
          : 'bg-ink-700/60 text-ink-300';
  return (
    <span className={`rounded-md px-2 py-0.5 text-xs font-medium capitalize ${tone}`}>
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
      className="flex flex-col gap-2 border-b border-ink-800/80 py-3 transition hover:bg-ink-900/40 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-ink-50">{title ?? workoutType}</span>
          <span className="rounded bg-ink-800 px-1.5 py-0.5 font-mono text-[10px] uppercase text-ink-300">
            {workoutType}
          </span>
          <VerdictBadge verdict={verdict} />
        </div>
        <div className="mt-1 text-xs text-ink-400">
          {date.toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })}
        </div>
      </div>
      <div className="flex flex-wrap gap-4 font-mono text-sm tabular-nums text-ink-200">
        <span>{formatDistance(distanceMeters)}</span>
        <span>{formatDuration(durationSeconds)}</span>
        <span>{formatPace(averagePaceSeconds500m)}</span>
        <span>{averageHeartRate != null ? `${Math.round(averageHeartRate)} bpm` : '—'}</span>
      </div>
    </Link>
  );
}
