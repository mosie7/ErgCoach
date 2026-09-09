export type PlanId = 'free' | 'pro';

export type Entitlement =
  | 'workouts'
  | 'metrics'
  | 'dashboard'
  | 'ai_coach_chat'
  | 'ai_workout_analysis'
  | 'ai_weekly_review'
  | 'training_blocks'
  | 'comparable_analysis'
  | 'why_evidence';

export interface PlanDefinition {
  id: PlanId;
  name: string;
  description: string;
  /** Display price — real amount comes from Stripe Price */
  priceLabel: string;
  intervalLabel: string;
  entitlements: Entitlement[];
  highlighted?: boolean;
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Log workouts and see objective training metrics.',
    priceLabel: '£0',
    intervalLabel: 'forever',
    entitlements: ['workouts', 'metrics', 'dashboard'],
  },
  pro: {
    id: 'pro',
    name: 'Pro Coach',
    description: 'AI coach chat, post-workout coaching reports, and weekly reviews.',
    priceLabel: '£19',
    intervalLabel: '/ month',
    entitlements: [
      'workouts',
      'metrics',
      'dashboard',
      'ai_coach_chat',
      'ai_workout_analysis',
      'ai_weekly_review',
      'training_blocks',
      'comparable_analysis',
      'why_evidence',
    ],
    highlighted: true,
  },
};

export const ACTIVE_SUBSCRIPTION_STATUSES = new Set([
  'active',
  'trialing',
]);

export function planHasEntitlement(plan: PlanId, entitlement: Entitlement): boolean {
  return PLANS[plan].entitlements.includes(entitlement);
}
