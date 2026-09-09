import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Amplify Hosting SSR packages `.next` itself — avoid Docker standalone tracing.
  transpilePackages: [
    '@ergcoach/shared',
    '@ergcoach/database',
    '@ergcoach/training-engine',
    '@ergcoach/concept2',
    '@ergcoach/ai-coach',
    '@ergcoach/billing',
    '@ergcoach/services',
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
