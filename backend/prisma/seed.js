/* Seed: default admin, MLM level config, lead-status workflow, amenities, demo data. */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const slugify = require('slugify');
require('dotenv').config();

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@propszy.com';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';
const ADMIN_NAME = process.env.SEED_ADMIN_NAME || 'Propszy Admin';

const LEAD_STATUSES = [
  { key: 'NEW', label: 'New', color: '#8b5cf6', sortOrder: 0 },
  { key: 'CONTACTED', label: 'Contacted', color: '#6366f1', sortOrder: 1 },
  { key: 'SITE_VISIT', label: 'Site Visit', color: '#0ea5e9', sortOrder: 2 },
  { key: 'NEGOTIATION', label: 'Negotiation', color: '#f59e0b', sortOrder: 3 },
  { key: 'CONVERTED', label: 'Converted', color: '#16a34a', sortOrder: 4, isConversion: true, isTerminal: true },
  { key: 'DROPPED', label: 'Dropped', color: '#ef4444', sortOrder: 5, isTerminal: true },
];

const MLM_LEVELS = [
  { level: 1, rateType: 'PERCENT', rateValue: 5.0, label: 'Sourcing agent' },
  { level: 2, rateType: 'PERCENT', rateValue: 2.0, label: 'Sponsor' },
  { level: 3, rateType: 'PERCENT', rateValue: 1.0, label: 'Level 3 upline' },
  { level: 4, rateType: 'PERCENT', rateValue: 0.5, label: 'Level 4 upline' },
  { level: 5, rateType: 'PERCENT', rateValue: 0.25, label: 'Level 5 upline' },
];

const AMENITIES = [
  ['Swimming Pool', 'pool'], ['Gymnasium', 'dumbbell'], ['Clubhouse', 'building'],
  ["Children's Play Area", 'toy'], ['24x7 Security', 'shield'], ['Power Backup', 'zap'],
  ['Landscaped Gardens', 'tree'], ['Covered Parking', 'car'], ['Lift', 'elevator'],
  ['Rain Water Harvesting', 'droplets'], ['Jogging Track', 'run'], ['Indoor Games', 'gamepad'],
];

async function main() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { role: 'ADMIN', name: ADMIN_NAME },
    create: { email: ADMIN_EMAIL, name: ADMIN_NAME, role: 'ADMIN', passwordHash, emailVerified: true },
  });
  console.log(`✔ admin: ${admin.email}`);

  for (const s of LEAD_STATUSES) {
    await prisma.leadStatusConfig.upsert({ where: { key: s.key }, update: s, create: s });
  }
  console.log(`✔ ${LEAD_STATUSES.length} lead statuses`);

  for (const l of MLM_LEVELS) {
    await prisma.mlmLevelConfig.upsert({ where: { level: l.level }, update: l, create: l });
  }
  console.log(`✔ ${MLM_LEVELS.length} MLM levels`);

  const amenityRows = [];
  for (const [name, icon] of AMENITIES) {
    amenityRows.push(
      await prisma.amenity.upsert({ where: { name }, update: { icon }, create: { name, icon } })
    );
  }
  console.log(`✔ ${amenityRows.length} amenities`);

  await prisma.setting.upsert({
    where: { key: 'mlm' },
    update: {},
    create: { key: 'mlm', value: { maxDepth: 3, payoutOnStatus: 'CONVERTED' } },
  });

  // Demo agent + sub-agent (MLM chain) — only if none exist yet
  const agentCount = await prisma.user.count({ where: { role: 'AGENT' } });
  if (agentCount === 0) {
    const agent = await prisma.user.create({
      data: {
        name: 'Ravi Sharma', email: 'agent@propszy.com', role: 'AGENT',
        passwordHash, referralCode: 'RAVI2026', kycStatus: 'APPROVED', emailVerified: true,
      },
    });
    const subAgent = await prisma.user.create({
      data: {
        name: 'Neha Gupta', email: 'subagent@propszy.com', role: 'AGENT',
        passwordHash, referralCode: 'NEHA2026', sponsorAgentId: agent.id,
        kycStatus: 'APPROVED', emailVerified: true,
      },
    });
    console.log(`✔ demo agents: ${agent.email} → ${subAgent.email}`);
  }

  // ── Demo catalogue (only when empty) ──────────────────────
  const img = (s) => `https://picsum.photos/seed/${s}/1200/800`;

  // Real, category-appropriate photography (Unsplash CDN). `npm run backfill:media`
  // refreshes these + tops up newly-launched projects after seeding.
  const UP = (id, w = 1400) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;
  const SHOTS = {
    exterior: ['1560518883-ce09059eeffa', '1512917774080-9991f1c4c750', '1580587771525-78b9dba3b914', '1512699355324-f07e3106dae5', '1449844908441-8829872d2607', '1493809842364-78817add7ffb', '1600047509807-ba8f99d2cdde', '1580216643062-cf460548a66a', '1583608205776-bfd35f0d9f83', '1600573472592-401b489a3cdc'],
    interior: ['1560448204-e02f11c3d0e2', '1560185007-c5ca9d2c014d', '1502672260266-1c1ef2d93688', '1512918728675-ed5a9ecdebfd', '1554995207-c18c203602cb', '1484154218962-a197022b5858', '1502005229762-cf1b2da7c5d6', '1600607687939-ce8a6c25118c', '1600566753086-00f18fb6b3ea', '1600585154526-990dced4db0d', '1567496898669-ee935f5f647a', '1522708323590-d24dbb6b0267'],
    plot: ['1500382017468-9049fed747ef', '1449844908441-8829872d2607', '1493809842364-78817add7ffb'],
    commercial: ['1497366216548-37526070297c', '1522708323590-d24dbb6b0267', '1486406146926-c627a92ad1ab'],
  };
  const hsh = (s) => [...String(s)].reduce((a, c) => (a * 33 + c.charCodeAt(0)) >>> 0, 7);
  const shots = (kind, seed, n) => {
    const pool = SHOTS[kind] || SHOTS.interior;
    const start = hsh(seed) % pool.length;
    return Array.from({ length: n }, (_, i) => UP(pool[(start + i) % pool.length]));
  };
  const projShots = (p, seed) =>
    p.type === 'PLOT' ? [...shots('plot', seed, 2), ...shots('exterior', seed + 'x', 2)]
      : p.type === 'COMMERCIAL' ? [...shots('commercial', seed, 2), ...shots('interior', seed + 'i', 2)]
        : [...shots('exterior', seed, 2), ...shots('interior', seed + 'i', 2)];
  const unitShots = (p, u) =>
    p.type === 'PLOT' || /plot|land/i.test(u.unitType) ? shots('plot', p.name + u.unitType, 2)
      : p.type === 'COMMERCIAL' || /shop|office|retail|suite|floor/i.test(u.unitType) ? shots('commercial', p.name + u.unitType, 2)
        : shots('interior', p.name + u.unitType, 3);

  const PROJECTS = [
    {
      name: 'Green Valley Heights', builder: 'Skyline Developers', rera: 'RERA-KA-2026-00871',
      type: 'RESIDENTIAL', status: 'ONGOING', priceMin: 6500000, priceMax: 14200000,
      lat: 12.9716, lng: 77.5946, address: 'Sarjapur Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560035',
      flags: { isFeatured: true, isTrending: true },
      units: [
        { unitType: '2BHK', carpetArea: 1050, price: 6500000, facing: 'East', bedrooms: 2, bathrooms: 2, floor: '3', isFeatured: true },
        { unitType: '3BHK', carpetArea: 1480, price: 9800000, facing: 'North-East', bedrooms: 3, bathrooms: 3, floor: '7', isTrending: true },
        { unitType: '4BHK', carpetArea: 2100, price: 14200000, facing: 'West', bedrooms: 4, bathrooms: 4, floor: '12', status: 'ON_HOLD' },
      ],
    },
    {
      name: 'Prestige Lake Ridge', builder: 'Prestige Group', rera: 'RERA-KA-2025-04412',
      type: 'RESIDENTIAL', status: 'READY_TO_MOVE', priceMin: 11000000, priceMax: 25000000,
      lat: 12.9081, lng: 77.6476, address: 'Bellandur', city: 'Bengaluru', state: 'Karnataka', pincode: '560103',
      flags: { isFeatured: true, isBestSeller: true },
      units: [
        { unitType: '3BHK', carpetArea: 1650, price: 11000000, facing: 'North', bedrooms: 3, bathrooms: 3, floor: '9', isBestSeller: true, soldCount: 34 },
        { unitType: '3.5BHK', carpetArea: 1980, price: 16500000, facing: 'East', bedrooms: 3, bathrooms: 4, floor: '14', soldCount: 21 },
        { unitType: '4BHK Duplex', carpetArea: 2850, price: 25000000, facing: 'North-East', bedrooms: 4, bathrooms: 5, floor: '18-19', isFeatured: true },
      ],
    },
    {
      name: 'Marina Bay Residences', builder: 'Lodha', rera: 'RERA-MH-2026-11902',
      type: 'RESIDENTIAL', status: 'ONGOING', priceMin: 22000000, priceMax: 62000000,
      lat: 19.0176, lng: 72.8562, address: 'Lower Parel', city: 'Mumbai', state: 'Maharashtra', pincode: '400013',
      flags: { isFeatured: true, isTrending: true },
      units: [
        { unitType: '2BHK', carpetArea: 980, price: 22000000, facing: 'Sea', bedrooms: 2, bathrooms: 2, floor: '22', isTrending: true },
        { unitType: '3BHK', carpetArea: 1560, price: 38000000, facing: 'Sea', bedrooms: 3, bathrooms: 3, floor: '31' },
        { unitType: '4BHK Sky Villa', carpetArea: 3200, price: 62000000, facing: 'Sea', bedrooms: 4, bathrooms: 5, floor: '44', isFeatured: true },
      ],
    },
    {
      name: 'Cyber Greens Business Park', builder: 'DLF', rera: 'RERA-TG-2025-77120',
      type: 'COMMERCIAL', status: 'ONGOING', priceMin: 9000000, priceMax: 40000000,
      lat: 17.4435, lng: 78.3772, address: 'HITEC City', city: 'Hyderabad', state: 'Telangana', pincode: '500081',
      flags: { isTrending: true },
      units: [
        { unitType: 'Office Suite 600 sqft', carpetArea: 600, price: 9000000, bedrooms: null, bathrooms: 1, floor: '4', isTrending: true },
        { unitType: 'Office Floor 2400 sqft', carpetArea: 2400, price: 33000000, bedrooms: null, bathrooms: 2, floor: '8' },
        { unitType: 'Retail Unit', carpetArea: 1100, price: 18500000, bedrooms: null, bathrooms: 1, floor: 'Ground' },
      ],
    },
    {
      name: 'Emerald County Plots', builder: 'Kolte-Patil', rera: 'RERA-MH-2026-33019',
      type: 'PLOT', status: 'UPCOMING', priceMin: 3500000, priceMax: 8000000,
      lat: 18.5913, lng: 73.7389, address: 'Hinjawadi Phase 3', city: 'Pune', state: 'Maharashtra', pincode: '411057',
      flags: { isBestSeller: true },
      units: [
        { unitType: 'Plot 1200 sqft', carpetArea: 1200, price: 3500000, bedrooms: null, bathrooms: null, isBestSeller: true, soldCount: 48 },
        { unitType: 'Plot 1800 sqft', carpetArea: 1800, price: 5200000, bedrooms: null, bathrooms: null, soldCount: 30 },
        { unitType: 'Plot 2400 sqft (corner)', carpetArea: 2400, price: 8000000, bedrooms: null, bathrooms: null },
      ],
    },
    {
      name: 'Skyline Central', builder: 'M3M', rera: 'RERA-GGM-2026-90233',
      type: 'MIXED', status: 'UPCOMING', priceMin: 12000000, priceMax: 35000000,
      lat: 28.4595, lng: 77.0266, address: 'Golf Course Extn Road', city: 'Gurugram', state: 'Haryana', pincode: '122102',
      flags: { isFeatured: true },
      units: [
        { unitType: '2BHK + Study', carpetArea: 1240, price: 12000000, bedrooms: 2, bathrooms: 2, floor: '11', isFeatured: true },
        { unitType: '3BHK', carpetArea: 1820, price: 19500000, bedrooms: 3, bathrooms: 3, floor: '17', isTrending: true },
        { unitType: 'Penthouse', carpetArea: 3600, price: 35000000, bedrooms: 4, bathrooms: 5, floor: '24' },
      ],
    },
    {
      name: 'Coastal Crest Villas', builder: 'Casagrand', rera: 'RERA-TN-2025-55411',
      type: 'RESIDENTIAL', status: 'READY_TO_MOVE', priceMin: 18000000, priceMax: 32000000,
      lat: 12.8996, lng: 80.2209, address: 'OMR, Kelambakkam', city: 'Chennai', state: 'Tamil Nadu', pincode: '603103',
      flags: { isTrending: true },
      units: [
        { unitType: '3BHK Villa', carpetArea: 2100, price: 18000000, bedrooms: 3, bathrooms: 3, isTrending: true, soldCount: 12 },
        { unitType: '4BHK Villa', carpetArea: 2950, price: 26000000, bedrooms: 4, bathrooms: 4 },
        { unitType: '4BHK Villa (pool)', carpetArea: 3400, price: 32000000, bedrooms: 4, bathrooms: 5, isFeatured: true },
      ],
    },
    {
      name: 'Urban Nest Apartments', builder: 'Godrej Properties', rera: 'RERA-MH-2026-20877',
      type: 'RESIDENTIAL', status: 'ONGOING', priceMin: 4200000, priceMax: 9500000,
      lat: 18.4636, lng: 73.8682, address: 'NIBM Road, Kondhwa', city: 'Pune', state: 'Maharashtra', pincode: '411048',
      flags: { isBestSeller: true },
      units: [
        { unitType: '1BHK', carpetArea: 560, price: 4200000, bedrooms: 1, bathrooms: 1, floor: '5', isFeatured: true, soldCount: 26 },
        { unitType: '2BHK', carpetArea: 880, price: 6400000, bedrooms: 2, bathrooms: 2, floor: '8', isBestSeller: true, soldCount: 41 },
        { unitType: '3BHK', carpetArea: 1240, price: 9500000, bedrooms: 3, bathrooms: 3, floor: '11', isTrending: true },
      ],
    },
    {
      name: 'Aurora Skypark', builder: 'Prestige Group', rera: 'RERA-KA-2026-41902',
      type: 'RESIDENTIAL', status: 'UPCOMING', priceMin: 8200000, priceMax: 15400000,
      lat: 12.9698, lng: 77.7500, address: 'Whitefield', city: 'Bengaluru', state: 'Karnataka', pincode: '560066',
      flags: { isFeatured: true },
      units: [
        { unitType: '2BHK', carpetArea: 1120, price: 8200000, bedrooms: 2, bathrooms: 2, floor: '6', facing: 'East', isFeatured: true },
        { unitType: '3BHK', carpetArea: 1580, price: 12600000, bedrooms: 3, bathrooms: 3, floor: '12', facing: 'North-East' },
        { unitType: '3BHK Large', carpetArea: 1840, price: 15400000, bedrooms: 3, bathrooms: 4, floor: '18', facing: 'West' },
      ],
    },
    {
      name: 'Riverdale Terraces', builder: 'Godrej Properties', rera: 'RERA-MH-2026-52277',
      type: 'RESIDENTIAL', status: 'UPCOMING', priceMin: 6900000, priceMax: 12800000,
      lat: 18.5389, lng: 73.9256, address: 'Mundhwa', city: 'Pune', state: 'Maharashtra', pincode: '411036',
      flags: { isTrending: true },
      units: [
        { unitType: '2BHK', carpetArea: 980, price: 6900000, bedrooms: 2, bathrooms: 2, floor: '4', facing: 'East', isFeatured: true },
        { unitType: '3BHK', carpetArea: 1360, price: 10400000, bedrooms: 3, bathrooms: 3, floor: '9', facing: 'North' },
        { unitType: '3BHK Riverview', carpetArea: 1520, price: 12800000, bedrooms: 3, bathrooms: 3, floor: '14', facing: 'North-East' },
      ],
    },
  ];

  const projCount = await prisma.project.count();
  if (projCount === 0) {
    // Managed developers (one per distinct builder), linked to their projects.
    const DEV_META = {
      'Skyline Developers': [2001, 'Skyline Developers builds thoughtfully-designed residential communities focused on green spaces, natural light and long-term value for homeowners.'],
      'Prestige Group': [1986, "The Prestige Group is one of South India's leading developers, with landmark residential, commercial and retail projects across Bengaluru, Chennai and Hyderabad."],
      Lodha: [1980, "Lodha is India's largest residential developer by sales, known for landmark townships and premium high-rises in Mumbai, Pune and London."],
      DLF: [1946, "DLF is India's largest publicly listed real estate company, with seven decades developing homes, offices and retail across the country."],
      'Kolte-Patil': [1991, 'Kolte-Patil Developers is a leading Pune-based real estate brand with a growing presence in Bengaluru and Mumbai, delivering over 25 million sq ft.'],
      M3M: [2007, "M3M India is a Gurugram-based developer focused on premium and luxury projects along the city's fastest-growing corridors."],
      Casagrand: [2003, 'Casagrand is a Chennai-headquartered developer that has delivered more than 40 million sq ft of thoughtfully-crafted homes across South India.'],
      'Godrej Properties': [1990, 'Godrej Properties brings the Godrej Group philosophy of innovation and sustainability to real estate, with developments across 12 Indian cities.'],
    };
    const devByName = {};
    for (const name of [...new Set(PROJECTS.map((p) => p.builder))]) {
      const [foundedYear, description] = DEV_META[name] || [null, null];
      const dev = await prisma.developer.upsert({
        where: { name },
        update: {},
        create: { name, slug: slugify(name, { lower: true, strict: true }), isFeatured: true, foundedYear, description },
      });
      devByName[name] = dev.id;
    }

    let n = 0;
    for (const p of PROJECTS) {
      const slug = slugify(p.name, { lower: true, strict: true });
      await prisma.project.create({
        data: {
          name: p.name, slug,
          description: `${p.name} by ${p.builder} — ${p.type.toLowerCase()} ${p.status.replace(/_/g, ' ').toLowerCase()} project in ${p.address}, ${p.city}. RERA ${p.rera}.`,
          builder: p.builder, developerId: devByName[p.builder] || null,
          reraNo: p.rera, type: p.type, status: p.status,
          priceMin: p.priceMin, priceMax: p.priceMax,
          lat: p.lat, lng: p.lng, address: p.address, city: p.city, state: p.state, pincode: p.pincode,
          coverImageUrl: projShots(p, slug)[0], masterPlanUrl: img(`${slug}-master`),
          isPublished: true, ...(p.flags || {}),
          commissionBaseType: 'PERCENT', commissionBaseValue: 1.5,
          createdById: admin.id,
          metaTitle: `${p.name} — ${p.city} | Propszy`,
          metaDescription: `Explore ${p.name} by ${p.builder} in ${p.city}. Price ${p.priceMin} – ${p.priceMax}.`,
          amenities: { create: amenityRows.slice(0, 6 + (n % 5)).map((a) => ({ amenityId: a.id })) },
          media: {
            create: projShots(p, slug).map((url, i) => ({ kind: 'IMAGE', url, sortOrder: i, title: `${p.name} ${i + 1}` })),
          },
          properties: {
            create: p.units.map((u) => ({
              unitType: u.unitType, carpetArea: u.carpetArea, builtUpArea: u.carpetArea ? Math.round(u.carpetArea * 1.25) : null,
              price: u.price, floor: u.floor || null, facing: u.facing || null,
              bedrooms: u.bedrooms ?? null, bathrooms: u.bathrooms ?? null,
              status: u.status || 'AVAILABLE',
              isFeatured: !!u.isFeatured, isTrending: !!u.isTrending, isBestSeller: !!u.isBestSeller,
              soldCount: u.soldCount || 0,
              media: { create: unitShots(p, u).map((url, i) => ({ kind: 'IMAGE', url, sortOrder: i })) },
            })),
          },
        },
      });
      n++;
    }
    console.log(`✔ ${n} demo projects with units + media`);
  }

  // ── Unit taxonomy (Category → Sub-category) + tag units ────
  const CAT_TREE = [
    { name: 'Residential', icon: '🏢', children: ['Apartment', 'Villa', 'Penthouse', 'Builder Floor', 'Studio', 'Duplex'] },
    { name: 'Plot / Land', icon: '🗺️', children: ['Residential Plot', 'Commercial Plot'] },
    { name: 'Commercial', icon: '🏬', children: ['Shop / Retail', 'Office Space', 'Co-working', 'Showroom'] },
  ];
  const classify = (t = '') => {
    t = t.toLowerCase();
    if (/villa/.test(t)) return 'villa';
    if (/penthouse/.test(t)) return 'penthouse';
    if (/duplex/.test(t)) return 'duplex';
    if (/studio/.test(t)) return 'studio';
    if (/plot|land/.test(t)) return 'residential-plot';
    if (/shop|retail/.test(t)) return 'shop-retail';
    if (/showroom/.test(t)) return 'showroom';
    if (/office|suite|floor/.test(t)) return 'office-space';
    return 'apartment';
  };
  if ((await prisma.unitCategory.count()) === 0) {
    let so = 0;
    const bySlug = {};
    for (const parent of CAT_TREE) {
      const p = await prisma.unitCategory.create({
        data: { name: parent.name, slug: slugify(parent.name, { lower: true, strict: true }), icon: parent.icon, sortOrder: so++ },
      });
      for (const ch of parent.children) {
        const c = await prisma.unitCategory.create({
          data: { name: ch, slug: slugify(ch, { lower: true, strict: true }), parentId: p.id, sortOrder: so++ },
        });
        bySlug[c.slug] = c.id;
      }
    }
    for (const u of await prisma.property.findMany({ select: { id: true, unitType: true } })) {
      const cid = bySlug[classify(u.unitType)];
      if (cid) await prisma.property.update({ where: { id: u.id }, data: { categoryId: cid } });
    }
    console.log('✔ unit categories + tagged units');
  }

  // ── Blog posts ────────────────────────────────────────────
  const POSTS = [
    ['How to evaluate a RERA-registered project before you buy', 'A checklist to vet the builder, approvals, timelines and the fine print.', 'Buying Guide'],
    ['2 BHK vs 3 BHK: which makes more sense in 2026?', 'Resale value, rental yield and lifestyle fit — a practical comparison.', 'Buying Guide'],
    ['Carpet area, built-up area, super built-up area — explained', 'Stop overpaying for space you can’t use. Here is what each term really means.', 'Explainers'],
    ['A first-time buyer’s guide to home loans', 'Eligibility, down payment, EMI math and the documents you’ll need.', 'Finance'],
    ['Why gated townships are booming in tier-1 cities', 'Amenities, security and community living are reshaping urban demand.', 'Market Trends'],
    ['Commercial vs residential: where should you invest?', 'Yields, tenancy risk, liquidity and taxation compared side by side.', 'Investing'],
  ];
  if ((await prisma.post.count()) === 0) {
    for (let i = 0; i < POSTS.length; i++) {
      const [title, excerpt, category] = POSTS[i];
      const slug = slugify(title, { lower: true, strict: true });
      await prisma.post.create({
        data: {
          title, slug, excerpt, category,
          tags: [category.toLowerCase(), 'real estate', 'india'],
          body: `<p class="lead">${excerpt}</p>
<p>Buying a home is one of the biggest financial decisions you'll make. This guide walks through the essentials so you can move from shortlisting to signing with confidence.</p>
<h2>Start with the paperwork</h2>
<p>Before you fall in love with a show flat, confirm the project's RERA registration, the approved building plan, and the title of the land. A clean legal foundation matters more than a marble lobby.</p>
<blockquote>Compare the carpet-area price, never the headline price. Two projects quoting the same "per sq ft" can differ 15–20% once you account for loading.</blockquote>
<h2>Visit — twice</h2>
<ul>
  <li>Once on a weekday to judge traffic, water pressure and how the light falls.</li>
  <li>Once after dark to check security, lighting and how lived-in the community feels.</li>
  <li>Talk to at least two existing residents about the builder's after-sales response.</li>
</ul>
<h2>Run the numbers honestly</h2>
<p>Add registration, stamp duty, GST (for under-construction), parking, club membership and 18–24 months of maintenance to the sticker price. That's your real budget.</p>
<p>Use Propszy's filters to line up projects by carpet-area price, possession date and amenities, then raise an enquiry to get the full cost sheet before you visit.</p>`,
          coverUrl: `https://images.unsplash.com/photo-${['1600585154340-be6161a56a0c', '1600607687939-ce8a6c25118c', '1600566753086-00f18fb6b3ea', '1600047509807-ba8f99d2cdde', '1600566752355-35792bedcfea', '1600585154526-990dced4db0d'][i]}?auto=format&fit=crop&w=1200&q=70`,
          status: 'PUBLISHED', publishedAt: new Date(Date.now() - i * 4 * 864e5),
          authorId: admin.id,
          metaTitle: `${title} | Propszy Blog`,
          metaDescription: excerpt,
        },
      });
    }
    console.log(`✔ ${POSTS.length} blog posts`);
  }

  // ── Testimonials ──────────────────────────────────────────
  const TESTIMONIALS = [
    ['Aarti Deshpande', 'Bought a 3 BHK in Pune', 'The agent tracking and site-visit updates made the whole process transparent. Closed in 5 weeks.'],
    ['Rahul Menon', 'Investor, Bengaluru', 'I compared six projects on one map and shortlisted in an evening. The RERA details upfront saved me a lot of calls.'],
    ['Sneha & Vikram', 'First-time buyers', 'We loved that every unit showed the carpet area and floor plan. No surprises at the sales office.'],
    ['Imran Qureshi', 'NRI buyer', 'Did the entire shortlisting from Dubai. The enquiry history and document downloads were a lifesaver.'],
    ['Priya Nair', 'Relocated to Hyderabad', 'Found a ready-to-move apartment near my office using the radius filter. Highly recommend.'],
    ['Karthik Rao', 'Channel partner', 'As an agent, the downline dashboard and commission ledger are the clearest I have used.'],
  ];
  if ((await prisma.testimonial.count()) === 0) {
    for (let i = 0; i < TESTIMONIALS.length; i++) {
      const [name, role, quote] = TESTIMONIALS[i];
      await prisma.testimonial.create({ data: { name, role, quote, rating: 5, sortOrder: i, avatarUrl: img(`avatar-${i}`) } });
    }
    console.log(`✔ ${TESTIMONIALS.length} testimonials`);
  }

  // ── Cities ────────────────────────────────────────────────
  const CITIES = [
    ['Bengaluru', 'Karnataka', true], ['Pune', 'Maharashtra', true], ['Mumbai', 'Maharashtra', true],
    ['Hyderabad', 'Telangana', true], ['Gurugram', 'Haryana', true], ['Chennai', 'Tamil Nadu', true],
    ['Delhi', 'Delhi', false], ['Noida', 'Uttar Pradesh', false], ['Kolkata', 'West Bengal', false],
    ['Ahmedabad', 'Gujarat', false],
  ];
  for (let i = 0; i < CITIES.length; i++) {
    const [name, state, isPopular] = CITIES[i];
    // imageUrl left null on purpose — the UI draws a generated skyline tile;
    // an admin can upload a real photo per city in Admin → Cities.
    await prisma.city.upsert({
      where: { name },
      update: { state, isPopular, isFeatured: isPopular },
      create: {
        name, state, isPopular, isFeatured: isPopular, sortOrder: i,
        slug: slugify(name, { lower: true, strict: true }),
      },
    });
  }
  console.log(`✔ ${CITIES.length} cities`);

  // ── Configurations (Browse by configuration tiles) ────────
  const U = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=70`;
  const CONFIGS = [
    { label: '1 BHK', subtitle: 'Compact city homes', filterType: 'bedrooms', filterValue: '1', isFeatured: true, imageUrl: U('1502672260266-1c1ef2d93688') },
    { label: '2 BHK', subtitle: 'The everyday favourite', filterType: 'bedrooms', filterValue: '2', isFeatured: true, imageUrl: U('1560448204-e02f11c3d0e2') },
    { label: '3 BHK', subtitle: 'Room to grow', filterType: 'bedrooms', filterValue: '3', isFeatured: true, imageUrl: U('1560185007-c5ca9d2c014d') },
    { label: '4 BHK+', subtitle: 'Spacious family living', filterType: 'bedrooms', filterValue: '4,5', isFeatured: true, imageUrl: U('1613977257363-707ba9348227') },
    { label: 'Villas', subtitle: 'Independent & gated', filterType: 'link', filterValue: '/properties?unitType=villa', isFeatured: true, imageUrl: U('1613490493576-7fde63acd811') },
    { label: 'Plots', subtitle: 'Build your own', filterType: 'type', filterValue: 'PLOT', isFeatured: true, imageUrl: U('1500382017468-9049fed747ef') },
    { label: 'Commercial', subtitle: 'Offices & retail', filterType: 'type', filterValue: 'COMMERCIAL', isFeatured: true, imageUrl: U('1497366216548-37526070297c') },
    { label: 'Ready to move', subtitle: 'No wait, move in now', filterType: 'status', filterValue: 'READY_TO_MOVE', isFeatured: true, imageUrl: U('1600585154340-be6161a56a0c') },
    { label: 'Penthouses', subtitle: 'Top-floor luxury', filterType: 'link', filterValue: '/properties?unitType=penthouse', isFeatured: false, imageUrl: U('1502005229762-cf1b2da7c5d6') },
    { label: 'New launches', subtitle: 'Pre-launch pricing', filterType: 'status', filterValue: 'UPCOMING', isFeatured: false, imageUrl: U('1512917774080-9991f1c4c750') },
  ];
  if ((await prisma.configuration.count()) === 0) {
    for (let i = 0; i < CONFIGS.length; i++) {
      const c = CONFIGS[i];
      await prisma.configuration.create({
        data: {
          ...c,
          sortOrder: i,
          slug: `${slugify(c.label, { lower: true, strict: true })}-${i}`,
        },
      });
    }
    console.log(`✔ ${CONFIGS.length} configurations`);
  }

  // ── Hero slider banners ───────────────────────────────────
  if ((await prisma.banner.count({ where: { placement: 'home_hero' } })) === 0) {
    await prisma.banner.createMany({
      data: [
        { placement: 'home_hero', sortOrder: 0, imageUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1920&q=70',
          title: 'Find your next home in a project you can trust', subtitle: 'RERA-registered townships, unit-level pricing, verified agents.', linkUrl: '/projects', ctaLabel: 'Browse projects' },
        { placement: 'home_hero', sortOrder: 1, imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1920&q=70',
          title: 'New launches, priority access', subtitle: 'Get pre-launch pricing on upcoming projects across 6 cities.', linkUrl: '/projects?status=UPCOMING', ctaLabel: 'See new launches' },
        { placement: 'home_hero', sortOrder: 2, imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1920&q=70',
          title: 'Ready to move in', subtitle: 'No wait, no GST — homes you can occupy today.', linkUrl: '/projects?status=READY_TO_MOVE', ctaLabel: 'View ready homes' },
      ],
    });
    console.log('✔ 3 hero banners');
  }
  if ((await prisma.banner.count({ where: { placement: 'home_strip' } })) === 0) {
    await prisma.banner.create({
      data: { title: 'Zero brokerage on select projects', subtitle: 'Limited period', imageUrl: img('banner-strip'), placement: 'home_strip', sortOrder: 0 },
    });
  }

  console.log('\nSeed complete.');
  console.log(`Login: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
