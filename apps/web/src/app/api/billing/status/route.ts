import { NextResponse } from 'next/server';
import { getAccessSnapshot, listPublicPlans } from '@ergcoach/billing';
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
