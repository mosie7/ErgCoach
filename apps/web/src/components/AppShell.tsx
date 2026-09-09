import Link from 'next/link';

const nav = [
  { href: '/', label: 'Dashboard' },
  { href: '/workouts', label: 'Workouts' },
  { href: '/workouts/new', label: 'Log workout' },
  { href: '/coach', label: 'Coach chat' },
  { href: '/review', label: 'Weekly review' },
  { href: '/settings', label: 'Settings' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-ink-700/50 bg-ink-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="font-display text-xl font-semibold tracking-tight text-ink-50">
              ErgCoach
            </span>
            <span className="hidden text-xs text-ink-400 sm:inline">RowErg performance</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-1 sm:gap-2">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-2.5 py-1.5 text-sm text-ink-300 transition hover:bg-ink-800 hover:text-ink-50"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      <footer className="mx-auto max-w-7xl px-4 pb-10 text-xs text-ink-500 sm:px-6">
        Training analytics — not medical advice. Seed data is synthetic.
      </footer>
    </div>
  );
}
