const { prisma } = require('../../config/prisma');
const { shapeConfiguration } = require('../configurations/configuration.service');

const CONFIG_KEY = 'home.config';

const PROJECT_CARD = {
  id: true, name: true, slug: true, type: true, status: true,
  priceMin: true, priceMax: true, address: true, city: true, state: true,
  reraNo: true, builder: true, possessionDate: true,
  developer: { select: { name: true, logoUrl: true } },
  coverImageUrl: true, isFeatured: true, isTrending: true, isBestSeller: true, createdAt: true,
  media: { where: { kind: 'IMAGE' }, orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true } },
  properties: { where: { bedrooms: { not: null } }, select: { bedrooms: true }, distinct: ['bedrooms'] },
  _count: { select: { properties: true, leads: true } },
};

// derive "2, 3 BHK" + a one-line "X, Y BHK <Type> in <locality>, <city>"
function shapeProjectCard(p) {
  if (!p || !p.properties) return p;
  const { properties, ...rest } = p;
  const beds = [...new Set(properties.map((x) => x.bedrooms).filter(Boolean))].sort((a, b) => a - b);
  const bhk = beds.length ? `${beds.join(', ')} BHK` : null;
  const typeWord = { RESIDENTIAL: 'Apartment', COMMERCIAL: 'Commercial', PLOT: 'Plot', MIXED: 'Property' }[p.type] || 'Property';
  const config = [bhk, typeWord].filter(Boolean).join(' ');
  const place = [p.address, p.city].filter(Boolean).join(', ');
  return { ...rest, bhk, configLabel: place ? `${config} in ${place}` : config };
}

const PROPERTY_CARD = {
  id: true, unitType: true, price: true, carpetArea: true, areaUnit: true,
  bedrooms: true, bathrooms: true, facing: true, status: true,
  isFeatured: true, isTrending: true, isBestSeller: true, createdAt: true,
  media: { where: { kind: 'IMAGE' }, orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true } },
  project: { select: { id: true, name: true, slug: true, city: true, lat: true, lng: true } },
};

// source → prisma where/orderBy
const PROJECT_SOURCES = {
  featured:   { where: { isFeatured: true },  order: { createdAt: 'desc' } },
  trending:   { where: { isTrending: true },  order: [{ leads: { _count: 'desc' } }, { createdAt: 'desc' }] },
  bestseller: { where: { isBestSeller: true }, order: { createdAt: 'desc' } },
  new:        { where: { status: 'UPCOMING' }, order: { createdAt: 'desc' } },
  ready:      { where: { status: 'READY_TO_MOVE' }, order: { createdAt: 'desc' } },
  commercial: { where: { type: { in: ['COMMERCIAL', 'MIXED'] } }, order: { createdAt: 'desc' } },
  plots:      { where: { type: 'PLOT' }, order: { createdAt: 'desc' } },
  luxury:     { where: { priceMax: { gte: 20000000 } }, order: { priceMax: 'desc' } },
  recent:     { where: {}, order: { createdAt: 'desc' } },
};

const PROPERTY_SOURCES = {
  featured:   { where: { isFeatured: true, status: 'AVAILABLE' }, order: { createdAt: 'desc' } },
  trending:   { where: { isTrending: true }, order: [{ leads: { _count: 'desc' } }, { createdAt: 'desc' }] },
  bestseller: { where: { OR: [{ isBestSeller: true }, { soldCount: { gt: 0 } }] }, order: [{ soldCount: 'desc' }, { createdAt: 'desc' }] },
  affordable: { where: { status: 'AVAILABLE', price: { lte: 6000000, gt: 0 } }, order: { price: 'asc' } },
  recent:     { where: {}, order: { createdAt: 'desc' } },
};

const DEFAULT_TOGGLES = {
  trustBar: true, browseByType: true, cities: true, budget: true, builders: true,
  topAgents: true, howItWorks: true, whyUs: true, testimonials: true, blog: true,
  agentCta: true, faq: true, finalCta: true,
};

const DEFAULT_SECTIONS = [
  { key: 'featured-projects',  title: 'Featured projects',   subtitle: 'Hand-picked by our team', kind: 'projects',   source: 'featured',   limit: 8,  enabled: true, fill: true },
  { key: 'featured-units',     title: 'Featured units',      subtitle: 'Ready to enquire',        kind: 'properties', source: 'featured',   limit: 10, enabled: true, fill: true },
  { key: 'trending-projects',  title: '🔥 Trending projects', subtitle: 'Most enquired this month', kind: 'projects',  source: 'trending',   limit: 8,  enabled: true, fill: true },
  { key: 'trending-units',     title: '🔥 Trending units',    subtitle: '',                        kind: 'properties', source: 'trending',   limit: 10, enabled: true, fill: true },
  { key: 'bestseller-projects', title: 'Best-selling projects', subtitle: 'Fastest-moving inventory', kind: 'projects', source: 'bestseller', limit: 8,  enabled: true, fill: true },
  { key: 'bestseller-units',   title: 'Best-selling units',   subtitle: '',                        kind: 'properties', source: 'bestseller', limit: 10, enabled: true, fill: true },
  { key: 'new-launches',       title: 'New launches',         subtitle: 'Pre-launch and upcoming', kind: 'projects',   source: 'new',        limit: 8,  enabled: true, fill: false },
  { key: 'ready-to-move',      title: 'Ready to move in',     subtitle: 'No wait, no GST surprises', kind: 'projects', source: 'ready',      limit: 8,  enabled: true, fill: false },
  { key: 'affordable',         title: 'Affordable homes',     subtitle: 'Under ₹60 L',             kind: 'properties', source: 'affordable', limit: 10, enabled: true, fill: false },
  { key: 'luxury',             title: 'Luxury & premium',     subtitle: '₹2 Cr and above',         kind: 'projects',   source: 'luxury',     limit: 8,  enabled: true, fill: false },
  { key: 'commercial',         title: 'Commercial spaces',    subtitle: 'Offices, retail and mixed-use', kind: 'projects', source: 'commercial', limit: 8, enabled: true, fill: false },
  { key: 'plots',              title: 'Plots & land',         subtitle: 'Build your own',          kind: 'projects',   source: 'plots',      limit: 8,  enabled: true, fill: false },
];

function defaultConfig() {
  return { toggles: { ...DEFAULT_TOGGLES }, sections: DEFAULT_SECTIONS.map((s) => ({ ...s })) };
}

async function getConfig() {
  const row = await prisma.setting.findUnique({ where: { key: CONFIG_KEY } });
  const stored = row?.value || {};
  return {
    toggles: { ...DEFAULT_TOGGLES, ...(stored.toggles || {}) },
    sections: Array.isArray(stored.sections) && stored.sections.length ? stored.sections : defaultConfig().sections,
  };
}

async function saveConfig(next) {
  const clean = {
    toggles: { ...DEFAULT_TOGGLES, ...(next.toggles || {}) },
    sections: (next.sections || []).map((s, i) => ({
      key: String(s.key || `section-${i}`).slice(0, 60),
      title: String(s.title || 'Untitled').slice(0, 120),
      subtitle: String(s.subtitle || '').slice(0, 200),
      kind: s.kind === 'properties' ? 'properties' : 'projects',
      source: String(s.source || 'featured'),
      city: s.city ? String(s.city).slice(0, 120) : undefined,
      ids: Array.isArray(s.ids) ? s.ids.slice(0, 24).map(String) : undefined,
      limit: Math.min(24, Math.max(3, parseInt(s.limit, 10) || 8)),
      enabled: s.enabled !== false,
      fill: !!s.fill,
    })),
  };
  await prisma.setting.upsert({
    where: { key: CONFIG_KEY },
    update: { value: clean },
    create: { key: CONFIG_KEY, value: clean },
  });
  return clean;
}

async function resolveSection(sec) {
  const pub = { isPublished: true };
  const take = sec.limit || 8;

  if (sec.kind === 'properties') {
    if (sec.source === 'manual' && sec.ids?.length) {
      const rows = await prisma.property.findMany({
        where: { id: { in: sec.ids }, project: { isPublished: true } }, select: PROPERTY_CARD,
      });
      return sec.ids.map((id) => rows.find((r) => r.id === id)).filter(Boolean);
    }
    const src = PROPERTY_SOURCES[sec.source] || PROPERTY_SOURCES.recent;
    const rows = await prisma.property.findMany({
      where: { project: { isPublished: true }, ...src.where },
      orderBy: src.order, take, select: PROPERTY_CARD,
    });
    if (sec.fill && rows.length < Math.min(take, 3)) {
      const extra = await prisma.property.findMany({
        where: { project: { isPublished: true }, id: { notIn: rows.map((r) => r.id) } },
        orderBy: { createdAt: 'desc' }, take: take - rows.length, select: PROPERTY_CARD,
      });
      return [...rows, ...extra];
    }
    return rows;
  }

  // projects
  if (sec.source === 'manual' && sec.ids?.length) {
    const rows = await prisma.project.findMany({
      where: { id: { in: sec.ids }, isPublished: true }, select: PROJECT_CARD,
    });
    return sec.ids.map((id) => rows.find((r) => r.id === id)).filter(Boolean).map(shapeProjectCard);
  }
  if (sec.source === 'city' && sec.city) {
    const rows = await prisma.project.findMany({
      where: { ...pub, city: sec.city }, orderBy: { createdAt: 'desc' }, take, select: PROJECT_CARD,
    });
    return rows.map(shapeProjectCard);
  }
  const src = PROJECT_SOURCES[sec.source] || PROJECT_SOURCES.recent;
  const rows = await prisma.project.findMany({
    where: { ...pub, ...src.where }, orderBy: src.order, take, select: PROJECT_CARD,
  });
  if (sec.fill && rows.length < Math.min(take, 3)) {
    const extra = await prisma.project.findMany({
      where: { ...pub, id: { notIn: rows.map((r) => r.id) } },
      orderBy: { createdAt: 'desc' }, take: take - rows.length, select: PROJECT_CARD,
    });
    return [...rows, ...extra].map(shapeProjectCard);
  }
  return rows.map(shapeProjectCard);
}

async function buildHome() {
  const config = await getConfig();

  const BUDGET_BUCKETS = [
    { key: 'under-50l', label: 'Under ₹50 L', min: 0, max: 5_000_000 },
    { key: '50l-1cr', label: '₹50 L – ₹1 Cr', min: 5_000_000, max: 10_000_000 },
    { key: '1cr-2cr', label: '₹1 Cr – ₹2 Cr', min: 10_000_000, max: 20_000_000 },
    { key: 'above-2cr', label: 'Above ₹2 Cr', min: 20_000_000, max: 10_000_000_000 },
  ];

  const [
    stats, cityRows, bedroomGroups, builderGroups, testimonials, posts, topAgentsRaw, amenities, heroBanners, configRows,
  ] = await Promise.all([
    Promise.all([
      prisma.project.count({ where: { isPublished: true } }),
      prisma.property.count({ where: { project: { isPublished: true } } }),
      prisma.user.count({ where: { role: 'AGENT' } }),
      prisma.lead.count({ where: { statusKey: 'CONVERTED' } }),
    ]).then(([projects, properties, agents, deals]) => ({ projects, properties, agents, deals })),
    prisma.city.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
    prisma.property.groupBy({ by: ['bedrooms'], where: { project: { isPublished: true }, bedrooms: { not: null } }, _count: { _all: true }, orderBy: { bedrooms: 'asc' } }),
    prisma.project.groupBy({ by: ['builder'], where: { isPublished: true, builder: { not: null } }, _count: { _all: true }, orderBy: { _count: { builder: 'desc' } }, take: 12 }),
    prisma.testimonial.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' }, take: 9 }),
    prisma.post.findMany({ where: { status: 'PUBLISHED' }, orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }], take: 6, select: { id: true, title: true, slug: true, excerpt: true, coverUrl: true, category: true, publishedAt: true, body: true, author: { select: { name: true, avatarUrl: true } } } }),
    prisma.user.findMany({ where: { role: 'AGENT', kycStatus: 'APPROVED', isActive: true }, select: { id: true, name: true, avatarUrl: true, referralCode: true, _count: { select: { downline: true, leadsAsAgent: true } } }, take: 8 }),
    prisma.amenity.findMany({ orderBy: { name: 'asc' }, take: 16 }),
    prisma.banner.findMany({ where: { placement: 'home_hero', isActive: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
    prisma.configuration.findMany({ where: { isActive: true, isFeatured: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
  ]);

  // per-project counts for cities (published only)
  const cityCounts = await prisma.project.groupBy({
    by: ['city'], where: { isPublished: true, city: { not: null } }, _count: { _all: true },
  });
  const countByCity = Object.fromEntries(cityCounts.map((c) => [c.city, c._count._all]));

  // Managed developers (with logos) take priority over the free-text builder rollup.
  const developerRows = await prisma.developer.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  const devCounts = await prisma.project.groupBy({
    by: ['developerId'], where: { isPublished: true, developerId: { not: null } }, _count: { _all: true },
  });
  const countByDev = Object.fromEntries(devCounts.map((d) => [d.developerId, d._count._all]));
  const featuredDevIds = developerRows.filter((d) => (countByDev[d.id] || 0) > 0).map((d) => d.id);
  const devProjectRows = featuredDevIds.length
    ? await prisma.project.findMany({
        where: { isPublished: true, developerId: { in: featuredDevIds } },
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true, name: true, slug: true, developerId: true, address: true, city: true,
          priceMin: true, priceMax: true, coverImageUrl: true,
          media: { where: { kind: 'IMAGE' }, orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true } },
        },
      })
    : [];
  const projectsByDev = {};
  for (const p of devProjectRows) {
    (projectsByDev[p.developerId] ||= []).push({
      id: p.id, name: p.name, slug: p.slug,
      address: p.address, city: p.city,
      priceMin: p.priceMin, priceMax: p.priceMax,
      image: p.coverImageUrl || p.media[0]?.url || null,
    });
  }
  const developerList = developerRows
    .map((d) => {
      const count = countByDev[d.id] || 0;
      return {
        name: d.name, slug: d.slug, logoUrl: d.logoUrl, website: d.website,
        description: d.description, foundedYear: d.foundedYear,
        count, projectCount: d.totalProjects || count,
        projects: (projectsByDev[d.id] || []).slice(0, 8),
      };
    })
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count);

  const cities = (cityRows.length
    ? cityRows.map((c) => ({ name: c.name, slug: c.slug, state: c.state, imageUrl: c.imageUrl, isPopular: c.isPopular, isFeatured: c.isFeatured, count: countByCity[c.name] || 0 }))
    : cityCounts.map((c) => ({ name: c.city, slug: null, count: c._count._all, isPopular: true, isFeatured: true }))
  );

  const budgets = await Promise.all(
    BUDGET_BUCKETS.map(async (b) => ({
      ...b,
      count: await prisma.project.count({
        where: {
          isPublished: true,
          OR: [
            { AND: [{ priceMin: { gte: b.min } }, { priceMin: { lt: b.max } }] },
            { AND: [{ priceMax: { gte: b.min } }, { priceMax: { lt: b.max } }] },
          ],
        },
      }),
    }))
  );

  // resolve each enabled section in config order
  const sections = [];
  for (const sec of config.sections) {
    if (sec.enabled === false) continue;
    const items = await resolveSection(sec);
    if (!items.length) continue;
    sections.push({ key: sec.key, title: sec.title, subtitle: sec.subtitle, kind: sec.kind, items });
  }

  return {
    toggles: config.toggles,
    heroBanners,
    stats: { ...stats, cities: cities.filter((c) => c.count > 0).length || cities.length },
    sections,
    cities,
    configurations: await Promise.all(configRows.map((c) => shapeConfiguration(c))),
    propertyTypes: bedroomGroups.map((g) => ({ key: `${g.bedrooms}bhk`, label: `${g.bedrooms} BHK`, bedrooms: g.bedrooms, count: g._count._all })),
    budgets,
    builders: developerList.length
      ? developerList
      : builderGroups.map((b) => ({ name: b.builder, count: b._count._all, projectCount: b._count._all, projects: [] })),
    amenities,
    testimonials,
    posts: posts.map(({ body, ...p }) => ({
      ...p,
      readMinutes: Math.max(1, Math.round(String(body || '').replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length / 200)),
    })),
    topAgents: topAgentsRaw
      .map((a) => ({ id: a.id, name: a.name, avatarUrl: a.avatarUrl, code: a.referralCode, network: a._count.downline, deals: a._count.leadsAsAgent }))
      .sort((x, y) => y.network + y.deals - (x.network + x.deals)),
  };
}

module.exports = { getConfig, saveConfig, buildHome, defaultConfig, DEFAULT_TOGGLES, PROJECT_SOURCES, PROPERTY_SOURCES };
