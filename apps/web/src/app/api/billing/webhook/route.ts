import { NextResponse } from 'next/server';
import { handleStripeWebhook } from '@ergcoach/billing';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  try {
    const rawBody = await req.text();
    const result = await handleStripeWebhook(rawBody, signature);
    return NextResponse.json(result);
  } catch (e) {
    console.error('Stripe webhook error', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Webhook failed' },
      { status: 400 },
    );
  }
}
