const { prisma } = require('../../config/prisma');
const { ApiError } = require('../../utils/ApiError');
const { asyncHandler, ok, created, parsePagination, pageMeta } = require('../../utils/http');
const { logActivity } = require('../../services/activity');

const include = {
  media: { orderBy: { sortOrder: 'asc' } },
  project: {
    select: { id: true, name: true, slug: true, city: true, state: true, address: true, lat: true, lng: true },
  },
};

const sortMap = {
  newest: { createdAt: 'desc' },
  price_asc: { price: 'asc' },
  price_desc: { price: 'desc' },
  area_desc: { carpetArea: 'desc' },
};

const isStaff = (req) => req.user && ['ADMIN', 'SUBADMIN'].includes(req.user.role);
const csv = (v) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean);

const listProperties = asyncHandler(async (req, res) => {
  const { page, limit, skip, take } = parsePagination(req.query);
  const q = req.query;

  const projectFilter = {};
  if (!isStaff(req)) projectFilter.isPublished = true;
  const cityList = csv(q.city);
  if (cityList.length === 1) projectFilter.city = cityList[0];
  else if (cityList.length > 1) projectFilter.city = { in: cityList };

  const statusList = csv(q.status);
  const bedList = csv(q.bedrooms).map(Number).filter((n) => !Number.isNaN(n));
  const facingList = csv(q.facing);

  const where = {
    ...(q.projectId ? { projectId: q.projectId } : {}),
    ...(statusList.length ? { status: statusList.length > 1 ? { in: statusList } : statusList[0] } : {}),
    ...(q.unitType ? { unitType: { contains: q.unitType } } : {}),
    ...(bedList.length ? { bedrooms: { in: bedList } } : {}),
    ...(facingList.length ? { facing: { in: facingList } } : {}),
    ...(q.featured === 'true' ? { isFeatured: true } : {}),
    ...(q.trending === 'true' ? { isTrending: true } : {}),
    ...(q.bestSeller === 'true' ? { OR: [{ isBestSeller: true }, { soldCount: { gt: 0 } }] } : {}),
    ...(q.priceMin || q.priceMax
      ? {
          price: {
            ...(q.priceMin ? { gte: Number(q.priceMin) } : {}),
            ...(q.priceMax ? { lte: Number(q.priceMax) } : {}),
          },
        }
      : {}),
    ...(q.areaMin || q.areaMax
      ? {
          carpetArea: {
            ...(q.areaMin ? { gte: Number(q.areaMin) } : {}),
            ...(q.areaMax ? { lte: Number(q.areaMax) } : {}),
          },
        }
      : {}),
    ...(Object.keys(projectFilter).length ? { project: projectFilter } : {}),
  };

  const [rows, total, facets] = await Promise.all([
    prisma.property.findMany({ where, include, orderBy: sortMap[q.sort] || sortMap.newest, skip, take }),
    prisma.property.count({ where }),
    prisma.property.aggregate({
      where: isStaff(req) ? {} : { project: { isPublished: true } },
      _min: { price: true }, _max: { price: true },
    }),
  ]);
  return ok(res, rows, {
    ...pageMeta(page, limit, total),
    facets: {
      priceMin: facets._min.price ? Number(facets._min.price) : 0,
      priceMax: facets._max.price ? Number(facets._max.price) : 0,
    },
  });
});

const getProperty = asyncHandler(async (req, res) => {
  const property = await prisma.property.findUnique({ where: { id: req.params.id }, include });
  if (!property) throw ApiError.notFound('Property not found');
  if (!isStaff(req)) {
    const parent = await prisma.project.findUnique({
      where: { id: property.projectId },
      select: { isPublished: true },
    });
    if (!parent?.isPublished) throw ApiError.notFound('Property not found');
  }
  logActivity(req, { action: 'property.view', entityType: 'property', entityId: property.id });
  // resolved location (override or inherit)
  property.resolvedLat = property.latOverride ?? property.project.lat;
  property.resolvedLng = property.lngOverride ?? property.project.lng;
  return ok(res, property);
});

const createProperty = asyncHandler(async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.body.projectId } });
  if (!project) throw ApiError.badRequest('Parent project does not exist');
  const property = await prisma.property.create({ data: req.body, include });
  logActivity(req, { action: 'property.create', entityType: 'property', entityId: property.id });
  return created(res, property);
});

const updateProperty = asyncHandler(async (req, res) => {
  const property = await prisma.property.update({ where: { id: req.params.id }, data: req.body, include });
  logActivity(req, { action: 'property.update', entityType: 'property', entityId: property.id });
  return ok(res, property);
});

const deleteProperty = asyncHandler(async (req, res) => {
  await prisma.property.delete({ where: { id: req.params.id } });
  return ok(res, { deleted: true });
});

module.exports = { listProperties, getProperty, createProperty, updateProperty, deleteProperty };
