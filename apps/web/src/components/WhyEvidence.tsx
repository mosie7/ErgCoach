'use client';

import { useState } from 'react';
import { formatPace } from '@ergcoach/shared';

export type WhyItem = {
  tier?: string;
  similarityScore?: number;
  reasons?: string[];
  previous?: {
    id?: string;
    title?: string | null;
    startedAt?: string | Date;
    pace?: number | null;
    paceFormatted?: string | null;
    hr?: number | null;
    distanceMeters?: number | null;
  } | null;
  deltas?: {
    paceSecondsFaster?: number | null;
    hrDelta?: number | null;
    interpretation?: string;
  };
};

export function WhyEvidence({
  claim,
  items,
  todayPace,
  todayHr,
}: {
  claim: string;
  items: WhyItem[];
  todayPace?: number | null;
  todayHr?: number | null;
}) {
  const [open, setOpen] = useState(false);
  if (!items.length) return null;

  return (
    <div className="mt-3">
      <button
        type="button"
        className="text-[13px] text-apple-blue hover:underline"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? 'Hide evidence' : 'Why?'}
      </button>
      {open ? (
        <div className="mt-3 space-y-3 rounded-apple border border-apple-gray-200 bg-apple-gray-50 p-4 text-[13px] dark:border-apple-gray-600 dark:bg-apple-gray-800">
          <p className="font-medium text-apple-gray-700 dark:text-apple-gray-100">{claim}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <p className="label">Today</p>
              <p className="mt-1 tabular-nums">
                {formatPace(todayPace)} · {todayHr != null ? `${Math.round(todayHr)} bpm` : '— HR'}
              </p>
            </div>
            {items.slice(0, 2).map((item, idx) => (
              <div key={item.previous?.id ?? idx}>
                <p className="label">
                  Comparable {idx + 1}
                  {item.tier ? ` · ${item.tier.replace('_', ' ')}` : ''}
                </p>
                <p className="mt-1 tabular-nums">
                  {item.previous?.paceFormatted ?? formatPace(item.previous?.pace)} ·{' '}
                  {item.previous?.hr != null ? `${Math.round(item.previous.hr)} bpm` : '— HR'}
                </p>
                {item.deltas?.paceSecondsFaster != null ? (
                  <p className="mt-1 text-apple-gray-500">
                    {item.deltas.paceSecondsFaster > 0 ? '+' : ''}
                    {item.deltas.paceSecondsFaster}s/500m vs prior
                    {item.deltas.hrDelta != null
                      ? ` · HR ${item.deltas.hrDelta > 0 ? '+' : ''}${item.deltas.hrDelta}`
                      : ''}
                  </p>
                ) : null}
                {item.reasons?.length ? (
                  <p className="mt-1 text-[12px] text-apple-gray-400">{item.reasons.join(' · ')}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
