const { z } = require('zod');
const { prisma } = require('../../config/prisma');
const { asyncHandler, ok, parsePagination, pageMeta } = require('../../utils/http');
const { ApiError } = require('../../utils/ApiError');
const { sum } = require('../../utils/money');
const { notify } = require('../../services/notify');
const { downlineIds } = require('../leads/lead.service');

const round = (n) => Number(Number(n || 0).toFixed(2));

const cInclude = {
  lead: { select: { id: true, code: true } },
  project: { select: { id: true, name: true } },
  agent: { select: { id: true, name: true, referralCode: true } },
};

// GET /commissions  — role-scoped ledger
const listCommissions = asyncHandler(async (req, res) => {
  const { page, limit, skip, take } = parsePagination(req.query, { defaultLimit: 25 });
  const where = {};
  if (req.query.status) where.status = req.query.status;
  if (req.query.projectId) where.projectId = req.query.projectId;
  if (req.query.agentId) where.agentId = req.query.agentId;

  if (req.user.role === 'AGENT') {
    if (req.query.scope === 'downline') {
      const ids = await downlineIds(req.user.id);
      where.agentId = { in: [req.user.id, ...ids] };
    } else {
      where.agentId = req.user.id;
    }
  }

  const [rows, total, agg] = await Promise.all([
    prisma.commission.findMany({ where, include: cInclude, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.commission.count({ where }),
    prisma.commission.groupBy({ by: ['status'], where, _sum: { amount: true } }),
  ]);

  const totals = agg.reduce((acc, r) => ({ ...acc, [r.status]: Number(r._sum.amount || 0) }), {});
  return ok(res, rows, { ...pageMeta(page, limit, total), totals });
});

// GET /commissions/summary — earnings dashboard payload for the current agent
const mySummary = asyncHandler(async (req, res) => {
  const agentId = req.query.agentId && req.user.role !== 'AGENT' ? req.query.agentId : req.user.id;
  const where = { agentId };

  const [levelRows, statusRows, levels, converted, monthlyRaw] = await Promise.all([
    prisma.commission.groupBy({ by: ['level', 'status'], where, _sum: { amount: true }, _count: true }),
    prisma.commission.groupBy({ by: ['status'], where, _sum: { amount: true }, _count: true }),
    prisma.mlmLevelConfig.findMany({ orderBy: { level: 'asc' } }),
    prisma.lead.count({ where: { agentId, statusKey: 'CONVERTED' } }),
    prisma.$queryRaw`
      SELECT DATE_FORMAT(createdAt, '%Y-%m') AS ym,
             SUM(CASE WHEN status <> 'REVERSED' THEN amount ELSE 0 END) AS earned,
             SUM(CASE WHEN status = 'PAID' THEN amount ELSE 0 END) AS paid
      FROM \`Commission\`
      WHERE agentId = ${agentId} AND createdAt >= (CURRENT_DATE - INTERVAL 11 MONTH)
      GROUP BY ym ORDER BY ym`,
  ]);

  // level-wise
  const byLevel = {};
  for (const r of levelRows) {
    byLevel[r.level] = byLevel[r.level] || { level: r.level, total: 0, pending: 0, approved: 0, paid: 0, reversed: 0, count: 0 };
    byLevel[r.level][r.status.toLowerCase()] = Number(r._sum.amount || 0);
    byLevel[r.level].total += Number(r._sum.amount || 0);
    byLevel[r.level].count += r._count;
  }

  // totals by status
  const totals = { pending: 0, approved: 0, paid: 0, reversed: 0 };
  for (const r of statusRows) totals[r.status.toLowerCase()] = Number(r._sum.amount || 0);
  totals.lifetime = totals.pending + totals.approved + totals.paid;
  totals.nextPayout = totals.approved; // APPROVED and not yet paid

  // last 12 months, zero-filled
  const map = new Map(monthlyRaw.map((m) => [m.ym, { earned: Number(m.earned || 0), paid: Number(m.paid || 0) }]));
  const monthly = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('en-IN', { month: 'short' });
    monthly.push({ month: label, ym, ...(map.get(ym) || { earned: 0, paid: 0 }) });
  }

  return ok(res, {
    levels,
    breakdown: Object.values(byLevel).sort((a, b) => a.level - b.level),
    totals,
    monthly,
    conversions: converted,
  });
});

// GET /commissions/rates — the commission ladder for every listed unit (agent view)
const commissionRates = asyncHandler(async (req, res) => {
  const { page, limit, skip, take } = parsePagination(req.query, { defaultLimit: 18 });

  const projectWhere = { isPublished: true };
  if (req.query.city) projectWhere.city = req.query.city;
  if (req.query.type) projectWhere.type = req.query.type;

  const where = { project: projectWhere };
  if (req.query.projectId) where.projectId = req.query.projectId;
  if (req.query.q) {
    where.OR = [
      { unitType: { contains: req.query.q } },
      { project: { ...projectWhere, name: { contains: req.query.q } } },
    ];
  }

  const [rows, total, globalLevels] = await Promise.all([
    prisma.property.findMany({
      where,
      include: { project: { select: { id: true, name: true, slug: true, city: true, type: true, priceMin: true, commissionBaseType: true, commissionBaseValue: true } } },
      orderBy: [{ project: { isFeatured: 'desc' } }, { createdAt: 'desc' }],
      skip, take,
    }),
    prisma.property.count({ where }),
    prisma.mlmLevelConfig.findMany({ where: { isActive: true }, orderBy: { level: 'asc' } }),
  ]);

  const data = rows.map((p) => {
    const proj = p.project;
    const sale = Number(p.price) || Number(proj.priceMin) || 0;
    const s = p.commissionScheme;
    let scheme;

    if (s && s.enabled && Array.isArray(s.levels) && s.levels.length) {
      const pool = s.poolType === 'FLAT' ? Number(s.poolValue || 0) : round((sale * Number(s.poolValue || 0)) / 100);
      scheme = {
        source: 'property',
        poolType: s.poolType,
        poolValue: Number(s.poolValue || 0),
        pool,
        levels: s.levels
          .map((l) => ({ level: Number(l.level), percent: Number(l.percent), amount: round((pool * Number(l.percent || 0)) / 100) }))
          .sort((a, b) => a.level - b.level),
      };
    } else {
      const pool = proj.commissionBaseType === 'FLAT'
        ? Number(proj.commissionBaseValue || 0)
        : round((sale * Number(proj.commissionBaseValue || 0)) / 100);
      scheme = {
        source: 'project',
        poolType: proj.commissionBaseType,
        poolValue: Number(proj.commissionBaseValue || 0),
        pool,
        levels: globalLevels.map((l) => ({
          level: l.level,
          percent: l.rateType === 'PERCENT' ? Number(l.rateValue) : null,
          amount: round(l.rateType === 'PERCENT' ? (pool * Number(l.rateValue)) / 100 : Number(l.rateValue)),
        })),
      };
    }

    return {
      id: p.id,
      unitType: p.unitType,
      price: p.price,
      status: p.status,
      bedrooms: p.bedrooms,
      carpetArea: p.carpetArea,
      project: { id: proj.id, name: proj.name, slug: proj.slug, city: proj.city, type: proj.type },
      sale,
      scheme,
    };
  });

  return ok(res, data, pageMeta(page, limit, total));
});

// PATCH /commissions/:id/status  — admin approves / reverses a single entry
const setStatus = asyncHandler(async (req, res) => {
  const { status, note } = z
    .object({ status: z.enum(['PENDING', 'APPROVED', 'PAID', 'REVERSED']), note: z.string().optional() })
    .parse(req.body);
  const commission = await prisma.commission.update({
    where: { id: req.params.id },
    data: { status, note },
  });
  return ok(res, commission);
});

// POST /commissions/payouts — bundle APPROVED commissions for an agent into a payout
const createPayout = asyncHandler(async (req, res) => {
  const { agentId, commissionIds, method, reference, note } = z
    .object({
      agentId: z.string(),
      commissionIds: z.array(z.string()).min(1),
      method: z.string().optional(),
      reference: z.string().optional(),
      note: z.string().optional(),
    })
    .parse(req.body);

  const commissions = await prisma.commission.findMany({
    where: { id: { in: commissionIds }, agentId, status: 'APPROVED', payoutId: null },
  });
  if (commissions.length !== commissionIds.length) {
    throw ApiError.badRequest('Some commissions are not APPROVED, already paid, or belong to another agent');
  }
  const amount = sum(commissions.map((c) => c.amount));

  const payout = await prisma.$transaction(async (tx) => {
    const p = await tx.payout.create({
      data: { agentId, amount, method, reference, note, status: 'INITIATED', processedById: req.user.id },
    });
    await tx.commission.updateMany({
      where: { id: { in: commissionIds } },
      data: { payoutId: p.id, status: 'PAID' },
    });
    return p;
  });

  notify(agentId, {
    type: 'payout.created',
    title: `Payout initiated: ₹${amount.toLocaleString('en-IN')}`,
    body: `${commissions.length} commission entries bundled for payout.`,
  }).catch(() => {});

  return ok(res, payout);
});

const markPayoutPaid = asyncHandler(async (req, res) => {
  const payout = await prisma.payout.update({
    where: { id: req.params.id },
    data: { status: 'PAID', paidAt: new Date() },
  });
  return ok(res, payout);
});

const listPayouts = asyncHandler(async (req, res) => {
  const where = req.user.role === 'AGENT' ? { agentId: req.user.id } : {};
  if (req.query.agentId && req.user.role !== 'AGENT') where.agentId = req.query.agentId;
  const rows = await prisma.payout.findMany({
    where,
    include: { agent: { select: { id: true, name: true } }, _count: { select: { commissions: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return ok(res, rows);
});

module.exports = {
  listCommissions,
  mySummary,
  commissionRates,
  setStatus,
  createPayout,
  markPayoutPaid,
  listPayouts,
};
