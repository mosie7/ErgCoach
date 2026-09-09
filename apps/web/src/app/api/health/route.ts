import { NextResponse } from 'next/server';
import { configureAmplify, getDataClient } from '@ergcoach/database';
import { useIamDataClient } from '@/lib/amplify-data-iam';

export async function GET() {
  try {
    useIamDataClient();
    configureAmplify();
    const client = getDataClient();
    const userModel = client.models.User;
    if (!userModel) {
      return NextResponse.json({ ok: false, error: 'User model missing' }, { status: 503 });
    }
    await userModel.list({});
    return NextResponse.json({ ok: true, data: 'amplify' });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : 'health check failed',
      },
      { status: 503 },
    );
  }
}
