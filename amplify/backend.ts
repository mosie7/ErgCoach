import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { postConfirmation } from './functions/post-confirmation/resource';

/**
 * Amplify Gen 2 backend: Cognito auth + AppSync/DynamoDB data.
 * Deploy via `npx ampx sandbox` (dev) or Amplify Hosting CI.
 */
defineBackend({
  auth,
  data,
  postConfirmation,
});
