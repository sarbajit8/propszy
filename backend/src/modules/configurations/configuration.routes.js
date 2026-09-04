const { Router } = require('express');
const { z } = require('zod');
const slugify = require('slugify');
const { prisma } = require('../../config/prisma');
const { optionalAuth, authenticate, authorize } = require('../../middleware/auth');
const { asyncHandler, ok, created } = require('../../utils/http');
const { shapeConfiguration } = require('./configuration.service');

const router = Router();
const admin = [authenticate, authorize('ADMIN', 'SUBADMIN')];

const bodySchema = z.object({
  label: z.string().min(1).max(80),
  subtitle: z.string().max(160).optional().or(z.literal('')),
  imageUrl: z.string().optional().or(z.literal('')),
  icon: z.string().max(16).optional().or(z.literal('')),
  filterType: z.enum(['bedrooms', 'type', 'status', 'link']).default('bedrooms'),
  filterValue: z.string().max(200).optional().or(z.literal('')),
  isFeatured: z.coerce.boolean().optional(),
  isActive: z.coerce.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

const mkSlug = (label) => `${slugify(label, { lower: true, strict: true }) || 'config'}-${Math.random().toString(36).slice(2, 6)}`;

router.get(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const staff = req.user && ['ADMIN', 'SUBADMIN'].includes(req.user.role);
    const rows = await prisma.configuration.findMany({
      where: {
        ...(staff ? {} : { isActive: true }),
        ...(req.query.featured === 'true' ? { isFeatured: true } : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return ok(res, await Promise.all(rows.map((c) => shapeConfiguration(c))));
  })
);

router.post(
  '/',
  admin,
  asyncHandler(async (req, res) => {
    const d = bodySchema.parse(req.body);
    const row = await prisma.configuration.create({
      data: {
        ...d,
        subtitle: d.subtitle || null, imageUrl: d.imageUrl || null,
        icon: d.icon || null, filterValue: d.filterValue || null,
        slug: mkSlug(d.label),
      },
    });
    return created(res, await shapeConfiguration(row, { withCount: false }));
  })
);

router.patch(
  '/:id',
  admin,
  asyncHandler(async (req, res) => {
    const d = bodySchema.partial().parse(req.body);
    const patch = { ...d };
    ['subtitle', 'imageUrl', 'icon', 'filterValue'].forEach((k) => { if (d[k] === '') patch[k] = null; });
    if (d.label) patch.slug = mkSlug(d.label);
    const row = await prisma.configuration.update({ where: { id: req.params.id }, data: patch });
    return ok(res, await shapeConfiguration(row, { withCount: false }));
  })
);

// bulk reorder
router.patch(
  '/',
  admin,
  asyncHandler(async (req, res) => {
    const rows = z.array(z.object({ id: z.string(), sortOrder: z.number().int() })).parse(req.body);
    await prisma.$transaction(rows.map((r) => prisma.configuration.update({ where: { id: r.id }, data: { sortOrder: r.sortOrder } })));
    return ok(res, { updated: rows.length });
  })
);

router.delete(
  '/:id',
  admin,
  asyncHandler(async (req, res) => {
    await prisma.configuration.delete({ where: { id: req.params.id } });
    return ok(res, { deleted: true });
  })
);

module.exports = { router };
