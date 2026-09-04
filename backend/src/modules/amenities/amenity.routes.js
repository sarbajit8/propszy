const { Router } = require('express');
const { z } = require('zod');
const { prisma } = require('../../config/prisma');
const { authenticate, authorize } = require('../../middleware/auth');
const { asyncHandler, ok, created } = require('../../utils/http');

const router = Router();

const bodySchema = z.object({
  name: z.string().min(1).max(120),
  icon: z.string().max(120).optional(),
  category: z.string().max(80).optional(),
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const rows = await prisma.amenity.findMany({ orderBy: { name: 'asc' } });
    return ok(res, rows);
  })
);

router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'SUBADMIN'),
  asyncHandler(async (req, res) => {
    const data = bodySchema.parse(req.body);
    const amenity = await prisma.amenity.create({ data });
    return created(res, amenity);
  })
);

router.patch(
  '/:id',
  authenticate,
  authorize('ADMIN', 'SUBADMIN'),
  asyncHandler(async (req, res) => {
    const data = bodySchema.partial().parse(req.body);
    const amenity = await prisma.amenity.update({ where: { id: req.params.id }, data });
    return ok(res, amenity);
  })
);

router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  asyncHandler(async (req, res) => {
    await prisma.amenity.delete({ where: { id: req.params.id } });
    return ok(res, { deleted: true });
  })
);

module.exports = router;
