'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signUp, confirmSignUp, autoSignIn, signIn } from 'aws-amplify/auth';
import '@/lib/amplify-client';

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function provisionAndGo(path: string) {
    const sessionRes = await fetch('/api/auth/session', { method: 'POST' });
    if (!sessionRes.ok) {
      const body = (await sessionRes.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error || 'Account created, but profile setup failed. Try signing in.');
    }
    router.push(path);
    router.refresh();
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const displayName = String(form.get('displayName') ?? '').trim();
    const nextEmail = String(form.get('email') ?? '').toLowerCase();
    const nextPassword = String(form.get('password') ?? '');

    try {
      const result = await signUp({
        username: nextEmail,
        password: nextPassword,
        options: {
          userAttributes: {
            email: nextEmail,
            name: displayName,
          },
          autoSignIn: true,
        },
      });

      setEmail(nextEmail);
      setPassword(nextPassword);

      if (result.nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
        setNeedsConfirm(true);
        setPending(false);
        return;
      }

      await provisionAndGo('/onboarding');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create account');
      setPending(false);
    }
  }

  async function onConfirm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const code = String(form.get('code') ?? '').trim();
    try {
      await confirmSignUp({ username: email, confirmationCode: code });
      try {
        await autoSignIn();
      } catch {
        await signIn({ username: email, password });
      }
      await provisionAndGo('/onboarding');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Confirmation failed');
      setPending(false);
    }
  }

  if (needsConfirm) {
    return (
      <div className="mx-auto max-w-md space-y-6">
        <div className="text-center">
          <h1 className="page-title text-[32px]">Confirm your email</h1>
          <p className="mt-2 text-[15px] text-apple-gray-500">
            Enter the code Cognito sent to <strong>{email}</strong>.
          </p>
        </div>
        <form onSubmit={onConfirm} className="panel space-y-4 p-6">
          <label className="block text-[13px]">
            <span className="text-apple-gray-500">Confirmation code</span>
            <input className="input mt-1.5" name="code" required autoComplete="one-time-code" />
          </label>
          {error ? <p className="text-[13px] text-red-600">{error}</p> : null}
          <button className="btn-primary w-full" disabled={pending} type="submit">
            {pending ? 'Confirming…' : 'Confirm and continue'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="text-center">
        <h1 className="page-title text-[32px]">Create your account</h1>
        <p className="mt-2 text-[15px] text-apple-gray-500">
          Connect Concept2, track training, and unlock AI coaching.
        </p>
      </div>
      <form onSubmit={onSubmit} className="panel space-y-4 p-6">
        <label className="block text-[13px]">
          <span className="text-apple-gray-500">Name</span>
          <input className="input mt-1.5" name="displayName" required placeholder="Alex" />
        </label>
        <label className="block text-[13px]">
          <span className="text-apple-gray-500">Email</span>
          <input className="input mt-1.5" name="email" type="email" required />
        </label>
        <label className="block text-[13px]">
          <span className="text-apple-gray-500">Password</span>
          <input
            className="input mt-1.5"
            name="password"
            type="password"
            minLength={8}
            required
            placeholder="At least 8 characters"
          />
        </label>
        {error ? <p className="text-[13px] text-red-600">{error}</p> : null}
        <button className="btn-primary w-full" disabled={pending} type="submit">
          {pending ? 'Creating…' : 'Continue'}
        </button>
      </form>
      <p className="text-center text-[13px] text-apple-gray-500">
        Already have an account?{' '}
        <Link href="/login" className="text-apple-blue hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
