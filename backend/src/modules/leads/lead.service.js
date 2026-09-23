const { customAlphabet } = require('nanoid');
const { prisma } = require('../../config/prisma');
const { ApiError } = require('../../utils/ApiError');
const { notify } = require('../../services/notify');

const num = customAlphabet('0123456789', 6);
const leadCode = () => `LD-${new Date().getFullYear()}-${num()}`;

const leadInclude = {
  project: { select: { id: true, name: true, slug: true, city: true } },
  property: { select: { id: true, unitType: true } },
  agent: { select: { id: true, name: true, referralCode: true } },
  assignedTo: { select: { id: true, name: true } },
  user: { select: { id: true, name: true, email: true, phone: true } },
};

async function createLead(input, { actor } = {}) {
  let project = null;
  if (input.projectId) {
    project = await prisma.project.findUnique({ where: { id: input.projectId } });
    if (!project) throw ApiError.badRequest('Selected project not found');
  }
  if (input.propertyId) {
    const property = await prisma.property.findUnique({ where: { id: input.propertyId }, select: { id: true, projectId: true } });
    if (!property) throw ApiError.badRequest('Selected property not found');
    // keep project consistent with the chosen unit
    if (!input.projectId) {
      input.projectId = property.projectId;
      project = await prisma.project.findUnique({ where: { id: property.projectId } });
    }
  }

  let agentId = input.agentId || null;
  // resolve agent by referral code if provided
  if (!agentId && input.referralCode) {
    const agent = await prisma.user.findUnique({ where: { referralCode: input.referralCode } });
    if (agent && (agent.role === 'AGENT' || agent.role === 'ADMIN')) agentId = agent.id;
  }
  // an agent creating their own lead
  if (!agentId && actor?.role === 'AGENT') agentId = actor.id;

  const source =
    actor?.role === 'AGENT' ? 'AGENT' : actor?.role === 'ADMIN' || actor?.role === 'SUBADMIN' ? 'ADMIN' : 'WEBSITE';

  const lead = await prisma.lead.create({
    data: {
      code: leadCode(),
      projectId: input.projectId || null,
      propertyId: input.propertyId || null,
      agentId,
      userId: input.userId || (actor ? actor.id : null),
      guestName: input.name || null,
      guestPhone: input.phone || null,
      guestEmail: input.email || null,
      guestAadhaar: input.aadhaar || null,
      guestPan: input.pan || null,
      // a logged-in user's phone is already verified on their account; a
      // guest lead starts unverified and is upgraded once they complete OTP
      guestPhoneVerified: !!actor,
      purpose: input.purpose || null,
      preferredCity: input.preferredCity || null,
      preferredArea: input.preferredArea || null,
      requirement: input.requirement || null,
      bedroomsWanted: input.bedroomsWanted ?? null,
      budgetMin: input.budgetMin ?? null,
      budgetMax: input.budgetMax ?? null,
      message: input.message || null,
      source,
      status: 'NEW',
      statusKey: 'NEW',
      statusEvents: { create: { toStatus: 'NEW', changedById: actor?.id || null, note: 'Lead created' } },
    },
    include: leadInclude,
  });

  // notify sourcing agent + all admins
  if (agentId) {
    notify(agentId, {
      type: 'lead.new',
      title: 'New lead assigned to you',
      body: `${lead.guestName || 'A customer'} enquired about ${project ? project.name : (lead.preferredCity || "a property")}.`,
    }).catch(() => {});
  }
  const admins = await prisma.user.findMany({ where: { role: { in: ['ADMIN', 'SUBADMIN'] } }, select: { id: true } });
  admins.forEach((a) =>
    notify(a.id, { type: 'lead.new', title: 'New lead', body: `New enquiry${project ? " for " + project.name : ""}`, email: false }).catch(() => {})
  );

  return lead;
}

async function listLeads(query, { actor, skip, take }) {
  const where = {};
  if (query.status) where.statusKey = query.status;
  if (query.projectId) where.projectId = query.projectId;
  if (query.q) {
    where.OR = [
      { code: { contains: query.q } },
      { guestName: { contains: query.q } },
      { guestPhone: { contains: query.q } },
      { guestEmail: { contains: query.q } },
      { preferredCity: { contains: query.q } },
      { preferredArea: { contains: query.q } },
      { requirement: { contains: query.q } },
    ];
  }

  // scope by role
  if (actor.role === 'CUSTOMER') where.userId = actor.id;
  else if (actor.role === 'AGENT') {
    if (query.scope === 'downline') {
      const ids = await downlineIds(actor.id);
      where.agentId = { in: [actor.id, ...ids] };
    } else {
      where.agentId = actor.id;
    }
  }

  const [rows, total] = await Promise.all([
    prisma.lead.findMany({ where, include: leadInclude, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.lead.count({ where }),
  ]);
  return { rows, total };
}

async function getLead(id, { actor }) {
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      ...leadInclude,
      notes: { include: { author: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } },
      statusEvents: { orderBy: { createdAt: 'desc' } },
      followUps: { orderBy: { dueAt: 'asc' } },
      commissions: true,
    },
  });
  if (!lead) throw ApiError.notFound('Lead not found');

  if (actor.role === 'CUSTOMER' && lead.userId !== actor.id) throw ApiError.forbidden();
  if (actor.role === 'AGENT') {
    const ids = await downlineIds(actor.id);
    if (![actor.id, ...ids].includes(lead.agentId)) throw ApiError.forbidden();
  }
  return lead;
}

// walk the sponsor tree downward (children, grandchildren, …) up to a depth
async function downlineIds(rootId, maxDepth = 10) {
  const collected = [];
  let frontier = [rootId];
  for (let d = 0; d < maxDepth && frontier.length; d++) {
    const kids = await prisma.user.findMany({
      where: { sponsorAgentId: { in: frontier } },
      select: { id: true },
    });
    const ids = kids.map((k) => k.id);
    collected.push(...ids);
    frontier = ids;
  }
  return collected;
}

module.exports = { createLead, listLeads, getLead, downlineIds, leadInclude };
