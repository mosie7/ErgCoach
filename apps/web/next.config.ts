import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  // Amplify Hosting SSR packages `.next` itself — avoid Docker standalone.
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
  // Keep tracing scoped; exclude heavy toolchain paths that OOMed Amplify builds.
  outputFileTracingRoot: path.join(__dirname, '../..'),
  outputFileTracingExcludes: {
    '*': [
      'node_modules/@swc/**',
      'node_modules/@esbuild/**',
      'node_modules/webpack/**',
      'node_modules/typescript/**',
      'node_modules/@aws-amplify/backend*/**',
      'node_modules/aws-cdk-lib/**',
      'node_modules/@aws-cdk/**',
      '**/node_modules/.pnpm/aws-cdk-lib@*/**',
      '**/node_modules/.pnpm/@aws-amplify+backend*/**',
      '**/node_modules/.pnpm/esbuild@*/**',
      'infra/**',
      'amplify/**',
      'apps/mcp-server/**',
    ],
  },
};

export default nextConfig;
