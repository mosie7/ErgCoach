'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const TYPES = [
  'UT2',
  'UT1',
  'AT',
  'TR',
  'AN',
  'recovery',
  'benchmark',
  'race',
  'strength',
  'unknown',
] as const;

export default function NewWorkoutPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch('/api/workouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startedAt: form.get('startedAt'),
        workoutType: form.get('workoutType'),
        title: form.get('title'),
        durationSeconds: Number(form.get('durationSeconds')),
        distanceMeters: Number(form.get('distanceMeters')),
        averagePaceSeconds500m: form.get('averagePaceSeconds500m')
          ? Number(form.get('averagePaceSeconds500m'))
          : null,
        averageHeartRate: form.get('averageHeartRate')
          ? Number(form.get('averageHeartRate'))
          : null,
        maxHeartRate: form.get('maxHeartRate') ? Number(form.get('maxHeartRate')) : null,
        averageStrokeRate: form.get('averageStrokeRate')
          ? Number(form.get('averageStrokeRate'))
          : null,
        rpe: form.get('rpe') ? Number(form.get('rpe')) : null,
        notes: form.get('notes') || null,
      }),
    });
    setPending(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Failed to save workout');
      return;
    }
    const workout = await res.json();
    router.push(`/workouts/${workout.id}`);
    router.refresh();
  }

  const nowLocal = new Date();
  nowLocal.setMinutes(nowLocal.getMinutes() - nowLocal.getTimezoneOffset());

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <p className="label">Manual entry</p>
        <h1 className="font-display text-3xl font-semibold">Log a workout</h1>
        <p className="mt-1 text-sm text-apple-gray-500">
          Usable without Concept2 OAuth. Triggers deterministic metrics + AI interpretation.
        </p>
      </div>
      <form onSubmit={onSubmit} className="panel space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-apple-gray-500">Date / time</span>
            <input
              className="input mt-1"
              type="datetime-local"
              name="startedAt"
              required
              defaultValue={nowLocal.toISOString().slice(0, 16)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-apple-gray-500">Workout type</span>
            <select className="input mt-1" name="workoutType" defaultValue="UT2">
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-sm">
          <span className="text-apple-gray-500">Title</span>
          <input className="input mt-1" name="title" placeholder="UT2 16k steady" />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-apple-gray-500">Duration (seconds)</span>
            <input className="input mt-1" name="durationSeconds" type="number" required defaultValue={3600} />
          </label>
          <label className="block text-sm">
            <span className="text-apple-gray-500">Distance (metres)</span>
            <input className="input mt-1" name="distanceMeters" type="number" required defaultValue={14000} />
          </label>
          <label className="block text-sm">
            <span className="text-apple-gray-500">Avg pace (sec/500m)</span>
            <input className="input mt-1" name="averagePaceSeconds500m" type="number" step="0.1" placeholder="128" />
          </label>
          <label className="block text-sm">
            <span className="text-apple-gray-500">Avg SPM</span>
            <input className="input mt-1" name="averageStrokeRate" type="number" step="0.1" placeholder="18" />
          </label>
          <label className="block text-sm">
            <span className="text-apple-gray-500">Avg HR</span>
            <input className="input mt-1" name="averageHeartRate" type="number" placeholder="140" />
          </label>
          <label className="block text-sm">
            <span className="text-apple-gray-500">Max HR</span>
            <input className="input mt-1" name="maxHeartRate" type="number" placeholder="148" />
          </label>
          <label className="block text-sm">
            <span className="text-apple-gray-500">RPE (1–10)</span>
            <input className="input mt-1" name="rpe" type="number" min={1} max={10} />
          </label>
        </div>
        <label className="block text-sm">
          <span className="text-apple-gray-500">Notes</span>
          <textarea className="input mt-1 min-h-[90px]" name="notes" placeholder="Felt controlled..." />
        </label>
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        <button className="btn-primary" disabled={pending} type="submit">
          {pending ? 'Saving & analysing…' : 'Save workout'}
        </button>
      </form>
    </div>
  );
}
