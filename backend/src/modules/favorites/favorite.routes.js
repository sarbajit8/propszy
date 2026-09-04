const { Router } = require('express');
const { z } = require('zod');
const { prisma } = require('../../config/prisma');
const { authenticate } = require('../../middleware/auth');
const { asyncHandler, ok, created } = require('../../utils/http');
const { ApiError } = require('../../utils/ApiError');

const router = Router();
router.use(authenticate);

const bodySchema = z
  .object({ projectId: z.string().optional(), propertyId: z.string().optional() })
  .refine((d) => d.projectId || d.propertyId, 'Provide projectId or propertyId');

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const rows = await prisma.favorite.findMany({
      where: { userId: req.user.id },
      include: {
        project: { include: { media: { where: { kind: 'IMAGE' }, take: 1 } } },
        property: { include: { project: { select: { id: true, name: true, slug: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return ok(res, rows);
  })
);

router.post(
  '/toggle',
  asyncHandler(async (req, res) => {
    const { projectId, propertyId } = bodySchema.parse(req.body);
    const where = { userId: req.user.id, projectId: projectId || null, propertyId: propertyId || null };
    const existing = await prisma.favorite.findFirst({ where });
    if (existing) {
      await prisma.favorite.delete({ where: { id: existing.id } });
      return ok(res, { favorited: false });
    }
    await prisma.favorite.create({ data: where });
    return created(res, { favorited: true });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const fav = await prisma.favorite.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!fav) throw ApiError.notFound();
    await prisma.favorite.delete({ where: { id: fav.id } });
    return ok(res, { deleted: true });
  })
);

module.exports = router;
