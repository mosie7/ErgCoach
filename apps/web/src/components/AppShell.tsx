import Link from 'next/link';
import { getSessionAthlete } from '@/lib/session';
import { LogoutButton } from '@/components/LogoutButton';

const nav = [
  { href: '/', label: 'Dashboard' },
  { href: '/programs', label: 'Programs' },
  { href: '/workouts', label: 'Workouts' },
  { href: '/workouts/new', label: 'Log' },
  { href: '/coach', label: 'Coach' },
  { href: '/review', label: 'Review' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/settings', label: 'Settings' },
];

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getSessionAthlete();

  return (
    <div className="min-h-screen bg-white text-apple-gray-700 dark:bg-black dark:text-apple-gray-50">
      <header className="sticky top-0 z-40 border-b border-apple-gray-200/80 bg-white/80 backdrop-blur-xl dark:border-apple-gray-600 dark:bg-black/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <Link href="/" className="font-display text-[21px] font-semibold tracking-[-0.03em]">
            ErgCoach
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-3 py-1.5 text-[13px] text-apple-gray-500 transition hover:bg-apple-gray-100 hover:text-apple-gray-700 dark:text-apple-gray-400 dark:hover:bg-apple-gray-800 dark:hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {session ? (
              <>
                <span className="hidden max-w-[140px] truncate text-[13px] text-apple-gray-500 sm:inline">
                  {session.user.displayName}
                </span>
                <LogoutButton />
              </>
            ) : (
              <>
                <Link href="/login" className="btn-ghost text-[13px]">
                  Sign in
                </Link>
                <Link href="/signup" className="btn-primary text-[13px]">
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-apple-gray-100 px-3 py-2 md:hidden dark:border-apple-gray-800">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-full px-3 py-1 text-[12px] text-apple-gray-500 hover:bg-apple-gray-100 dark:hover:bg-apple-gray-800"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8 sm:py-10">{children}</main>
      <footer className="mx-auto max-w-6xl px-5 pb-12 text-[12px] text-apple-gray-400">
        Training analytics — not medical advice.
      </footer>
    </div>
  );
}
