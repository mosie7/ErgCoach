import { defineAuth } from '@aws-amplify/backend';
import { postConfirmation } from './post-confirmation/resource';

/**
 * Amazon Cognito email/password auth for ErgCoach.
 * Post-confirmation provisions User + AthleteProfile + Free Subscription in DynamoDB.
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  userAttributes: {
    preferredUsername: {
      mutable: true,
      required: false,
    },
    fullname: {
      mutable: true,
      required: false,
    },
  },
  triggers: {
    postConfirmation,
  },
});
