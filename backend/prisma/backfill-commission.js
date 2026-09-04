/* One-off: give every unit a commission scheme (for testing / demo).
 * Run:  npm run backfill:commission           (skips units that already have one)
 *       npm run backfill:commission -- --force (overwrites all)
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// pool % + level split by project type
const BY_TYPE = {
  RESIDENTIAL: { poolValue: 10, levels: [40, 10, 5, 3, 2] },
  COMMERCIAL: { poolValue: 8, levels: [45, 12, 6, 4, 3] },
  PLOT: { poolValue: 12, levels: [50, 15, 8, 5, 2] },
  MIXED: { poolValue: 9, levels: [42, 11, 6, 4, 2] },
};

async function main() {
  const force = process.argv.includes('--force');
  const props = await prisma.property.findMany({ include: { project: { select: { type: true, name: true } } } });

  let n = 0;
  for (const p of props) {
    if (!force && p.commissionScheme && p.commissionScheme.enabled) continue;
    const base = BY_TYPE[p.project.type] || BY_TYPE.RESIDENTIAL;
    await prisma.property.update({
      where: { id: p.id },
      data: {
        commissionScheme: {
          enabled: true,
          poolType: 'PERCENT',
          poolValue: base.poolValue,
          levels: base.levels.map((percent, i) => ({ level: i + 1, percent })),
        },
      },
    });
    n += 1;
  }
  console.log(`✔ commission scheme applied to ${n} / ${props.length} units`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
