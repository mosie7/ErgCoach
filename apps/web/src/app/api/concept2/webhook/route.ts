import { NextResponse } from 'next/server';
import { handleConcept2Webhook } from '@ergcoach/services';
import { useIamDataClient } from '@/lib/amplify-data-iam';

export async function POST(req: Request) {
  try {
    useIamDataClient();
    const payload = await req.json().catch(() => ({}));
    const headers: Record<string, string> = {};
    req.headers.forEach((v, k) => {
      headers[k] = v;
    });
    const result = await handleConcept2Webhook(payload, headers);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Webhook processing failed' },
      { status: 500 },
    );
  }
}
