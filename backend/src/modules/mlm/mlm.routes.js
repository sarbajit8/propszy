const { Router } = require('express');
const { z } = require('zod');
const { prisma } = require('../../config/prisma');
const { authenticate, authorize } = require('../../middleware/auth');
const { asyncHandler, ok, created } = require('../../utils/http');

const router = Router();

const levelSchema = z.object({
  level: z.coerce.number().int().min(1).max(20),
  rateType: z.enum(['PERCENT', 'FLAT']),
  rateValue: z.coerce.number().min(0),
  label: z.string().max(120).optional(),
  isActive: z.boolean().optional(),
});

// Public-ish: agents need to see the rate table
router.get(
  '/levels',
  authenticate,
  asyncHandler(async (req, res) => {
    const rows = await prisma.mlmLevelConfig.findMany({ orderBy: { level: 'asc' } });
    return ok(res, rows);
  })
);

router.use(authenticate, authorize('ADMIN', 'SUBADMIN'));

router.post(
  '/levels',
  asyncHandler(async (req, res) => {
    const data = levelSchema.parse(req.body);
    const row = await prisma.mlmLevelConfig.upsert({
      where: { level: data.level },
      update: data,
      create: data,
    });
    return created(res, row);
  })
);

router.patch(
  '/levels/:level',
  asyncHandler(async (req, res) => {
    const data = levelSchema.partial().parse(req.body);
    const row = await prisma.mlmLevelConfig.update({
      where: { level: Number(req.params.level) },
      data,
    });
    return ok(res, row);
  })
);

router.delete(
  '/levels/:level',
  asyncHandler(async (req, res) => {
    await prisma.mlmLevelConfig.delete({ where: { level: Number(req.params.level) } });
    return ok(res, { deleted: true });
  })
);

// Global MLM settings (max depth, payout trigger status)
router.get(
  '/settings',
  asyncHandler(async (req, res) => {
    const s = await prisma.setting.findUnique({ where: { key: 'mlm' } });
    return ok(res, s?.value || { maxDepth: 3, payoutOnStatus: 'CONVERTED' });
  })
);

router.put(
  '/settings',
  asyncHandler(async (req, res) => {
    const value = z
      .object({ maxDepth: z.coerce.number().int().min(1).max(20), payoutOnStatus: z.string() })
      .parse(req.body);
    const s = await prisma.setting.upsert({
      where: { key: 'mlm' },
      update: { value },
      create: { key: 'mlm', value },
    });
    return ok(res, s.value);
  })
);

module.exports = router;
