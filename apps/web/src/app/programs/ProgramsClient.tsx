'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistance } from '@ergcoach/shared';

export type ProgramCard = {
  eventType: string;
  slug: string;
  name: string;
  shortLabel: string;
  distanceMeters: number;
  durationWeeks: number;
  sessionsPerWeek: number;
  focus: string;
  summary: string;
};

export function ProgramsClient({ programs }: { programs: ProgramCard[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState(programs[4]?.eventType ?? programs[0]?.eventType ?? 'marathon');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const active = useMemo(
    () => programs.find((p) => p.eventType === selected) ?? programs[0],
    [programs, selected],
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!active) return;
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch('/api/programs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: active.eventType,
        targetDate: form.get('targetDate') || null,
        paceMin: form.get('paceMin') ? Number(form.get('paceMin')) : null,
        paceSec: form.get('paceSec') ? Number(form.get('paceSec')) : null,
      }),
    });
    setPending(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Could not start program');
      return;
    }
    router.push('/');
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="label">Training programs</p>
        <h1 className="page-title mt-1">Choose your distance</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-apple-gray-500">
          Pick a race distance and we’ll generate a week-by-week RowErg plan with planned sessions.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {programs.map((program) => {
          const isActive = program.eventType === selected;
          return (
            <button
              key={program.eventType}
              type="button"
              onClick={() => setSelected(program.eventType)}
              className={`rounded-apple border p-5 text-left transition ${
                isActive
                  ? 'border-apple-gray-700 bg-apple-gray-700 text-white dark:border-white dark:bg-white dark:text-black'
                  : 'border-apple-gray-200 bg-white hover:border-apple-gray-400 dark:border-apple-gray-600 dark:bg-apple-gray-800'
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-display text-[28px] font-semibold tracking-[-0.04em]">
                  {program.shortLabel}
                </span>
                <span
                  className={`text-[12px] ${isActive ? 'text-white/70 dark:text-black/60' : 'text-apple-gray-400'}`}
                >
                  {formatDistance(program.distanceMeters)}
                </span>
              </div>
              <p
                className={`mt-3 text-[13px] font-medium ${isActive ? 'text-white/90 dark:text-black/80' : 'text-apple-gray-700 dark:text-apple-gray-100'}`}
              >
                {program.focus}
              </p>
              <p
                className={`mt-1 text-[12px] leading-relaxed ${isActive ? 'text-white/65 dark:text-black/55' : 'text-apple-gray-500'}`}
              >
                {program.durationWeeks} weeks · {program.sessionsPerWeek}/week
              </p>
            </button>
          );
        })}
      </div>

      {active ? (
        <section className="panel space-y-5 p-6">
          <div>
            <h2 className="section-title">{active.name}</h2>
            <p className="mt-2 max-w-2xl text-[14px] text-apple-gray-500">{active.summary}</p>
          </div>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-[13px]">
              <span className="text-apple-gray-500">Target date</span>
              <input className="input mt-1.5" name="targetDate" type="date" />
            </label>
            <label className="block text-[13px]">
              <span className="text-apple-gray-500">Pace min / 500m</span>
              <input className="input mt-1.5" name="paceMin" type="number" defaultValue={2} min={1} />
            </label>
            <label className="block text-[13px]">
              <span className="text-apple-gray-500">Pace sec</span>
              <input
                className="input mt-1.5"
                name="paceSec"
                type="number"
                defaultValue={0}
                min={0}
                max={59}
              />
            </label>
            <div className="flex items-end">
              <button className="btn-primary w-full" disabled={pending} type="submit">
                {pending ? 'Starting…' : `Start ${active.shortLabel} program`}
              </button>
            </div>
          </form>
          {error ? <p className="text-[13px] text-red-600">{error}</p> : null}
          <p className="text-[12px] text-apple-gray-400">
            Starting a program replaces your active goal and creates a new training plan with scheduled
            workouts.
          </p>
        </section>
      ) : null}
    </div>
  );
}
