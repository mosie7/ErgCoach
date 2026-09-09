import { NextResponse } from 'next/server';
import { createBillingPortalSession, isStripeConfigured } from '@ergcoach/billing';
import { getSessionAthlete } from '@/lib/session';

async function resolveUserId(): Promise<string | null> {
  const session = await getSessionAthlete();
  return session?.user.id ?? null;
}

export async function POST() {
  try {
    const userId = await resolveUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }
    if (!isStripeConfigured()) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 });
    }
    const session = await createBillingPortalSession(userId);
    return NextResponse.json(session);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Portal failed' },
      { status: 500 },
    );
  }
}
