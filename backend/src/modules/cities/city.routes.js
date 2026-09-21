const { Router } = require('express');
const { z } = require('zod');
const slugify = require('slugify');
const { prisma } = require('../../config/prisma');
const { optionalAuth, authenticate, authorize } = require('../../middleware/auth');
const { asyncHandler, ok, created } = require('../../utils/http');

const router = Router();

const bodySchema = z.object({
  name: z.string().min(1).max(120),
  state: z.string().max(120).optional(),
  country: z.string().max(80).optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  isActive: z.boolean().optional(),
  isPopular: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

// Public — active cities, with published-project counts.
router.get(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const staff = req.user && ['ADMIN', 'SUBADMIN'].includes(req.user.role);
    const cities = await prisma.city.findMany({
      where: staff ? {} : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    const counts = await prisma.project.groupBy({
      by: ['city'],
      where: { isPublished: true, city: { not: null } },
      _count: { _all: true },
    });
    const byCity = Object.fromEntries(counts.map((c) => [c.city, c._count._all]));
    return ok(res, cities.map((c) => ({ ...c, projectCount: byCity[c.name] || 0 })));
  })
);

router.use(authenticate, authorize('ADMIN', 'SUBADMIN'));

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = bodySchema.parse(req.body);
    const city = await prisma.city.create({
      data: { ...data, imageUrl: data.imageUrl || null, slug: slugify(data.name, { lower: true, strict: true }) },
    });
    return created(res, city);
  })
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = bodySchema.partial().parse(req.body);
    const patch = { ...data };
    if (data.imageUrl === '') patch.imageUrl = null;
    if (data.name) patch.slug = slugify(data.name, { lower: true, strict: true });
    const city = await prisma.city.update({ where: { id: req.params.id }, data: patch });
    return ok(res, city);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await prisma.city.delete({ where: { id: req.params.id } });
    return ok(res, { deleted: true });
  })
);

// Bulk reorder: [{id, sortOrder}]
router.patch(
  '/',
  asyncHandler(async (req, res) => {
    const rows = z.array(z.object({ id: z.string(), sortOrder: z.number().int() })).parse(req.body);
    await prisma.$transaction(rows.map((r) => prisma.city.update({ where: { id: r.id }, data: { sortOrder: r.sortOrder } })));
    return ok(res, { updated: rows.length });
  })
);

module.exports = router;
