const { Router } = require('express');
const { prisma } = require('../../config/prisma');
const { authenticate, authorize } = require('../../middleware/auth');
const { asyncHandler, ok } = require('../../utils/http');
const { sum } = require('../../utils/money');

const router = Router();
router.use(authenticate, authorize('ADMIN', 'SUBADMIN'));

// GET /dashboard/stats
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const [
      projects, published, properties, leads, agents, customers,
      pendingKyc, converted, commissionAgg, leadsByStatus,
    ] = await Promise.all([
      prisma.project.count(),
      prisma.project.count({ where: { isPublished: true } }),
      prisma.property.count(),
      prisma.lead.count(),
      prisma.user.count({ where: { role: 'AGENT' } }),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.user.count({ where: { role: 'AGENT', kycStatus: 'PENDING' } }),
      prisma.lead.count({ where: { statusKey: 'CONVERTED' } }),
      prisma.commission.groupBy({ by: ['status'], _sum: { amount: true } }),
      prisma.lead.groupBy({ by: ['statusKey'], _count: true }),
    ]);

    const commissions = commissionAgg.reduce(
      (acc, r) => ({ ...acc, [r.status.toLowerCase()]: Number(r._sum.amount || 0) }),
      {}
    );
    commissions.total = sum(commissionAgg.map((r) => r._sum.amount));

    return ok(res, {
      projects: { total: projects, published },
      properties,
      leads: {
        total: leads,
        converted,
        conversionRate: leads ? +((converted / leads) * 100).toFixed(1) : 0,
        byStatus: leadsByStatus.reduce((a, r) => ({ ...a, [r.statusKey]: r._count }), {}),
      },
      users: { agents, customers, pendingKyc },
      commissions,
    });
  })
);

// GET /dashboard/leads-trend?days=30
router.get(
  '/leads-trend',
  asyncHandler(async (req, res) => {
    const days = Math.min(180, Math.max(7, Number(req.query.days) || 30));
    const since = new Date(Date.now() - days * 864e5);
    const leads = await prisma.lead.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, statusKey: true },
    });
    const buckets = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(since.getTime() + i * 864e5).toISOString().slice(0, 10);
      buckets[d] = { date: d, leads: 0, converted: 0 };
    }
    for (const l of leads) {
      const d = l.createdAt.toISOString().slice(0, 10);
      if (buckets[d]) {
        buckets[d].leads++;
        if (l.statusKey === 'CONVERTED') buckets[d].converted++;
      }
    }
    return ok(res, Object.values(buckets));
  })
);

module.exports = router;
