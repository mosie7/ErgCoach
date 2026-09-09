'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'aws-amplify/auth';
import '@/lib/amplify-client';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      await signIn({
        username: String(form.get('email') ?? '').toLowerCase(),
        password: String(form.get('password') ?? ''),
      });
      // Ensure DynamoDB User/Athlete rows exist (post-confirm + race safety)
      await fetch('/api/auth/session', { method: 'POST' });
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setPending(false);
      return;
    }
    setPending(false);
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="text-center">
        <h1 className="page-title text-[32px]">Sign in</h1>
        <p className="mt-2 text-[15px] text-apple-gray-500">Welcome back to ErgCoach.</p>
      </div>
      <form onSubmit={onSubmit} className="panel space-y-4 p-6">
        <label className="block text-[13px]">
          <span className="text-apple-gray-500">Email</span>
          <input className="input mt-1.5" name="email" type="email" required autoComplete="email" />
        </label>
        <label className="block text-[13px]">
          <span className="text-apple-gray-500">Password</span>
          <input
            className="input mt-1.5"
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
        </label>
        {error ? <p className="text-[13px] text-red-600">{error}</p> : null}
        <button className="btn-primary w-full" disabled={pending} type="submit">
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="text-center text-[13px] text-apple-gray-500">
        New here?{' '}
        <Link href="/signup" className="text-apple-blue hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
