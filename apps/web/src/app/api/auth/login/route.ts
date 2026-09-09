import { NextResponse } from 'next/server';

/** Client-side Amplify Auth handles Cognito sign-in; this route is retired. */
export async function POST() {
  return NextResponse.json(
    { error: 'Use Cognito sign-in via the login page (Amplify Auth).' },
    { status: 410 },
  );
}
