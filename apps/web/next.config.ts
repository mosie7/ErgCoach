import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: [
    '@ergcoach/shared',
    '@ergcoach/database',
    '@ergcoach/training-engine',
    '@ergcoach/concept2',
    '@ergcoach/ai-coach',
    '@ergcoach/services',
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  outputFileTracingRoot: path.join(__dirname, '../..'),
};

export default nextConfig;
