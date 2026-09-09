import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { setDataClient, type DataClient } from '@ergcoach/database';
import outputs from '../../../../amplify_outputs.json';

/**
 * IAM-authenticated Data client for unauthenticated server paths
 * (Stripe / Concept2 webhooks, health checks).
 */
export function useIamDataClient() {
  Amplify.configure(outputs, { ssr: true });
  const client = generateClient({ authMode: 'iam' }) as unknown as DataClient;
  setDataClient(client);
  return client;
}
