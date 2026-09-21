const { prisma } = require('../../config/prisma');
const { ApiError } = require('../../utils/ApiError');
const { asyncHandler, ok, created, parsePagination, pageMeta } = require('../../utils/http');
const { logActivity } = require('../../services/activity');

const include = {
  media: { orderBy: { sortOrder: 'asc' } },
  category: {
    select: {
      id: true,
      name: true,
      parentId: true,
      parent: { select: { id: true, name: true, slug: true } },
    },
  },
  project: {
    select: { id: true, name: true, slug: true, city: true, state: true, address: true, lat: true, lng: true, isPublished: true },
  },
  createdBy: { select: { id: true, name: true, phone: true, email: true } },
};

const sortMap = {
  newest: { createdAt: 'desc' },
  price_asc: { price: 'asc' },
  price_desc: { price: 'desc' },
  area_desc: { carpetArea: 'desc' },
};

const isStaff = (req) => req.user && ['ADMIN', 'SUBADMIN'].includes(req.user.role);
const csv = (v) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean);

// Standalone properties carry their own isPublished; project-wise ones inherit the project's.
const visibilityOr = () => ({ OR: [{ project: { isPublished: true } }, { projectId: null, isPublished: true }] });

const listProperties = asyncHandler(async (req, res) => {
  const { page, limit, skip, take } = parsePagination(req.query);
  const q = req.query;
  const staff = isStaff(req);

  const cityList = csv(q.city);
  const statusList = csv(q.status);
  const bedList = csv(q.bedrooms).map(Number).filter((n) => !Number.isNaN(n));
  const facingList = csv(q.facing);
  const mine = q.mine === 'true' && req.user;
  const pending = q.pending === 'true' && staff;

  // independent OR-conditions must be combined via AND, never spread onto the same `where`
  // object (a later `OR:` key would silently clobber an earlier one).
  const and = [];
  if (!staff && !mine) and.push(visibilityOr());
  if (cityList.length) {
    const cityMatch = cityList.length > 1 ? { in: cityList } : cityList[0];
    and.push({ OR: [{ project: { city: cityMatch } }, { projectId: null, city: cityMatch }] });
  }
  if (q.bestSeller === 'true') and.push({ OR: [{ isBestSeller: true }, { soldCount: { gt: 0 } }] });

  if (q.category) {
    const cat = q.category.trim();
    const isFlat = /flat|apartment/i.test(cat);
    and.push({
      OR: [
        { category: { name: { contains: cat } } },
        { category: { parent: { name: { contains: cat } } } },
        { unitType: { contains: cat } },
        ...(isFlat ? [{ unitType: { contains: 'BHK' } }] : []),
      ],
    });
  }

  if (q.type) {
    const tp = q.type.trim();
    and.push({
      OR: [
        { project: { type: tp.toUpperCase() } },
        { category: { name: { contains: tp } } },
        { category: { parent: { name: { contains: tp } } } },
        { unitType: { contains: tp } },
      ],
    });
  }

  const projStatus = q.projectStatus || (['UPCOMING', 'READY_TO_MOVE', 'ONGOING'].includes(q.status) ? q.status : null);
  if (projStatus) {
    and.push({
      OR: [
        { project: { status: projStatus } },
        ...(projStatus === 'READY_TO_MOVE' ? [{ status: 'AVAILABLE' }] : []),
      ],
    });
  }

  const intentVal = (q.listingIntent || q.intent || '').trim().toUpperCase();

  const validUnitStatuses = statusList.filter((s) => !['UPCOMING', 'READY_TO_MOVE', 'ONGOING'].includes(s));

  const where = {
    ...(mine ? { createdById: req.user.id } : {}),
    // any not-yet-live standalone listing — customer-submitted or an admin draft
    ...(pending ? { projectId: null, isPublished: false } : {}),
    ...(q.projectId ? { projectId: q.projectId } : {}),
    ...(validUnitStatuses.length ? { status: validUnitStatuses.length > 1 ? { in: validUnitStatuses } : validUnitStatuses[0] } : {}),
    ...(q.unitType ? { unitType: { contains: q.unitType } } : {}),
    ...(intentVal && ['SALE', 'RENT', 'PG'].includes(intentVal) ? { listingIntent: intentVal } : {}),
    ...(bedList.length ? { bedrooms: { in: bedList } } : {}),
    ...(facingList.length ? { facing: { in: facingList } } : {}),
    ...(q.featured === 'true' ? { isFeatured: true } : {}),
    ...(q.trending === 'true' ? { isTrending: true } : {}),
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
    ...(and.length ? { AND: and } : {}),
  };

  const [rows, total, facets] = await Promise.all([
    prisma.property.findMany({ where, include, orderBy: sortMap[q.sort] || sortMap.newest, skip, take }),
    prisma.property.count({ where }),
    prisma.property.aggregate({
      where: staff ? {} : visibilityOr(),
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
  if (!isStaff(req) && property.createdById !== req.user?.id) {
    const visible = property.projectId ? !!property.project?.isPublished : property.isPublished;
    if (!visible) throw ApiError.notFound('Property not found');
  }
  logActivity(req, { action: 'property.view', entityType: 'property', entityId: property.id });
  // resolved location/address — own value first, else inherited from the project (if any)
  property.resolvedLat = property.latOverride ?? property.project?.lat ?? null;
  property.resolvedLng = property.lngOverride ?? property.project?.lng ?? null;
  property.resolvedCity = property.city ?? property.project?.city ?? null;
  property.resolvedState = property.state ?? property.project?.state ?? null;
  property.resolvedAddress = property.addressOverride ?? property.project?.address ?? null;
  return ok(res, property);
});

const createProperty = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  let coverImageUrl = data.coverImageUrl;
  delete data.coverImageUrl;

  if (!isStaff(req)) {
    // a customer can only self-list a standalone property, pending admin review —
    // commission is set later by staff when they review/approve the listing
    data.projectId = null;
    data.isPublished = false;
    data.createdById = req.user.id;
    delete data.commissionScheme;
  }
  if (data.projectId) {
    const project = await prisma.project.findUnique({ where: { id: data.projectId } });
    if (!project) throw ApiError.badRequest('Selected project does not exist');
    if (!coverImageUrl && project.coverImageUrl) {
      coverImageUrl = project.coverImageUrl;
    }
  }

  if (!coverImageUrl || !coverImageUrl.trim()) {
    throw ApiError.badRequest('Cover image is mandatory. Please upload a cover image.');
  }

  // Inventory & stock synchronization
  if (data.totalUnits != null) data.totalUnits = Number(data.totalUnits);
  if (data.availableUnits != null) {
    data.availableUnits = Number(data.availableUnits);
    if (data.availableUnits <= 0) {
      data.availableUnits = 0;
      data.status = 'SOLD';
    }
  } else if (data.totalUnits != null) {
    data.availableUnits = data.totalUnits;
  }
  if (data.status === 'SOLD') {
    data.availableUnits = 0;
  }

  const property = await prisma.property.create({
    data: {
      ...data,
      media: {
        create: {
          kind: 'IMAGE',
          url: coverImageUrl.trim(),
          title: 'Cover photo',
          sortOrder: 0,
        },
      },
    },
    include,
  });
  logActivity(req, { action: 'property.create', entityType: 'property', entityId: property.id });
  return created(res, property);
});

const updateProperty = asyncHandler(async (req, res) => {
  const existing = await prisma.property.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound('Property not found');
  if (!isStaff(req) && existing.createdById !== req.user.id) throw ApiError.forbidden('You do not have access to this listing');

  const data = { ...req.body };
  const coverImageUrl = data.coverImageUrl;
  delete data.coverImageUrl;

  if (!isStaff(req)) {
    // customers can't move their listing into a project, self-publish, or set commission
    delete data.projectId;
    delete data.isPublished;
    delete data.commissionScheme;
  }
  if (data.projectId) {
    const project = await prisma.project.findUnique({ where: { id: data.projectId } });
    if (!project) throw ApiError.badRequest('Selected project does not exist');
  }

  // Inventory & stock synchronization
  if (data.totalUnits != null) data.totalUnits = Number(data.totalUnits);
  if (data.availableUnits != null) {
    data.availableUnits = Number(data.availableUnits);
    if (data.availableUnits <= 0) {
      data.availableUnits = 0;
      data.status = 'SOLD';
    } else if (data.status !== 'ON_HOLD' && (!data.status || existing.status === 'SOLD')) {
      data.status = 'AVAILABLE';
    }
  }
  if (data.status === 'SOLD') {
    data.availableUnits = 0;
  } else if (data.status === 'AVAILABLE' && (data.availableUnits == null && existing.availableUnits <= 0)) {
    data.availableUnits = data.totalUnits || existing.totalUnits || 1;
  }

  const property = await prisma.property.update({ where: { id: req.params.id }, data, include });

  if (coverImageUrl && coverImageUrl.trim()) {
    const firstImage = await prisma.media.findFirst({
      where: { propertyId: req.params.id, kind: 'IMAGE' },
      orderBy: { sortOrder: 'asc' },
    });
    if (firstImage) {
      if (firstImage.url !== coverImageUrl.trim()) {
        await prisma.media.update({
          where: { id: firstImage.id },
          data: { url: coverImageUrl.trim() },
        });
      }
    } else {
      await prisma.media.create({
        data: {
          propertyId: req.params.id,
          kind: 'IMAGE',
          url: coverImageUrl.trim(),
          title: 'Cover photo',
          sortOrder: 0,
        },
      });
    }
  }

  logActivity(req, { action: 'property.update', entityType: 'property', entityId: property.id });
  return ok(res, property);
});

const deleteProperty = asyncHandler(async (req, res) => {
  const existing = await prisma.property.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound('Property not found');
  if (!isStaff(req) && existing.createdById !== req.user.id) throw ApiError.forbidden('You do not have access to this listing');
  await prisma.property.delete({ where: { id: req.params.id } });
  return ok(res, { deleted: true });
});

module.exports = { listProperties, getProperty, createProperty, updateProperty, deleteProperty };
