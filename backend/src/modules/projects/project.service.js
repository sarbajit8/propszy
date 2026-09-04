const slugify = require('slugify');
const { prisma } = require('../../config/prisma');
const { ApiError } = require('../../utils/ApiError');

async function uniqueSlug(name, ignoreId) {
  const base = slugify(name, { lower: true, strict: true }).slice(0, 80) || 'project';
  let slug = base;
  let i = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const clash = await prisma.project.findFirst({
      where: { slug, ...(ignoreId ? { NOT: { id: ignoreId } } : {}) },
      select: { id: true },
    });
    if (!clash) return slug;
    slug = `${base}-${++i}`;
  }
}

const projectInclude = {
  media: { orderBy: { sortOrder: 'asc' } },
  amenities: { include: { amenity: true } },
  developer: { select: { id: true, name: true, slug: true, logoUrl: true, website: true } },
  _count: { select: { properties: true, leads: true } },
};

// When a developer is chosen, keep the denormalised `builder` text in sync.
async function attachDeveloper(fields) {
  if (fields.developerId) {
    const dev = await prisma.developer.findUnique({ where: { id: fields.developerId } });
    if (!dev) throw ApiError.badRequest('Selected developer no longer exists');
    fields.builder = dev.name;
  } else if (fields.developerId === null) {
    // explicit disconnect — leave whatever free-text builder is there
  }
}

function shapeProject(p) {
  if (!p) return p;
  const { amenities, _count, ...rest } = p;
  return {
    ...rest,
    amenities: amenities?.map((a) => a.amenity) ?? [],
    counts: _count,
  };
}

function buildListWhere(query, { publicOnly }) {
  const where = {};
  if (publicOnly) where.isPublished = true;
  else if (query.published === 'true') where.isPublished = true;
  else if (query.published === 'false') where.isPublished = false;

  if (query.q) {
    where.OR = [
      { name: { contains: query.q } },
      { builder: { contains: query.q } },
      { city: { contains: query.q } },
      { address: { contains: query.q } },
    ];
  }
  if (query.city) {
    const cities = String(query.city).split(',').map((s) => s.trim()).filter(Boolean);
    where.city = cities.length > 1 ? { in: cities } : { equals: cities[0] };
  }
  if (query.type) {
    const types = String(query.type).split(',').filter(Boolean);
    where.type = types.length > 1 ? { in: types } : types[0];
  }
  if (query.status) {
    const st = String(query.status).split(',').filter(Boolean);
    where.status = st.length > 1 ? { in: st } : st[0];
  }
  if (query.builder) where.builder = { contains: query.builder };
  if (query.reraNo) where.reraNo = { contains: query.reraNo };
  if (query.featured === 'true') where.isFeatured = true;

  const min = query.budgetMin ? Number(query.budgetMin) : undefined;
  const max = query.budgetMax ? Number(query.budgetMax) : undefined;
  if (min != null || max != null) {
    where.AND = where.AND || [];
    if (max != null) where.AND.push({ OR: [{ priceMin: { lte: max } }, { priceMin: null }] });
    if (min != null) where.AND.push({ OR: [{ priceMax: { gte: min } }, { priceMax: null }] });
  }

  // configuration / unit-level filters → project must have a matching property
  const unitWhere = {};
  const beds = (query.bedrooms || '').split(',').map((s) => parseInt(s, 10)).filter((n) => !Number.isNaN(n));
  if (beds.length) unitWhere.bedrooms = { in: beds };
  if (query.areaMin) unitWhere.carpetArea = { ...(unitWhere.carpetArea || {}), gte: Number(query.areaMin) };
  if (query.areaMax) unitWhere.carpetArea = { ...(unitWhere.carpetArea || {}), lte: Number(query.areaMax) };
  if (query.availableOnly === 'true') unitWhere.status = 'AVAILABLE';
  if (Object.keys(unitWhere).length) {
    where.AND = where.AND || [];
    where.AND.push({ properties: { some: unitWhere } });
  }

  const amenityIds = (query.amenities || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (amenityIds.length) {
    where.AND = where.AND || [];
    amenityIds.forEach((id) => where.AND.push({ amenities: { some: { amenityId: id } } }));
  }
  return where;
}

const sortMap = {
  newest: { createdAt: 'desc' },
  oldest: { createdAt: 'asc' },
  price_asc: { priceMin: 'asc' },
  price_desc: { priceMax: 'desc' },
  name: { name: 'asc' },
  popular: [{ leads: { _count: 'desc' } }, { createdAt: 'desc' }],
};

async function list(query, { skip, take, publicOnly }) {
  const where = buildListWhere(query, { publicOnly });
  const orderBy = sortMap[query.sort] || sortMap.newest;
  const [rows, total, priceAgg] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy,
      skip,
      take,
      include: {
        media: { where: { kind: 'IMAGE' }, orderBy: { sortOrder: 'asc' }, take: 1 },
        amenities: { include: { amenity: true } },
        _count: { select: { properties: true, leads: true } },
      },
    }),
    prisma.project.count({ where }),
    prisma.project.aggregate({
      where: publicOnly ? { isPublished: true } : {},
      _min: { priceMin: true },
      _max: { priceMax: true },
    }),
  ]);
  return {
    rows: rows.map(shapeProject),
    total,
    facets: {
      priceMin: priceAgg._min.priceMin ? Number(priceAgg._min.priceMin) : 0,
      priceMax: priceAgg._max.priceMax ? Number(priceAgg._max.priceMax) : 0,
    },
  };
}

function guessCategory(unitType = '') {
  const t = unitType.toLowerCase();
  if (/villa/.test(t)) return 'Villa';
  if (/plot|land/.test(t)) return 'Plot';
  if (/penthouse/.test(t)) return 'Penthouse';
  if (/duplex/.test(t)) return 'Duplex';
  if (/studio/.test(t)) return 'Studio';
  if (/shop|retail|showroom/.test(t)) return 'Shop';
  if (/office|suite|floor/.test(t)) return 'Office';
  if (/bhk|bedroom|apartment|flat/.test(t)) return 'Apartment';
  return 'Other';
}

// Category/sub-category rollup with auto counts + price range per group.
function buildInventory(props = []) {
  const groups = {};
  for (const u of props) {
    const key = u.category?.name || guessCategory(u.unitType);
    const g = groups[key] || (groups[key] = { label: key, total: 0, available: 0, priceMin: null, priceMax: null, _cfg: {} });
    g.total += 1;
    if (u.status === 'AVAILABLE') g.available += 1;
    const price = u.price != null ? Number(u.price) : null;
    if (price != null) {
      g.priceMin = g.priceMin == null ? price : Math.min(g.priceMin, price);
      g.priceMax = g.priceMax == null ? price : Math.max(g.priceMax, price);
    }
    g._cfg[u.unitType] = (g._cfg[u.unitType] || 0) + 1;
  }
  return Object.values(groups)
    .map(({ _cfg, ...g }) => ({ ...g, configs: Object.entries(_cfg).map(([label, count]) => ({ label, count })) }))
    .sort((a, b) => b.total - a.total);
}

async function getByIdOrSlug(idOrSlug, { publicOnly } = {}) {
  const project = await prisma.project.findFirst({
    where: {
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      ...(publicOnly ? { isPublished: true } : {}),
    },
    include: {
      ...projectInclude,
      properties: {
        orderBy: { createdAt: 'asc' },
        include: {
          media: { where: { kind: 'IMAGE' }, take: 1, orderBy: { sortOrder: 'asc' } },
          category: { select: { id: true, name: true, slug: true, parentId: true } },
        },
      },
    },
  });
  if (!project) throw ApiError.notFound('Project not found');
  const shaped = shapeProject(project);
  shaped.inventory = buildInventory(project.properties);
  return shaped;
}

async function create(data, userId) {
  const { amenityIds = [], ...fields } = data;
  await attachDeveloper(fields);
  const slug = await uniqueSlug(fields.name);
  const project = await prisma.project.create({
    data: {
      ...fields,
      slug,
      createdById: userId || null,
      amenities: amenityIds.length
        ? { create: amenityIds.map((amenityId) => ({ amenityId })) }
        : undefined,
    },
    include: projectInclude,
  });
  return shapeProject(project);
}

async function update(id, data) {
  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Project not found');

  const { amenityIds, name, ...fields } = data;
  await attachDeveloper(fields);
  const patch = { ...fields };
  if (name && name !== existing.name) {
    patch.name = name;
    patch.slug = await uniqueSlug(name, id);
  } else if (name) {
    patch.name = name;
  }

  const project = await prisma.$transaction(async (tx) => {
    if (amenityIds) {
      await tx.projectAmenity.deleteMany({ where: { projectId: id } });
      if (amenityIds.length) {
        await tx.projectAmenity.createMany({
          data: amenityIds.map((amenityId) => ({ projectId: id, amenityId })),
        });
      }
    }
    return tx.project.update({ where: { id }, data: patch, include: projectInclude });
  });
  return shapeProject(project);
}

async function remove(id) {
  await prisma.project.delete({ where: { id } });
}

async function mapPins(query = {}) {
  const where = {
    isPublished: true,
    lat: { not: null },
    lng: { not: null },
  };
  if (query.city) where.city = query.city;
  if (query.type) where.type = query.type;
  if (query.status) where.status = query.status;
  if (query.featured === 'true') where.isFeatured = true;
  if (query.q) {
    where.OR = [
      { name: { contains: query.q } },
      { builder: { contains: query.q } },
      { address: { contains: query.q } },
      { city: { contains: query.q } },
    ];
  }
  const min = query.budgetMin ? Number(query.budgetMin) : undefined;
  const max = query.budgetMax ? Number(query.budgetMax) : undefined;
  if (min != null || max != null) {
    where.AND = [];
    if (max != null) where.AND.push({ OR: [{ priceMin: { lte: max } }, { priceMin: null }] });
    if (min != null) where.AND.push({ OR: [{ priceMax: { gte: min } }, { priceMax: null }] });
  }

  const rows = await prisma.project.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, name: true, slug: true, lat: true, lng: true,
      address: true, city: true, state: true,
      type: true, status: true, priceMin: true, priceMax: true,
      builder: true, coverImageUrl: true, isFeatured: true, isTrending: true,
      media: { where: { kind: 'IMAGE' }, orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true } },
      _count: { select: { properties: true } },
    },
  });
  return rows;
}

module.exports = { list, getByIdOrSlug, create, update, remove, mapPins, uniqueSlug };
