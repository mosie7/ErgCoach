/**
 * Stub for Amplify-generated env types used by Lambda handlers.
 * Real values are injected at deploy/sandbox time under .amplify/generated.
 */
export const env = {
  AWS_ACCESS_KEY_ID: '',
  AWS_SECRET_ACCESS_KEY: '',
  AWS_SESSION_TOKEN: '',
  AWS_REGION: 'us-east-1',
  AMPLIFY_DATA_DEFAULT_NAME: 'data',
  AMPLIFY_DATA_GRAPHQL_ENDPOINT: '',
  AMPLIFY_DATA_MODEL_INTROSPECTION: '',
  ...process.env,
} as typeof process.env & {
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_SESSION_TOKEN: string;
  AWS_REGION: string;
  AMPLIFY_DATA_DEFAULT_NAME: string;
};
