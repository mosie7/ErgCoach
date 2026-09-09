import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface AmplifyModelClient {
  get(args: { id: string }): Promise<{ data?: Record<string, unknown> | null; errors?: { message: string }[] }>;
  list(args: {
    filter?: Record<string, unknown>;
    nextToken?: string;
  }): Promise<{ data?: Record<string, unknown>[]; nextToken?: string | null; errors?: { message: string }[] }>;
  create(args: Record<string, unknown>): Promise<{ data?: Record<string, unknown>; errors?: { message: string }[] }>;
  update(args: Record<string, unknown>): Promise<{ data?: Record<string, unknown>; errors?: { message: string }[] }>;
  delete(args: { id: string }): Promise<unknown>;
}

export interface DataClient {
  models: Record<string, AmplifyModelClient>;
}

let configured = false;
let clientSingleton: DataClient | null = null;
let injectedClient: DataClient | null = null;

const PLACEHOLDER_MARKERS = ['placeholder', 'REPLACE_ME', 'example.com'];

function isPlaceholderConfig(outputs: unknown): boolean {
  if (!outputs || typeof outputs !== 'object') return true;
  const json = JSON.stringify(outputs);
  return PLACEHOLDER_MARKERS.some((m) => json.includes(m));
}

function tryReadJson(path: string): unknown | null {
  try {
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, 'utf8')) as unknown;
  } catch {
    return null;
  }
}

/** Resolve amplify_outputs.json from common monorepo / CI locations. */
export function loadAmplifyOutputs(): unknown | null {
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(process.cwd(), 'amplify_outputs.json'),
    resolve(process.cwd(), '../../amplify_outputs.json'),
    resolve(process.cwd(), '../../../amplify_outputs.json'),
    resolve(moduleDir, '../../../amplify_outputs.json'),
    resolve(moduleDir, '../../../../amplify_outputs.json'),
  ];

  for (const path of candidates) {
    const data = tryReadJson(path);
    if (data) return data;
  }
  return null;
}

export function configureAmplify(outputs?: unknown): void {
  if (configured) return;
  const config = outputs ?? loadAmplifyOutputs();
  if (!config || isPlaceholderConfig(config)) {
    configured = true;
    return;
  }
  Amplify.configure(config);
  configured = true;
}

/**
 * Inject a Next.js cookie-based Amplify Data client (or IAM client for webhooks).
 * Prefer this over the default `generateClient()` on the server.
 */
export function setDataClient(client: DataClient): void {
  injectedClient = client;
}

export function getDataClient(): DataClient {
  if (injectedClient) return injectedClient;
  if (!clientSingleton) {
    configureAmplify();
    clientSingleton = generateClient() as unknown as DataClient;
  }
  return clientSingleton;
}
