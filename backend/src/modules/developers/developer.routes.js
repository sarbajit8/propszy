const { Router } = require('express');
const { z } = require('zod');
const slugify = require('slugify');
const { prisma } = require('../../config/prisma');
const { optionalAuth, authenticate, authorize } = require('../../middleware/auth');
const { asyncHandler, ok, created } = require('../../utils/http');

const router = Router();

const bodySchema = z.object({
  name: z.string().min(1).max(160),
  logoUrl: z.string().url().optional().or(z.literal('')),
  description: z.string().max(4000).optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  foundedYear: z.preprocess((v) => (v === '' || v === null ? null : v === undefined ? undefined : Number(v)), z.number().int().min(1800).max(2100).nullable().optional()),
  totalProjects: z.preprocess((v) => (v === '' || v === null ? null : v === undefined ? undefined : Number(v)), z.number().int().min(0).max(100000).nullable().optional()),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

// Public — active developers, with published-project counts.
router.get(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const staff = req.user && ['ADMIN', 'SUBADMIN'].includes(req.user.role);
    const developers = await prisma.developer.findMany({
      where: staff ? {} : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    const counts = await prisma.project.groupBy({
      by: ['developerId'],
      where: { isPublished: true, developerId: { not: null } },
      _count: { _all: true },
    });
    const byId = Object.fromEntries(counts.map((c) => [c.developerId, c._count._all]));
    return ok(res, developers.map((d) => ({ ...d, projectCount: byId[d.id] || 0 })));
  })
);

router.use(authenticate, authorize('ADMIN', 'SUBADMIN'));

const clean = (data) => {
  const patch = { ...data };
  ['logoUrl', 'description', 'website'].forEach((k) => {
    if (patch[k] === '') patch[k] = null;
  });
  if (data.name) patch.slug = slugify(data.name, { lower: true, strict: true });
  return patch;
};

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = bodySchema.parse(req.body);
    const dev = await prisma.developer.create({ data: clean(data) });
    return created(res, dev);
  })
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = bodySchema.partial().parse(req.body);
    const dev = await prisma.developer.update({ where: { id: req.params.id }, data: clean(data) });
    // keep the denormalised name on projects in sync
    if (data.name) {
      await prisma.project.updateMany({ where: { developerId: dev.id }, data: { builder: dev.name } });
    }
    return ok(res, dev);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await prisma.developer.delete({ where: { id: req.params.id } });
    return ok(res, { deleted: true });
  })
);

// Bulk reorder: [{id, sortOrder}]
router.patch(
  '/',
  asyncHandler(async (req, res) => {
    const rows = z.array(z.object({ id: z.string(), sortOrder: z.number().int() })).parse(req.body);
    await prisma.$transaction(rows.map((r) => prisma.developer.update({ where: { id: r.id }, data: { sortOrder: r.sortOrder } })));
    return ok(res, { updated: rows.length });
  })
);

module.exports = router;
