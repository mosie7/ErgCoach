'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Plan = {
  id: string;
  name: string;
  description: string;
  priceLabel: string;
  intervalLabel: string;
  entitlements: string[];
  highlighted?: boolean;
};

type Access = {
  plan: string;
  status: string;
  hasAiCoach: boolean;
  isComplimentary: boolean;
  stripeConfigured: boolean;
  billingEnabled: boolean;
};

const ENTITLEMENT_LABELS: Record<string, string> = {
  workouts: 'Manual + Concept2 workout logging',
  metrics: 'Deterministic pace, drift, volume metrics',
  dashboard: 'Goal readiness & progress dashboard',
  ai_coach_chat: 'AI coach chat with training-block context',
  ai_workout_analysis: 'AI post-workout coaching reports',
  ai_weekly_review: 'AI weekly review narrative',
  training_blocks: 'Training block tracking & analysis',
  comparable_analysis: 'Block-aware comparable sessions',
  why_evidence: 'Why? evidence under AI conclusions',
};

export default function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [access, setAccess] = useState<Access | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    fetch('/api/billing/status')
      .then((r) => r.json())
      .then((data) => {
        setPlans(data.plans ?? []);
        setAccess(data.access ?? null);
      })
      .catch(() => setError('Failed to load plans'));
  }, []);

  async function startCheckout() {
    setPending(true);
    setError(null);
    const res = await fetch('/api/billing/checkout', { method: 'POST' });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? 'Checkout failed');
      return;
    }
    window.location.href = data.url;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="label">Subscription</p>
        <h1 className="font-display text-3xl font-semibold">Choose your coaching plan</h1>
        <p className="mt-2 max-w-2xl text-sm text-apple-gray-500">
          Free keeps objective training analytics. Pro unlocks AI coach chat, AI workout reports,
          and weekly coaching narratives. You pay ErgCoach — we use our OpenAI API behind the
          scenes.
        </p>
      </div>

      {access ? (
        <div className="panel p-4 text-sm text-apple-gray-500">
          Current plan:{' '}
          <span className="font-medium capitalize text-apple-gray-700 dark:text-white">{access.plan}</span>
          {access.isComplimentary ? ' (complimentary demo)' : ''} · status{' '}
          <span className="capitalize">{access.status}</span>
          {!access.billingEnabled ? ' · billing disabled in this environment' : null}
          <span className="mx-2">·</span>
          <Link href="/billing" className="text-apple-blue hover:underline">
            Manage billing
          </Link>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {plans.map((plan) => (
          <section
            key={plan.id}
            className={`panel flex flex-col p-6 ${
              plan.highlighted ? 'border-accent/50 ring-1 ring-accent/30' : ''
            }`}
          >
            <p className="label">{plan.id}</p>
            <h2 className="mt-1 font-display text-2xl font-semibold">{plan.name}</h2>
            <p className="mt-2 text-sm text-apple-gray-500">{plan.description}</p>
            <div className="mt-4 font-mono text-3xl text-apple-blue">
              {plan.priceLabel}
              <span className="text-base text-apple-gray-500">{plan.intervalLabel}</span>
            </div>
            <ul className="mt-4 flex-1 space-y-2 text-sm text-apple-gray-500">
              {plan.entitlements.map((e) => (
                <li key={e} className="flex gap-2">
                  <span className="text-teal-400">✓</span>
                  <span>{ENTITLEMENT_LABELS[e] ?? e}</span>
                </li>
              ))}
            </ul>
            {plan.id === 'pro' ? (
              access?.hasAiCoach ? (
                <Link href="/coach" className="btn-primary mt-6 w-full">
                  Open coach chat
                </Link>
              ) : (
                <button
                  type="button"
                  className="btn-primary mt-6 w-full"
                  disabled={pending}
                  onClick={startCheckout}
                >
                  {pending ? 'Redirecting…' : 'Upgrade to Pro'}
                </button>
              )
            ) : (
              <Link href="/" className="btn-ghost mt-6 w-full">
                Continue with Free
              </Link>
            )}
          </section>
        ))}
      </div>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <section className="panel space-y-2 p-5 text-sm text-apple-gray-500">
        <h3 className="font-display text-base font-semibold text-apple-gray-700 dark:text-apple-gray-100">Stripe setup</h3>
        <p>
          Create a Product + recurring Price in Stripe, then set{' '}
          <code className="text-apple-gray-500">STRIPE_SECRET_KEY</code>,{' '}
          <code className="text-apple-gray-500">STRIPE_PRICE_PRO_MONTHLY</code>, and{' '}
          <code className="text-apple-gray-500">STRIPE_WEBHOOK_SECRET</code>. Webhook endpoint:{' '}
          <code className="text-apple-gray-500">POST /api/billing/webhook</code>
        </p>
        <p>
          Local demo user is seeded with complimentary Pro so you can try the coach without Stripe.
        </p>
      </section>
    </div>
  );
}
