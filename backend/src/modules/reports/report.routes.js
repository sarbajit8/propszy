const { Router } = require('express');
const { prisma } = require('../../config/prisma');
const { authenticate, authorize } = require('../../middleware/auth');
const { asyncHandler } = require('../../utils/http');

const router = Router();
router.use(authenticate, authorize('ADMIN', 'SUBADMIN'));

function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n');
}

function sendCsv(res, name, rows) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${name}-${Date.now()}.csv"`);
  res.send(toCsv(rows));
}

router.get(
  '/leads.csv',
  asyncHandler(async (req, res) => {
    const leads = await prisma.lead.findMany({
      include: { project: true, agent: true, assignedTo: true, user: true },
      orderBy: { createdAt: 'desc' },
    });
    sendCsv(
      res,
      'leads',
      leads.map((l) => ({
        code: l.code,
        project: l.project?.name,
        customer: l.user?.name || l.guestName,
        phone: l.guestPhone || l.user?.phone,
        email: l.guestEmail || l.user?.email,
        agent: l.agent?.name || '',
        assignedTo: l.assignedTo?.name || '',
        source: l.source,
        status: l.statusKey,
        saleValue: l.saleValue || '',
        createdAt: l.createdAt.toISOString(),
        convertedAt: l.convertedAt ? l.convertedAt.toISOString() : '',
      }))
    );
  })
);

router.get(
  '/commissions.csv',
  asyncHandler(async (req, res) => {
    const rows = await prisma.commission.findMany({
      include: { agent: true, project: true, lead: true },
      orderBy: { createdAt: 'desc' },
    });
    sendCsv(
      res,
      'commissions',
      rows.map((c) => ({
        lead: c.lead?.code,
        project: c.project?.name,
        agent: c.agent?.name,
        agentCode: c.agent?.referralCode || '',
        level: c.level,
        baseAmount: c.baseAmount,
        rate: `${c.rateValue}${c.rateType === 'PERCENT' ? '%' : ''}`,
        amount: c.amount,
        status: c.status,
        createdAt: c.createdAt.toISOString(),
      }))
    );
  })
);

router.get(
  '/projects.csv',
  asyncHandler(async (req, res) => {
    const rows = await prisma.project.findMany({
      include: { _count: { select: { properties: true, leads: true } } },
      orderBy: { createdAt: 'desc' },
    });
    sendCsv(
      res,
      'projects',
      rows.map((p) => ({
        name: p.name,
        builder: p.builder || '',
        city: p.city || '',
        type: p.type,
        status: p.status,
        priceMin: p.priceMin || '',
        priceMax: p.priceMax || '',
        units: p._count.properties,
        leads: p._count.leads,
        published: p.isPublished,
        commissionBase: `${p.commissionBaseValue}${p.commissionBaseType === 'PERCENT' ? '%' : ''}`,
      }))
    );
  })
);

module.exports = router;
