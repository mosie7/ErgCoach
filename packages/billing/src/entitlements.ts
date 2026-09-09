import { prisma, type PlanTier, type SubscriptionStatus } from '@ergcoach/database';
import {
  ACTIVE_SUBSCRIPTION_STATUSES,
  planHasEntitlement,
  type Entitlement,
  type PlanId,
  PLANS,
} from './plans.js';

export class EntitlementError extends Error {
  readonly code = 'ENTITLEMENT_REQUIRED';
  readonly entitlement: Entitlement;
  readonly upgradeUrl = '/pricing';

  constructor(entitlement: Entitlement, message?: string) {
    super(message ?? `Pro subscription required for ${entitlement}`);
    this.name = 'EntitlementError';
    this.entitlement = entitlement;
  }
}

export interface AccessSnapshot {
  plan: PlanId;
  status: SubscriptionStatus | 'inactive';
  hasAiCoach: boolean;
  isComplimentary: boolean;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  stripeConfigured: boolean;
  billingEnabled: boolean;
}

function billingEnabled(): boolean {
  // Default ON for production-like behaviour; set BILLING_ENABLED=false to unlock everything in local/dev.
  if (process.env.BILLING_ENABLED === 'false') return false;
  return true;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_PRO_MONTHLY);
}

export async function getSubscriptionForUser(userId: string) {
  return prisma.subscription.findUnique({ where: { userId } });
}

export async function ensureFreeSubscription(userId: string) {
  return prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      plan: 'free',
      status: 'inactive',
    },
    update: {},
  });
}

export function resolveEffectivePlan(sub: {
  plan: PlanTier;
  status: SubscriptionStatus;
  isComplimentary: boolean;
  currentPeriodEnd: Date | null;
} | null): PlanId {
  if (!billingEnabled()) return 'pro';
  if (!sub) return 'free';
  if (sub.isComplimentary && sub.plan === 'pro') return 'pro';
  if (ACTIVE_SUBSCRIPTION_STATUSES.has(sub.status) && sub.plan === 'pro') {
    if (sub.currentPeriodEnd && sub.currentPeriodEnd < new Date() && sub.status !== 'trialing') {
      // Period ended without renewal webhook yet — treat conservatively as free
      return 'free';
    }
    return 'pro';
  }
  return 'free';
}

export async function getAccessSnapshot(userId: string): Promise<AccessSnapshot> {
  const sub = await getSubscriptionForUser(userId);
  const plan = resolveEffectivePlan(sub);
  return {
    plan,
    status: sub?.status ?? 'inactive',
    hasAiCoach: planHasEntitlement(plan, 'ai_coach_chat'),
    isComplimentary: sub?.isComplimentary ?? false,
    currentPeriodEnd: sub?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
    stripeConfigured: isStripeConfigured(),
    billingEnabled: billingEnabled(),
  };
}

export async function hasEntitlement(userId: string, entitlement: Entitlement): Promise<boolean> {
  if (!billingEnabled()) return true;
  const snapshot = await getAccessSnapshot(userId);
  return planHasEntitlement(snapshot.plan, entitlement);
}

export async function requireEntitlement(userId: string, entitlement: Entitlement): Promise<void> {
  const ok = await hasEntitlement(userId, entitlement);
  if (!ok) {
    throw new EntitlementError(entitlement);
  }
}

export function listPublicPlans() {
  return Object.values(PLANS);
}
