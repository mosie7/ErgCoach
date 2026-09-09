import type { PostConfirmationTriggerHandler } from 'aws-lambda';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from '$amplify/env/post-confirmation';
import type { Schema } from '../../data/resource';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);

Amplify.configure(resourceConfig, libraryOptions);

const client = generateClient<Schema>();

export const handler: PostConfirmationTriggerHandler = async (event) => {
  const sub = event.request.userAttributes.sub;
  const email = (event.request.userAttributes.email ?? '').toLowerCase();
  const displayName =
    event.request.userAttributes.name?.trim() ||
    event.request.userAttributes.preferred_username?.trim() ||
    email.split('@')[0] ||
    'Athlete';

  if (!sub || !email) {
    return event;
  }

  const existing = await client.models.User.get({ id: sub });
  if (existing.data) {
    return event;
  }

  await client.models.User.create({
    id: sub,
    email,
    displayName,
    authProvider: 'cognito',
    externalAuthId: sub,
  });

  await client.models.AthleteProfile.create({
    userId: sub,
    preferredUnits: 'metric',
    hrZoneMethod: 'lthr',
    isSyntheticSeed: false,
    owner: sub,
  });

  await client.models.Subscription.create({
    userId: sub,
    plan: 'free',
    status: 'inactive',
    cancelAtPeriodEnd: false,
    isComplimentary: false,
    owner: sub,
  });

  return event;
};
