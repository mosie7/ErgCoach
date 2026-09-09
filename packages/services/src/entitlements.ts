import { prisma } from '@ergcoach/database';
import {
  EntitlementError,
  getAccessSnapshot,
  hasEntitlement,
  requireEntitlement,
} from '@ergcoach/billing';

export async function getUserIdForAthlete(athleteId: string): Promise<string> {
  const athlete = await prisma.athleteProfile.findUnique({
    where: { id: athleteId },
    select: { userId: true },
  });
  if (!athlete) {
    throw new Error(`AthleteProfile not found for entitlement check: ${athleteId}`);
  }
  return athlete.userId;
}

export async function athleteHasEntitlement(
  athleteId: string,
  entitlement: Parameters<typeof hasEntitlement>[1],
) {
  const userId = await getUserIdForAthlete(athleteId);
  return hasEntitlement(userId, entitlement);
}

export async function requireAthleteEntitlement(
  athleteId: string,
  entitlement: Parameters<typeof requireEntitlement>[1],
) {
  const userId = await getUserIdForAthlete(athleteId);
  await requireEntitlement(userId, entitlement);
}

export async function getAthleteAccessSnapshot(athleteId: string) {
  const userId = await getUserIdForAthlete(athleteId);
  return getAccessSnapshot(userId);
}

export { EntitlementError, getAccessSnapshot, hasEntitlement, requireEntitlement };
