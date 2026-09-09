'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const paceMin = Number(form.get('paceMin') || 2);
    const paceSec = Number(form.get('paceSec') || 0);
    const targetPaceSeconds500m = paceMin * 60 + paceSec;

    const res = await fetch('/api/athlete/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        age: form.get('age') ? Number(form.get('age')) : null,
        sex: form.get('sex') || null,
        weightKg: form.get('weightKg') ? Number(form.get('weightKg')) : null,
        maxHeartRate: form.get('maxHeartRate') ? Number(form.get('maxHeartRate')) : null,
        lactateThresholdHeartRate: form.get('lthr') ? Number(form.get('lthr')) : null,
        goal: {
          sport: 'rower',
          eventType: form.get('eventType') || 'marathon',
          targetDate: form.get('targetDate') || null,
          targetPaceSeconds500m,
          targetDistance:
            form.get('eventType') === 'marathon'
              ? 42195
              : form.get('eventType') === 'half_marathon'
                ? 21097
                : form.get('eventType') === 'ten_k'
                  ? 10000
                  : form.get('eventType') === 'five_k'
                    ? 5000
                    : form.get('eventType') === 'two_k'
                      ? 2000
                      : null,
        },
      }),
    });
    setPending(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Could not save profile');
      return;
    }
    router.push('/settings?onboarding=done');
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="page-title text-[32px]">Set up your training</h1>
        <p className="mt-2 text-[15px] text-apple-gray-500">
          Tell us about you and your goal. Next you’ll connect Concept2.
        </p>
      </div>
      <form onSubmit={onSubmit} className="panel space-y-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-[13px]">
            <span className="text-apple-gray-500">Age</span>
            <input className="input mt-1.5" name="age" type="number" min={12} max={100} />
          </label>
          <label className="block text-[13px]">
            <span className="text-apple-gray-500">Sex</span>
            <select className="input mt-1.5" name="sex" defaultValue="">
              <option value="">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="block text-[13px]">
            <span className="text-apple-gray-500">Weight (kg)</span>
            <input className="input mt-1.5" name="weightKg" type="number" step="0.1" />
          </label>
          <label className="block text-[13px]">
            <span className="text-apple-gray-500">Max HR</span>
            <input className="input mt-1.5" name="maxHeartRate" type="number" />
          </label>
          <label className="block text-[13px]">
            <span className="text-apple-gray-500">Lactate threshold HR</span>
            <input className="input mt-1.5" name="lthr" type="number" />
          </label>
          <label className="block text-[13px]">
            <span className="text-apple-gray-500">Event</span>
            <select className="input mt-1.5" name="eventType" defaultValue="marathon">
              <option value="marathon">RowErg Marathon</option>
              <option value="half_marathon">Half marathon</option>
              <option value="ten_k">10k</option>
              <option value="five_k">5k</option>
              <option value="two_k">2k</option>
              <option value="general_endurance">General endurance</option>
            </select>
          </label>
          <label className="block text-[13px]">
            <span className="text-apple-gray-500">Target date</span>
            <input className="input mt-1.5" name="targetDate" type="date" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-[13px]">
              <span className="text-apple-gray-500">Pace min</span>
              <input className="input mt-1.5" name="paceMin" type="number" defaultValue={2} min={1} />
            </label>
            <label className="block text-[13px]">
              <span className="text-apple-gray-500">Pace sec</span>
              <input className="input mt-1.5" name="paceSec" type="number" defaultValue={0} min={0} max={59} />
            </label>
          </div>
        </div>
        <p className="text-[12px] text-apple-gray-400">
          Target pace is seconds per 500m (e.g. 2:00 → min 2, sec 0).
        </p>
        {error ? <p className="text-[13px] text-red-600">{error}</p> : null}
        <button className="btn-primary w-full" disabled={pending} type="submit">
          {pending ? 'Saving…' : 'Save and connect Concept2'}
        </button>
      </form>
    </div>
  );
}
