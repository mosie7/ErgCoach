import { NextResponse } from 'next/server';
import { createCheckoutSession, isStripeConfigured } from '@ergcoach/billing';
import { getSessionUser, getDemoAthleteId } from '@/lib/session';
import { prisma } from '@ergcoach/database';

async function resolveUserId(): Promise<string | null> {
  const user = await getSessionUser();
  if (user) return user.id;
  const athleteId = await getDemoAthleteId();
  if (!athleteId) return null;
  const athlete = await prisma.athleteProfile.findUnique({ where: { id: athleteId } });
  return athlete?.userId ?? null;
}

export async function POST() {
  try {
    const userId = await resolveUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }
    if (!isStripeConfigured()) {
      return NextResponse.json(
        {
          error:
            'Stripe is not configured yet. Set STRIPE_SECRET_KEY and STRIPE_PRICE_PRO_MONTHLY.',
          setupUrl: '/pricing',
        },
        { status: 503 },
      );
    }
    const session = await createCheckoutSession(userId);
    return NextResponse.json(session);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Checkout failed' },
      { status: 500 },
    );
  }
}
