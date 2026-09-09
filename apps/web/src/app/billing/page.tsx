'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

type Access = {
  plan: string;
  status: string;
  hasAiCoach: boolean;
  isComplimentary: boolean;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeConfigured: boolean;
  billingEnabled: boolean;
};

function BillingInner() {
  const params = useSearchParams();
  const [access, setAccess] = useState<Access | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const checkout = params.get('checkout');

  useEffect(() => {
    fetch('/api/billing/status')
      .then((r) => r.json())
      .then((data) => setAccess(data.access ?? null))
      .catch(() => setError('Failed to load billing status'));
  }, []);

  async function openPortal() {
    setPending(true);
    setError(null);
    const res = await fetch('/api/billing/portal', { method: 'POST' });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? 'Could not open billing portal');
      return;
    }
    window.location.href = data.url;
  }

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
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="label">Billing</p>
        <h1 className="font-display text-3xl font-semibold">Your subscription</h1>
        <p className="mt-1 text-sm text-apple-gray-500">
          Manage Pro Coach access. AI features use ErgCoach’s OpenAI account — included in your
          subscription.
        </p>
      </div>

      {checkout === 'success' ? (
        <div className="rounded-lg border border-teal-500/30 bg-teal-500/10 px-4 py-3 text-sm text-teal-200">
          Checkout completed. If Pro is not active yet, wait a few seconds for the Stripe webhook.
        </div>
      ) : null}

      <section className="panel space-y-4 p-5">
        {access ? (
          <>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="label">Plan</p>
                <p className="mt-1 capitalize text-apple-gray-700 dark:text-white">{access.plan}</p>
              </div>
              <div>
                <p className="label">Status</p>
                <p className="mt-1 capitalize text-apple-gray-700 dark:text-white">{access.status}</p>
              </div>
              <div>
                <p className="label">AI coach</p>
                <p className="mt-1 text-apple-gray-700 dark:text-white">{access.hasAiCoach ? 'Unlocked' : 'Locked'}</p>
              </div>
              <div>
                <p className="label">Renews / ends</p>
                <p className="mt-1 text-apple-gray-700 dark:text-white">
                  {access.currentPeriodEnd
                    ? new Date(access.currentPeriodEnd).toLocaleDateString()
                    : '—'}
                </p>
              </div>
            </div>
            {access.isComplimentary ? (
              <p className="text-xs text-apple-gray-700 dark:text-white0">
                Complimentary demo grant (no Stripe customer). Real subscribers manage via Stripe
                Customer Portal.
              </p>
            ) : null}
            {access.cancelAtPeriodEnd ? (
              <p className="text-sm text-amber-200">Cancels at period end.</p>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-apple-gray-700 dark:text-white0">Loading…</p>
        )}

        <div className="flex flex-wrap gap-2">
          {access?.hasAiCoach ? (
            <>
              <Link href="/coach" className="btn-primary">
                Open coach
              </Link>
              {!access.isComplimentary ? (
                <button type="button" className="btn-ghost" disabled={pending} onClick={openPortal}>
                  {pending ? 'Opening…' : 'Manage in Stripe'}
                </button>
              ) : null}
            </>
          ) : (
            <button type="button" className="btn-primary" disabled={pending} onClick={startCheckout}>
              {pending ? 'Redirecting…' : 'Upgrade to Pro'}
            </button>
          )}
          <Link href="/pricing" className="btn-ghost">
            View plans
          </Link>
        </div>
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      </section>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<p className="text-apple-gray-500">Loading billing…</p>}>
      <BillingInner />
    </Suspense>
  );
}
