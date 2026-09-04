const { prisma } = require('../../config/prisma');

const agentSelect = {
  id: true, name: true, email: true, phone: true, role: true,
  referralCode: true, kycStatus: true, isActive: true, createdAt: true,
};

// per-agent performance for the tree nodes
async function agentStats(id) {
  const [leads, conv, direct] = await Promise.all([
    prisma.lead.count({ where: { agentId: id } }),
    prisma.lead.aggregate({ where: { agentId: id, statusKey: 'CONVERTED' }, _count: true, _sum: { saleValue: true } }),
    prisma.user.count({ where: { sponsorAgentId: id } }),
  ]);
  return {
    leads,
    sales: conv._count,
    salesValue: Number(conv._sum.saleValue || 0),
    directRecruits: direct,
  };
}

// Recursively build the downline org-chart (react-d3-tree) with per-node stats.
async function buildTree(rootId, { maxDepth = 6 } = {}) {
  const root = await prisma.user.findUnique({ where: { id: rootId }, select: agentSelect });
  if (!root) return null;

  async function attach(node, depth) {
    const stats = await agentStats(node.id);
    if (depth >= maxDepth) {
      return { name: node.name, id: node.id, attributes: nodeAttrs(node, stats), children: [] };
    }
    const kids = await prisma.user.findMany({
      where: { sponsorAgentId: node.id },
      select: agentSelect,
      orderBy: { createdAt: 'asc' },
    });
    const children = [];
    for (const k of kids) children.push(await attach(k, depth + 1));
    return { name: node.name, id: node.id, attributes: nodeAttrs(node, stats), children };
  }
  return attach(root, 0);
}

function nodeAttrs(node, stats) {
  return {
    code: node.referralCode || '—',
    kyc: node.kycStatus,
    joined: node.createdAt,
    email: node.email,
    phone: node.phone,
    leads: stats.leads,
    sales: stats.sales,
    salesValue: stats.salesValue,
    directRecruits: stats.directRecruits,
  };
}

// converted-lead ("sold property") list for one agent in my downline
async function agentSales(targetId) {
  const [agent, sales, leadCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, name: true, referralCode: true, kycStatus: true, email: true, phone: true },
    }),
    prisma.lead.findMany({
      where: { agentId: targetId, statusKey: 'CONVERTED' },
      select: {
        id: true, code: true, saleValue: true, convertedAt: true, guestName: true,
        project: { select: { id: true, name: true, city: true, slug: true } },
        property: { select: { id: true, unitType: true } },
      },
      orderBy: { convertedAt: 'desc' },
    }),
    prisma.lead.count({ where: { agentId: targetId } }),
  ]);
  const value = sales.reduce((a, s) => a + Number(s.saleValue || 0), 0);
  return { agent, sales, totals: { sales: sales.length, leads: leadCount, value } };
}

async function downlineStats(rootId) {
  // BFS counting per depth
  let frontier = [rootId];
  let total = 0;
  const perLevel = [];
  for (let level = 1; level <= 12 && frontier.length; level++) {
    const kids = await prisma.user.findMany({
      where: { sponsorAgentId: { in: frontier } },
      select: { id: true },
    });
    if (!kids.length) break;
    perLevel.push({ level, count: kids.length });
    total += kids.length;
    frontier = kids.map((k) => k.id);
  }
  return { total, perLevel };
}

module.exports = { buildTree, downlineStats, agentSelect, agentSales, agentStats };
