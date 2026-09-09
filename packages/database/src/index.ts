export { prisma, Prisma, type PrismaCompatClient } from './prisma-compat.js';
export {
  configureAmplify,
  getDataClient,
  setDataClient,
  loadAmplifyOutputs,
  type DataClient,
} from './client.js';
export * from './types.js';

import { prisma } from './prisma-compat.js';

/** Alias for prisma compat client */
export const db = prisma;
