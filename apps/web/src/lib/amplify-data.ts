import { generateServerClientUsingCookies } from '@aws-amplify/adapter-nextjs/data';
import { cookies } from 'next/headers';
import { setDataClient, type DataClient } from '@ergcoach/database';
import outputs from '../../amplify_outputs.json';

/**
 * Cookie-authenticated Amplify Data client for RSC / route handlers.
 * Must be imported from server entrypoints so DynamoDB calls use the Cognito session.
 */
export const serverDataClient = generateServerClientUsingCookies({
  config: outputs,
  cookies,
}) as unknown as DataClient;

setDataClient(serverDataClient);
