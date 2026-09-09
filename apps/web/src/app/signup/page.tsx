'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: form.get('displayName'),
        email: form.get('email'),
        password: form.get('password'),
      }),
    });
    setPending(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Could not create account');
      return;
    }
    router.push('/onboarding');
    router.refresh();
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
