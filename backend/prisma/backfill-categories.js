/* eslint-disable no-console */
// Seed the editable unit Category → Sub-category taxonomy and tag existing units.
//   npm run backfill:categories
const { PrismaClient } = require('@prisma/client');
const slugify = require('slugify');

const prisma = new PrismaClient();

const TREE = [
  { name: 'Residential', icon: '🏢', children: ['Apartment', 'Villa', 'Penthouse', 'Builder Floor', 'Studio', 'Duplex'] },
  { name: 'Plot / Land', icon: '🗺️', children: ['Residential Plot', 'Commercial Plot'] },
  { name: 'Commercial', icon: '🏬', children: ['Shop / Retail', 'Office Space', 'Co-working', 'Showroom'] },
];

// unitType text → sub-category name
function classify(unitType = '') {
  const t = unitType.toLowerCase();
  if (/villa/.test(t)) return 'Villa';
  if (/penthouse/.test(t)) return 'Penthouse';
  if (/duplex/.test(t)) return 'Duplex';
  if (/studio/.test(t)) return 'Studio';
  if (/builder\s*floor/.test(t)) return 'Builder Floor';
  if (/plot|land/.test(t)) return 'Residential Plot';
  if (/shop|retail/.test(t)) return 'Shop / Retail';
  if (/showroom/.test(t)) return 'Showroom';
  if (/office|suite|floor/.test(t)) return 'Office Space';
  if (/co-?work/.test(t)) return 'Co-working';
  if (/bhk|bedroom|apartment|flat/.test(t)) return 'Apartment';
  return 'Apartment';
}

(async () => {
  const bySlug = {};
  let order = 0;
  for (const parent of TREE) {
    const pSlug = slugify(parent.name, { lower: true, strict: true });
    const p = await prisma.unitCategory.upsert({
      where: { slug: pSlug },
      update: { icon: parent.icon },
      create: { name: parent.name, slug: pSlug, icon: parent.icon, sortOrder: order++ },
    });
    bySlug[pSlug] = p;
    for (const childName of parent.children) {
      const cSlug = slugify(childName, { lower: true, strict: true });
      const c = await prisma.unitCategory.upsert({
        where: { slug: cSlug },
        update: { parentId: p.id },
        create: { name: childName, slug: cSlug, parentId: p.id, sortOrder: order++ },
      });
      bySlug[cSlug] = c;
    }
  }
  console.log(`✔ taxonomy: ${Object.keys(bySlug).length} nodes`);

  const units = await prisma.property.findMany({ select: { id: true, unitType: true, categoryId: true } });
  let tagged = 0;
  for (const u of units) {
    if (u.categoryId) continue;
    const sub = bySlug[slugify(classify(u.unitType), { lower: true, strict: true })];
    if (sub) {
      await prisma.property.update({ where: { id: u.id }, data: { categoryId: sub.id } });
      tagged++;
    }
  }
  console.log(`✔ tagged ${tagged}/${units.length} units with a sub-category`);
  await prisma.$disconnect();
})().catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
