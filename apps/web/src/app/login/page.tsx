'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.get('email'),
        password: form.get('password'),
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Login failed');
      return;
    }
    router.push('/');
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div>
        <p className="label">Authentication</p>
        <h1 className="font-display text-3xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-ink-400">
          Local auth for development. Swap for Cognito/Auth0/Clerk via AuthProvider.
        </p>
      </div>
      <form onSubmit={onSubmit} className="panel space-y-3 p-5">
        <label className="block text-sm">
          <span className="text-ink-300">Email</span>
          <input
            className="input mt-1"
            name="email"
            type="email"
            defaultValue="athlete@ergcoach.local"
            required
          />
        </label>
        <label className="block text-sm">
          <span className="text-ink-300">Password</span>
          <input
            className="input mt-1"
            name="password"
            type="password"
            defaultValue="demo1234"
            required
          />
        </label>
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        <button className="btn-primary w-full" type="submit">
          Sign in
        </button>
      </form>
    </div>
  );
}
