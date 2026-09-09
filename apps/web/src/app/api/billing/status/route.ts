import { NextResponse } from 'next/server';
import { getAccessSnapshot, listPublicPlans } from '@ergcoach/billing';
import { getSessionAthlete } from '@/lib/session';

async function resolveUserId(): Promise<string | null> {
  const session = await getSessionAthlete();
  return session?.user.id ?? null;
}

export async function GET() {
  const userId = await resolveUserId();
  const access = userId
    ? await getAccessSnapshot(userId)
    : {
        plan: 'free' as const,
        status: 'inactive' as const,
        hasAiCoach: false,
        isComplimentary: false,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        stripeConfigured: Boolean(
          process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_PRO_MONTHLY,
        ),
        billingEnabled: process.env.BILLING_ENABLED !== 'false',
      };

  return NextResponse.json({
    access,
    plans: listPublicPlans(),
  });
}
