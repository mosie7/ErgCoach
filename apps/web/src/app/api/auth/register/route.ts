import { NextResponse } from 'next/server';

/** Client-side Amplify Auth handles Cognito sign-up; this route is retired. */
export async function POST() {
  return NextResponse.json(
    { error: 'Use Cognito sign-up via the signup page (Amplify Auth).' },
    { status: 410 },
  );
}
