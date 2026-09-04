/* eslint-disable no-console */
// Give every project + unit real, category-appropriate imagery, and make sure
// there are at least 4 "newly launched" (UPCOMING) projects on the site.
//
//   npm run backfill:media            (safe to re-run; refreshes all media)
//
const { PrismaClient } = require('@prisma/client');
const slugify = require('slugify');

const prisma = new PrismaClient();
const U = (id, w = 1200) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

// All verified-reachable Unsplash photo ids, grouped by what they show.
const POOL = {
  exterior: [
    '1560518883-ce09059eeffa', '1512917774080-9991f1c4c750', '1580587771525-78b9dba3b914',
    '1512699355324-f07e3106dae5', '1449844908441-8829872d2607', '1493809842364-78817add7ffb',
    '1600047509807-ba8f99d2cdde', '1580216643062-cf460548a66a', '1583608205776-bfd35f0d9f83',
    '1600573472592-401b489a3cdc', '1600585154340-be6161a56a0c',
  ],
  interior: [
    '1560448204-e02f11c3d0e2', '1560185007-c5ca9d2c014d', '1502672260266-1c1ef2d93688',
    '1512918728675-ed5a9ecdebfd', '1554995207-c18c203602cb', '1484154218962-a197022b5858',
    '1502005229762-cf1b2da7c5d6', '1600607687939-ce8a6c25118c', '1600566753086-00f18fb6b3ea',
    '1600566752355-35792bedcfea', '1600585154526-990dced4db0d', '1567496898669-ee935f5f647a',
    '1502673530728-f79b4cab31b1', '1522708323590-d24dbb6b0267', '1615529182904-14819c35db37',
    '1600210492486-724fe5c67fb0', '1570129477492-45c003edd2be',
  ],
  plot: ['1500382017468-9049fed747ef', '1449844908441-8829872d2607', '1493809842364-78817add7ffb'],
  commercial: ['1497366216548-37526070297c', '1522708323590-d24dbb6b0267', '1486406146926-c627a92ad1ab'],
};

const hash = (s) => [...String(s || '')].reduce((a, c) => (a * 33 + c.charCodeAt(0)) >>> 0, 7);
// deterministic, non-repeating pick of `n` ids from a pool for a given seed
function pick(pool, seed, n) {
  const start = hash(seed) % pool.length;
  return Array.from({ length: n }, (_, i) => pool[(start + i) % pool.length]);
}

function projectImages(p) {
  if (p.type === 'PLOT') return [...pick(POOL.plot, p.id, 2), ...pick(POOL.exterior, p.id + 'x', 2)];
  if (p.type === 'COMMERCIAL') return [...pick(POOL.commercial, p.id, 2), ...pick(POOL.interior, p.id + 'i', 2)];
  return [...pick(POOL.exterior, p.id, 2), ...pick(POOL.interior, p.id + 'i', 2)];
}
function unitImages(u, project) {
  if (project.type === 'PLOT' || /plot|land/i.test(u.unitType)) return pick(POOL.plot, u.id, 2);
  if (project.type === 'COMMERCIAL' || /shop|office|retail|showroom/i.test(u.unitType)) return pick(POOL.commercial, u.id, 2);
  return pick(POOL.interior, u.id, 3);
}

async function ensureNewLaunches() {
  const upcoming = await prisma.project.count({ where: { isPublished: true, status: 'UPCOMING' } });
  if (upcoming >= 4) return console.log(`✔ ${upcoming} newly-launched projects already`);

  const cities = await prisma.city.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
  const devs = await prisma.developer.findMany();
  const amenities = await prisma.amenity.findMany({ take: 8 });
  const seeds = [
    { name: 'Aurora Skypark', city: 'Bengaluru', area: 'Whitefield', beds: [2, 3], min: 8200000, max: 15400000, months: 54 },
    { name: 'Riverdale Terraces', city: 'Pune', area: 'Mundhwa', beds: [2, 3], min: 6900000, max: 12800000, months: 42 },
    { name: 'The Monarch Residences', city: 'Hyderabad', area: 'Kokapet', beds: [3, 4], min: 14500000, max: 27000000, months: 60 },
    { name: 'Elevate One', city: 'Gurugram', area: 'Dwarka Expressway', beds: [2, 3, 4], min: 11000000, max: 24000000, months: 48 },
    { name: 'Lumina Greens', city: 'Chennai', area: 'Perungudi', beds: [2, 3], min: 7200000, max: 13600000, months: 45 },
  ];
  const need = 4 - upcoming;
  for (let i = 0; i < need && i < seeds.length; i++) {
    const s = seeds[i];
    const city = cities.find((c) => c.name === s.city) || cities[i % cities.length];
    const dev = devs[i % Math.max(devs.length, 1)];
    const base = slugify(s.name, { lower: true, strict: true });
    let slug = base;
    for (let k = 2; await prisma.project.findUnique({ where: { slug } }); k++) slug = `${base}-${k}`;
    const possession = new Date();
    possession.setMonth(possession.getMonth() + s.months);

    const project = await prisma.project.create({
      data: {
        name: s.name, slug,
        description: `${s.name} is a newly launched ${s.beds.join(', ')} BHK residential project by ${dev?.name || 'a leading developer'} in ${s.area}, ${city?.name}. Pre-launch pricing available for early buyers.`,
        builder: dev?.name || null, developerId: dev?.id || null,
        reraNo: `RERA-${(city?.state || 'IN').slice(0, 2).toUpperCase()}-2026-${10000 + Math.floor(Math.random() * 89999)}`,
        type: 'RESIDENTIAL', status: 'UPCOMING', possessionDate: possession,
        priceMin: s.min, priceMax: s.max,
        lat: city?.lat || null, lng: city?.lng || null,
        address: s.area, city: city?.name || s.city, state: city?.state || null,
        coverImageUrl: U(pick(POOL.exterior, slug, 1)[0]),
        isPublished: true, isFeatured: i === 0, isTrending: i === 1,
        commissionBaseType: 'PERCENT', commissionBaseValue: 1.5,
        amenities: { create: amenities.slice(0, 6).map((a) => ({ amenityId: a.id })) },
        properties: {
          create: s.beds.map((b, j) => ({
            unitType: `${b}BHK`,
            carpetArea: 620 + b * 300 + j * 40,
            builtUpArea: Math.round((620 + b * 300 + j * 40) * 1.25),
            price: s.min + Math.round(((s.max - s.min) / Math.max(s.beds.length - 1, 1)) * j),
            floor: `${3 + j * 4}`, facing: ['East', 'North-East', 'West'][j % 3],
            bedrooms: b, bathrooms: b, status: 'AVAILABLE', isFeatured: j === 0,
          })),
        },
      },
    });
    console.log(`＋ created newly-launched project: ${project.name} (${city?.name})`);
  }
}

async function refreshMedia() {
  const projects = await prisma.project.findMany({
    include: { properties: { select: { id: true, unitType: true } } },
  });
  let pm = 0;
  let um = 0;
  for (const p of projects) {
    const imgs = projectImages(p);
    await prisma.$transaction([
      prisma.media.deleteMany({ where: { projectId: p.id, propertyId: null, kind: 'IMAGE' } }),
      prisma.media.createMany({
        data: imgs.map((id, i) => ({
          projectId: p.id, kind: 'IMAGE', url: U(id, 1400), sortOrder: i, title: `${p.name} ${i + 1}`,
        })),
      }),
      prisma.project.update({ where: { id: p.id }, data: { coverImageUrl: U(imgs[0], 1400) } }),
    ]);
    pm += imgs.length;

    for (const u of p.properties) {
      const uImgs = unitImages(u, p);
      await prisma.$transaction([
        prisma.media.deleteMany({ where: { propertyId: u.id, kind: 'IMAGE' } }),
        prisma.media.createMany({
          data: uImgs.map((id, i) => ({
            propertyId: u.id, kind: 'IMAGE', url: U(id, 1000), sortOrder: i, title: `${u.unitType} ${i + 1}`,
          })),
        }),
      ]);
      um += uImgs.length;
    }
  }
  console.log(`✔ refreshed media: ${projects.length} projects (${pm} images), units (${um} images)`);
}

(async () => {
  await ensureNewLaunches();
  await refreshMedia();
  await prisma.$disconnect();
})().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
