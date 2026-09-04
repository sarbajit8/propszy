const { Router } = require('express');
const { prisma } = require('../../config/prisma');
const { authenticate } = require('../../middleware/auth');
const { asyncHandler, ok, parsePagination, pageMeta } = require('../../utils/http');

const router = Router();
router.use(authenticate);

// GET /me/activity — the current user's activity log
router.get(
  '/activity',
  asyncHandler(async (req, res) => {
    const { page, limit, skip, take } = parsePagination(req.query, { defaultLimit: 30 });
    const where = { userId: req.user.id };
    const [rows, total] = await Promise.all([
      prisma.activityLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.activityLog.count({ where }),
    ]);
    return ok(res, rows, pageMeta(page, limit, total));
  })
);

// GET /me/enquiries — leads raised by the current user
router.get(
  '/enquiries',
  asyncHandler(async (req, res) => {
    const { page, limit, skip, take } = parsePagination(req.query, { defaultLimit: 20 });
    const where = { userId: req.user.id };
    const [rows, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          project: { select: { id: true, name: true, slug: true, city: true } },
          property: { select: { id: true, unitType: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.lead.count({ where }),
    ]);
    return ok(res, rows, pageMeta(page, limit, total));
  })
);

// GET /me/notifications
router.get(
  '/notifications',
  asyncHandler(async (req, res) => {
    const rows = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const unread = rows.filter((n) => !n.readAt).length;
    return ok(res, { items: rows, unread });
  })
);

router.post(
  '/notifications/read',
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, readAt: null },
      data: { readAt: new Date() },
    });
    return ok(res, { ok: true });
  })
);

module.exports = router;
