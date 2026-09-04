const { z } = require('zod');
const { prisma } = require('../../config/prisma');
const { asyncHandler, ok, created, parsePagination, pageMeta } = require('../../utils/http');
const { ApiError } = require('../../utils/ApiError');
const { hashPassword } = require('../../utils/tokens');
const { uniqueReferralCode } = require('../auth/auth.service');
const { notify } = require('../../services/notify');
const { buildTree, downlineStats, agentSelect, agentSales } = require('./agent.service');
const { downlineIds } = require('../leads/lead.service');

const { env } = require('../../config/env');

// POST /agents/apply — a logged-in CUSTOMER upgrades to a pending AGENT
const applyAsAgent = asyncHandler(async (req, res) => {
  const { referralCode } = z.object({ referralCode: z.string().optional() }).parse(req.body);
  if (req.user.role === 'AGENT') throw ApiError.badRequest('You are already an agent');
  if (!['CUSTOMER'].includes(req.user.role)) throw ApiError.forbidden();

  let sponsorAgentId = req.user.sponsorAgentId || null;
  if (!sponsorAgentId && referralCode) {
    const sponsor = await prisma.user.findUnique({ where: { referralCode } });
    if (sponsor && (sponsor.role === 'AGENT' || sponsor.role === 'ADMIN')) sponsorAgentId = sponsor.id;
  }

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      role: 'AGENT',
      kycStatus: 'NOT_SUBMITTED',
      referralCode: await uniqueReferralCode(),
      sponsorAgentId,
    },
  });

  const admins = await prisma.user.findMany({ where: { role: { in: ['ADMIN', 'SUBADMIN'] } }, select: { id: true } });
  admins.forEach((a) =>
    notify(a.id, { type: 'agent.apply', title: 'New agent application', body: `${user.name} applied to become an agent.`, email: false }).catch(() => {})
  );

  return ok(res, { id: user.id, role: user.role, kycStatus: user.kycStatus, referralCode: user.referralCode });
});

// POST /agents/recruit — an approved agent adds a sub-agent under themselves
const recruitSubAgent = asyncHandler(async (req, res) => {
  const data = z
    .object({
      name: z.string().min(2).max(120),
      email: z.string().email(),
      phone: z.string().min(7).max(20).optional(),
      password: z.string().min(8).max(72),
    })
    .parse(req.body);

  if (req.user.role !== 'AGENT' && req.user.role !== 'ADMIN') throw ApiError.forbidden();
  if (req.user.role === 'AGENT' && req.user.kycStatus !== 'APPROVED') {
    throw ApiError.forbidden('Your KYC must be approved before recruiting sub-agents');
  }

  const exists = await prisma.user.findFirst({ where: { OR: [{ email: data.email }, ...(data.phone ? [{ phone: data.phone }] : [])] } });
  if (exists) throw ApiError.conflict('A user with that email or phone already exists');

  const subAgent = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      passwordHash: await hashPassword(data.password),
      role: 'AGENT',
      kycStatus: 'NOT_SUBMITTED',
      referralCode: await uniqueReferralCode(),
      sponsorAgentId: req.user.id,
    },
    select: agentSelect,
  });

  notify(subAgent.id, {
    type: 'agent.welcome',
    title: 'Welcome to Propszy',
    body: `You have been added as an agent by ${req.user.name}. Complete your KYC to start earning.`,
  }).catch(() => {});

  return created(res, subAgent);
});

// GET /agents/me — agent's own dashboard payload
const myAgentProfile = asyncHandler(async (req, res) => {
  const id = req.user.id;
  const [me, stats, leadAgg, commissionAgg, directCount] = await Promise.all([
    prisma.user.findUnique({ where: { id }, select: { ...agentSelect, sponsorAgent: { select: { id: true, name: true, referralCode: true } } } }),
    downlineStats(id),
    prisma.lead.groupBy({ by: ['statusKey'], where: { agentId: id }, _count: true }),
    prisma.commission.groupBy({ by: ['status'], where: { agentId: id }, _sum: { amount: true } }),
    prisma.user.count({ where: { sponsorAgentId: id } }),
  ]);

  const referralLink = `${env.clientOrigin[0]}/register?ref=${me.referralCode}`;
  const earnings = commissionAgg.reduce((acc, r) => ({ ...acc, [r.status.toLowerCase()]: Number(r._sum.amount || 0) }), {});
  const leadsByStatus = leadAgg.reduce((acc, r) => ({ ...acc, [r.statusKey]: r._count }), {});

  return ok(res, {
    profile: me,
    referralCode: me.referralCode,
    referralLink,
    directRecruits: directCount,
    downline: stats,
    leadsByStatus,
    earnings,
  });
});

// GET /agents/me/tree
const myTree = asyncHandler(async (req, res) => {
  const tree = await buildTree(req.user.id, { maxDepth: Number(req.query.depth) || 6 });
  return ok(res, tree);
});

// GET /agents/:id/tree — admin
const agentTree = asyncHandler(async (req, res) => {
  const tree = await buildTree(req.params.id, { maxDepth: Number(req.query.depth) || 8 });
  if (!tree) throw ApiError.notFound('Agent not found');
  return ok(res, tree);
});

// GET /agents/downline/:id/sales — sold-property list for me or a downline agent
const downlineAgentSales = asyncHandler(async (req, res) => {
  const targetId = req.params.id;
  if (targetId !== req.user.id && req.user.role === 'AGENT') {
    const ids = await downlineIds(req.user.id);
    if (!ids.includes(targetId)) throw ApiError.forbidden('That agent is not in your network');
  }
  const data = await agentSales(targetId);
  if (!data.agent) throw ApiError.notFound('Agent not found');
  return ok(res, data);
});

// GET /agents — admin list
const listAgents = asyncHandler(async (req, res) => {
  const { page, limit, skip, take } = parsePagination(req.query, { defaultLimit: 20 });
  const where = {
    role: 'AGENT',
    ...(req.query.kycStatus ? { kycStatus: req.query.kycStatus } : {}),
    ...(req.query.q
      ? { OR: [{ name: { contains: req.query.q } }, { email: { contains: req.query.q } }, { referralCode: { contains: req.query.q } }] }
      : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { ...agentSelect, sponsorAgent: { select: { id: true, name: true } }, _count: { select: { downline: true, leadsAsAgent: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.user.count({ where }),
  ]);
  return ok(res, rows, pageMeta(page, limit, total));
});

// GET /agents/me/downline-leads
const downlineLeads = asyncHandler(async (req, res) => {
  const ids = await downlineIds(req.user.id);
  const { page, limit, skip, take } = parsePagination(req.query, { defaultLimit: 20 });
  const where = { agentId: { in: ids } };
  const [rows, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        agent: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.lead.count({ where }),
  ]);
  return ok(res, rows, pageMeta(page, limit, total));
});

module.exports = {
  applyAsAgent,
  recruitSubAgent,
  myAgentProfile,
  myTree,
  agentTree,
  downlineAgentSales,
  listAgents,
  downlineLeads,
};
