'use client';

import { useRouter } from 'next/navigation';
import { signOut } from 'aws-amplify/auth';
import '@/lib/amplify-client';

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn-ghost text-[13px]"
      onClick={async () => {
        try {
          await signOut();
        } catch {
          // ignore
        }
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
