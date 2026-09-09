import { createServerRunner } from '@aws-amplify/adapter-nextjs';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth/server';
import { cookies } from 'next/headers';
import outputs from '../../../../amplify_outputs.json';

export const { runWithAmplifyServerContext } = createServerRunner({
  config: outputs,
});

export async function getAmplifyServerUser() {
  try {
    return await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: async (contextSpec) => {
        const user = await getCurrentUser(contextSpec);
        const session = await fetchAuthSession(contextSpec);
        const payload = session.tokens?.idToken?.payload;
        return {
          userId: user.userId,
          username: user.username,
          email: payload?.email ? String(payload.email) : user.username,
          displayName: payload?.name ? String(payload.name) : undefined,
          sub: payload?.sub ? String(payload.sub) : user.userId,
        };
      },
    });
  } catch {
    return null;
  }
}
