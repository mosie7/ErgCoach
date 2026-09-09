import { NextResponse } from 'next/server';
import { handleConcept2Webhook } from '@ergcoach/services';

export async function POST(req: Request) {
  const payload = await req.json().catch(() => ({}));
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => {
    headers[k] = v;
  });
  const result = await handleConcept2Webhook(payload, headers);
  return NextResponse.json(result);
}
