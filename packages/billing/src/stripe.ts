import Stripe from 'stripe';
import { prisma } from '@ergcoach/database';
import { isStripeConfigured } from './entitlements.js';

let stripeSingleton: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(key, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    });
  }
  return stripeSingleton;
}

export function getProPriceId(): string {
  const price = process.env.STRIPE_PRICE_PRO_MONTHLY;
  if (!price) throw new Error('STRIPE_PRICE_PRO_MONTHLY is not configured');
  return price;
}

export function appUrl(path = ''): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function getOrCreateStripeCustomer(userId: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { subscription: true },
  });

  if (user.subscription?.stripeCustomerId) {
    return user.subscription.stripeCustomerId;
  }

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.displayName,
    metadata: { ergcoachUserId: user.id },
  });

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      plan: 'free',
      status: 'inactive',
      stripeCustomerId: customer.id,
    },
    update: {
      stripeCustomerId: customer.id,
    },
  });

  return customer.id;
}

export async function createCheckoutSession(userId: string): Promise<{ url: string }> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY and STRIPE_PRICE_PRO_MONTHLY.');
  }

  const customerId = await getOrCreateStripeCustomer(userId);
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: getProPriceId(), quantity: 1 }],
    success_url: appUrl('/billing?checkout=success'),
    cancel_url: appUrl('/pricing?checkout=canceled'),
    allow_promotion_codes: true,
    client_reference_id: userId,
    metadata: { ergcoachUserId: userId },
    subscription_data: {
      metadata: { ergcoachUserId: userId },
      trial_period_days: process.env.STRIPE_TRIAL_DAYS
        ? Number(process.env.STRIPE_TRIAL_DAYS)
        : undefined,
    },
  });

  if (!session.url) {
    throw new Error('Stripe Checkout did not return a URL');
  }
  return { url: session.url };
}

export async function createBillingPortalSession(userId: string): Promise<{ url: string }> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured');
  }
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub?.stripeCustomerId) {
    throw new Error('No Stripe customer on file — subscribe first');
  }
  const stripe = getStripe();
  const portal = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: appUrl('/billing'),
  });
  return { url: portal.url };
}

function mapStripeStatus(status: Stripe.Subscription.Status) {
  switch (status) {
    case 'active':
      return 'active' as const;
    case 'trialing':
      return 'trialing' as const;
    case 'past_due':
      return 'past_due' as const;
    case 'canceled':
      return 'canceled' as const;
    case 'incomplete':
    case 'incomplete_expired':
      return 'incomplete' as const;
    default:
      return 'inactive' as const;
  }
}

export async function syncSubscriptionFromStripe(
  stripeSubscription: Stripe.Subscription,
  userIdHint?: string,
) {
  const customerId =
    typeof stripeSubscription.customer === 'string'
      ? stripeSubscription.customer
      : stripeSubscription.customer.id;

  const metadataUserId =
    userIdHint ??
    stripeSubscription.metadata?.['ergcoachUserId'] ??
    undefined;

  let subscription = await prisma.subscription.findFirst({
    where: {
      OR: [
        { stripeSubscriptionId: stripeSubscription.id },
        { stripeCustomerId: customerId },
        ...(metadataUserId ? [{ userId: metadataUserId }] : []),
      ],
    },
  });

  if (!subscription && metadataUserId) {
    subscription = await prisma.subscription.upsert({
      where: { userId: metadataUserId },
      create: { userId: metadataUserId, plan: 'free', status: 'inactive' },
      update: {},
    });
  }

  if (!subscription) {
    throw new Error(`No local subscription for Stripe customer ${customerId}`);
  }

  const priceId = stripeSubscription.items.data[0]?.price.id ?? null;
  const proPrice = process.env.STRIPE_PRICE_PRO_MONTHLY;
  const isPro =
    Boolean(proPrice && priceId === proPrice) ||
    mapStripeStatus(stripeSubscription.status) === 'active' ||
    mapStripeStatus(stripeSubscription.status) === 'trialing';

  const status = mapStripeStatus(stripeSubscription.status);
  const plan = status === 'active' || status === 'trialing' ? 'pro' : isPro ? 'pro' : 'free';

  return prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: stripeSubscription.id,
      stripePriceId: priceId,
      status,
      plan: status === 'canceled' || status === 'inactive' ? 'free' : plan === 'pro' ? 'pro' : 'free',
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      trialEndsAt: stripeSubscription.trial_end
        ? new Date(stripeSubscription.trial_end * 1000)
        : null,
      isComplimentary: false,
    },
  });
}

export async function handleStripeWebhook(rawBody: string, signature: string) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }

  const stripe = getStripe();
  const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === 'subscription' && session.subscription) {
        const subId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription.id;
        const stripeSub = await stripe.subscriptions.retrieve(subId);
        await syncSubscriptionFromStripe(
          stripeSub,
          session.client_reference_id ?? session.metadata?.['ergcoachUserId'],
        );
      }
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const stripeSub = event.data.object as Stripe.Subscription;
      await syncSubscriptionFromStripe(stripeSub, stripeSub.metadata?.['ergcoachUserId']);
      break;
    }
    case 'invoice.paid':
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.subscription) {
        const subId =
          typeof invoice.subscription === 'string'
            ? invoice.subscription
            : invoice.subscription.id;
        const stripeSub = await stripe.subscriptions.retrieve(subId);
        await syncSubscriptionFromStripe(stripeSub);
      }
      break;
    }
    default:
      break;
  }

  return { received: true, type: event.type };
}
