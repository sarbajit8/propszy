const { prisma } = require('../../config/prisma');
const { notify } = require('../../services/notify');
const { inr } = require('../../utils/money');

const money = (n) => Number(Number(n || 0).toFixed(2));

// Sale amount used as the base for PERCENT calculations.
function saleAmountOf(project, property, lead) {
  return (
    Number(lead.saleValue) ||
    Number(property?.price) ||
    Number(project?.priceMin) ||
    0
  );
}

// Project-wide commission base (used only when a property has no custom scheme).
function resolveBaseAmount(project, lead, property) {
  const value = Number(project.commissionBaseValue || 0);
  if (project.commissionBaseType === 'FLAT') return value;
  return money((saleAmountOf(project, property, lead) * value) / 100);
}

function computeAmount(baseAmount, level) {
  return level.rateType === 'PERCENT'
    ? (baseAmount * Number(level.rateValue)) / 100
    : Number(level.rateValue);
}

/**
 * Work out the commission pool + the per-level split for a conversion.
 * Priority:
 *   1. property.commissionScheme  (per-property: pool + level %s)
 *   2. project base + global MlmLevelConfig
 * Returns { source, pool, sale, levels: [{ level, rateType, rateValue, amount }] }
 */
async function resolveDistribution(project, property, lead) {
  const sale = saleAmountOf(project, property, lead);
  const scheme = property?.commissionScheme;

  if (scheme && scheme.enabled && Array.isArray(scheme.levels) && scheme.levels.length) {
    const pool = scheme.poolType === 'FLAT'
      ? Number(scheme.poolValue || 0)
      : money((sale * Number(scheme.poolValue || 0)) / 100);

    const levels = scheme.levels
      .filter((l) => l && l.level != null && l.percent != null)
      .map((l) => ({
        level: Number(l.level),
        rateType: 'PERCENT',
        rateValue: Number(l.percent),
        amount: money((pool * Number(l.percent)) / 100),
      }))
      .sort((a, b) => a.level - b.level);

    return { source: 'property', pool, sale, levels };
  }

  const cfgLevels = await prisma.mlmLevelConfig.findMany({
    where: { isActive: true },
    orderBy: { level: 'asc' },
  });
  if (!cfgLevels.length) return { source: 'none', pool: 0, sale, levels: [] };

  const pool = resolveBaseAmount(project, lead, property);
  const levels = cfgLevels.map((l) => ({
    level: l.level,
    rateType: l.rateType,
    rateValue: Number(l.rateValue),
    amount: money(computeAmount(pool, l)),
  }));
  return { source: 'project', pool, sale, levels };
}

/**
 * Build the sponsor chain for an agent:
 * level 1 = the agent, level 2 = their sponsor, level 3 = sponsor's sponsor, …
 */
async function sponsorChain(agentId, maxLevels) {
  const chain = [];
  let currentId = agentId;
  for (let level = 1; level <= maxLevels && currentId; level++) {
    const user = await prisma.user.findUnique({
      where: { id: currentId },
      select: { id: true, name: true, role: true, sponsorAgentId: true, kycStatus: true, isActive: true },
    });
    if (!user) break;
    chain.push({ level, user });
    currentId = user.sponsorAgentId;
  }
  return chain;
}

/**
 * Distribute commissions for a lead that has just become CONVERTED.
 * Idempotent: re-running upserts the same (leadId, agentId, level) rows.
 */
async function distributeForLead(leadId, { actorId } = {}) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { project: true, property: true },
  });
  if (!lead) throw new Error('Lead not found');
  if (!lead.agentId) return { skipped: 'no-agent', commissions: [] };
  if (!lead.project) return { skipped: 'no-project', commissions: [] };

  const dist = await resolveDistribution(lead.project, lead.property, lead);
  if (!dist.levels.length) return { skipped: 'no-level-config', commissions: [] };

  const maxLevel = Math.max(...dist.levels.map((l) => l.level));
  const defByLevel = new Map(dist.levels.map((d) => [d.level, d]));
  const chain = await sponsorChain(lead.agentId, maxLevel);

  const results = [];
  for (const { level, user } of chain) {
    const def = defByLevel.get(level);
    if (!def || !def.amount) continue;
    const eligible = user.isActive && (user.role === 'AGENT' || user.role === 'ADMIN');
    if (!eligible) continue;

    const commission = await prisma.commission.upsert({
      where: { leadId_agentId_level: { leadId: lead.id, agentId: user.id, level } },
      update: {
        baseAmount: dist.pool, rateType: def.rateType, rateValue: def.rateValue, amount: def.amount,
        status: 'PENDING', note: `Auto-credited on conversion of ${lead.code} (${dist.source} scheme)`,
      },
      create: {
        leadId: lead.id, agentId: user.id, projectId: lead.projectId, level,
        baseAmount: dist.pool, rateType: def.rateType, rateValue: def.rateValue, amount: def.amount,
        status: 'PENDING', note: `Auto-credited on conversion of ${lead.code} (${dist.source} scheme)`,
      },
    });
    results.push(commission);

    notify(user.id, {
      type: 'commission.credited',
      title: `Commission credited: ${inr(def.amount)}`,
      body: `Level ${level} commission for lead ${lead.code} (${lead.project.name}).`,
    }).catch(() => {});
  }

  return { source: dist.source, pool: dist.pool, sale: dist.sale, commissions: results, actorId };
}

// When a converted lead leaves the converted state, void its pending commissions.
async function reverseForLead(leadId) {
  const { count } = await prisma.commission.updateMany({
    where: { leadId, status: { in: ['PENDING', 'APPROVED'] } },
    data: { status: 'REVERSED', note: 'Reversed — lead left converted state' },
  });
  return { reversed: count };
}

// Preview a scheme without persisting anything (for the admin editor).
function previewScheme({ scheme, sale = 0, project }) {
  const property = { price: sale, commissionScheme: scheme };
  const fakeLead = { saleValue: sale };
  const s = scheme;
  if (s && s.enabled && Array.isArray(s.levels)) {
    const pool = s.poolType === 'FLAT' ? Number(s.poolValue || 0) : money((sale * Number(s.poolValue || 0)) / 100);
    const levels = s.levels.map((l) => ({ level: Number(l.level), percent: Number(l.percent), amount: money((pool * Number(l.percent || 0)) / 100) }));
    const distributed = levels.reduce((a, l) => a + l.amount, 0);
    return { pool, levels, distributed, remainder: money(pool - distributed), totalPercent: levels.reduce((a, l) => a + (l.percent || 0), 0) };
  }
  return null;
}

module.exports = {
  distributeForLead, reverseForLead, resolveBaseAmount, resolveDistribution, sponsorChain, previewScheme,
};
