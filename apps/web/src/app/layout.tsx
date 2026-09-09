import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/components/AppShell';
import { AmplifyProvider } from '@/lib/amplify-client';

export const metadata: Metadata = {
  title: 'ErgCoach',
  description: 'Concept2 coaching powered by your training data and AI.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AmplifyProvider>
          <AppShell>{children}</AppShell>
        </AmplifyProvider>
      </body>
    </html>
  );
}
