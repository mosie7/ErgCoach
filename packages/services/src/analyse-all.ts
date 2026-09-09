/**
 * Analyse all workouts for the seeded athlete.
 * Run: pnpm --filter @ergcoach/services exec tsx src/analyse-all.ts
 */
import { prisma } from '@ergcoach/database';
import { runPostWorkoutAnalysis } from './analysis.js';

async function main() {
  const workouts = await prisma.workout.findMany({
    where: { sport: { in: ['rower', 'strength'] } },
    orderBy: { startedAt: 'asc' },
    select: { id: true, title: true },
  });
  console.log(`Analysing ${workouts.length} workouts...`);
  for (const w of workouts) {
    process.stdout.write(`  ${w.title ?? w.id}... `);
    await runPostWorkoutAnalysis(w.id);
    console.log('ok');
  }
  console.log('Done.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
