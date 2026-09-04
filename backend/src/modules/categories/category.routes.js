const { Router } = require('express');
const { z } = require('zod');
const slugify = require('slugify');
const { prisma } = require('../../config/prisma');
const { optionalAuth, authenticate, authorize } = require('../../middleware/auth');
const { asyncHandler, ok, created } = require('../../utils/http');

const router = Router();

const bodySchema = z.object({
  name: z.string().min(1).max(120),
  parentId: z.string().nullable().optional(),
  icon: z.string().max(200).optional().or(z.literal('')),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

const clean = (data) => {
  const patch = { ...data };
  if (patch.icon === '') patch.icon = null;
  if (patch.parentId === '') patch.parentId = null;
  if (data.name) patch.slug = slugify(data.name, { lower: true, strict: true });
  return patch;
};

// Public — active taxonomy as a 2-level tree, with unit counts (published projects only).
router.get(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const staff = req.user && ['ADMIN', 'SUBADMIN'].includes(req.user.role);
    const rows = await prisma.unitCategory.findMany({
      where: staff ? {} : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    const counts = await prisma.property.groupBy({
      by: ['categoryId'],
      where: { categoryId: { not: null }, project: { isPublished: true } },
      _count: { _all: true },
    });
    const byId = Object.fromEntries(counts.map((c) => [c.categoryId, c._count._all]));

    const nodes = rows.map((r) => ({ ...r, unitCount: byId[r.id] || 0, children: [] }));
    const map = Object.fromEntries(nodes.map((n) => [n.id, n]));
    const tree = [];
    for (const n of nodes) {
      if (n.parentId && map[n.parentId]) map[n.parentId].children.push(n);
      else tree.push(n);
    }
    // roll child counts up into parents
    for (const p of tree) p.unitCount += p.children.reduce((a, c) => a + c.unitCount, 0);

    return ok(res, staff ? { tree, flat: nodes } : { tree });
  })
);

router.use(authenticate, authorize('ADMIN', 'SUBADMIN'));

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = bodySchema.parse(req.body);
    const row = await prisma.unitCategory.create({ data: clean(data) });
    return created(res, row);
  })
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = bodySchema.partial().parse(req.body);
    const row = await prisma.unitCategory.update({ where: { id: req.params.id }, data: clean(data) });
    return ok(res, row);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await prisma.unitCategory.delete({ where: { id: req.params.id } }); // children cascade, unit links SET NULL
    return ok(res, { deleted: true });
  })
);

router.patch(
  '/',
  asyncHandler(async (req, res) => {
    const rows = z.array(z.object({ id: z.string(), sortOrder: z.number().int() })).parse(req.body);
    await prisma.$transaction(rows.map((r) => prisma.unitCategory.update({ where: { id: r.id }, data: { sortOrder: r.sortOrder } })));
    return ok(res, { updated: rows.length });
  })
);

module.exports = router;
