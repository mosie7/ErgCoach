'use client';

import { Amplify } from 'aws-amplify';
import outputs from '../../amplify_outputs.json';

let configured = false;

export function configureAmplifyClient() {
  if (configured) return;
  Amplify.configure(outputs, { ssr: true });
  configured = true;
}

configureAmplifyClient();

export function AmplifyProvider({ children }: { children: React.ReactNode }) {
  configureAmplifyClient();
  return <>{children}</>;
}
