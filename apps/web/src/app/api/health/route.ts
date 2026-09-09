import { NextResponse } from 'next/server';
import { prisma } from '@ergcoach/database';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: 'ok',
      service: 'ergcoach-web',
      db: 'up',
      time: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json(
      {
        status: 'degraded',
        service: 'ergcoach-web',
        db: 'down',
        error: e instanceof Error ? e.message : 'db check failed',
        time: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
