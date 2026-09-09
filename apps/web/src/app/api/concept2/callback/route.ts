import { NextResponse } from 'next/server';
import { completeConcept2OAuth } from '@ergcoach/services';
import { getSessionUser, getDemoAthleteId } from '@/lib/session';
import { cookies } from 'next/headers';
import { prisma } from '@ergcoach/database';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieStore = await cookies();
  const expected = cookieStore.get('concept2_oauth_state')?.value;

  // In mock mode, allow missing/mismatched state for local DX
  const useMock = process.env.CONCEPT2_USE_MOCK !== 'false';
  if (!useMock && (!state || !expected || state !== expected)) {
    return NextResponse.json({ error: 'Invalid OAuth state' }, { status: 400 });
  }

  let user = await getSessionUser();
  if (!user) {
    const athleteId = await getDemoAthleteId();
    if (athleteId) {
      const athlete = await prisma.athleteProfile.findUnique({ where: { id: athleteId } });
      if (athlete) {
        user = await prisma.user.findUnique({ where: { id: athlete.userId } });
      }
    }
  }
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  await completeConcept2OAuth(user.id, code ?? 'mock-code');
  return NextResponse.redirect(new URL('/settings?concept2=connected', req.url));
}
