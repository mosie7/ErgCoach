import { describe, expect, it } from 'vitest';
import { planHasEntitlement as has, PLANS } from './plans.js';

describe('plans', () => {
  it('free plan excludes AI coach entitlements', () => {
    expect(has('free', 'ai_coach_chat')).toBe(false);
    expect(has('free', 'ai_workout_analysis')).toBe(false);
    expect(has('free', 'workouts')).toBe(true);
  });

  it('pro plan includes AI coaching', () => {
    expect(has('pro', 'ai_coach_chat')).toBe(true);
    expect(has('pro', 'ai_weekly_review')).toBe(true);
    expect(PLANS.pro?.highlighted).toBe(true);
  });
});

function resolvePlan(sub: {
  plan: 'free' | 'pro';
  status: string;
  isComplimentary: boolean;
  currentPeriodEnd: Date | null;
} | null): 'free' | 'pro' {
  if (!sub) return 'free';
  if (sub.isComplimentary && sub.plan === 'pro') return 'pro';
  if ((sub.status === 'active' || sub.status === 'trialing') && sub.plan === 'pro') return 'pro';
  return 'free';
}

describe('effective plan resolution', () => {
  it('grants pro for complimentary demo subscriptions', () => {
    expect(
      resolvePlan({
        plan: 'pro',
        status: 'active',
        isComplimentary: true,
        currentPeriodEnd: null,
      }),
    ).toBe('pro');
  });

  it('keeps free users free', () => {
    expect(
      resolvePlan({
        plan: 'free',
        status: 'inactive',
        isComplimentary: false,
        currentPeriodEnd: null,
      }),
    ).toBe('free');
  });
});
