const { z } = require('zod');
const { prisma } = require('../../config/prisma');
const { asyncHandler, ok, created, parsePagination, pageMeta } = require('../../utils/http');
const { ApiError } = require('../../utils/ApiError');
const { logActivity } = require('../../services/activity');
const { notify } = require('../../services/notify');
const svc = require('./lead.service');
const commissionSvc = require('../commissions/commission.service');

const blank = (s) => z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), s.optional());

const createSchema = z.object({
  // interest (both optional — a lead can be a location requirement only)
  projectId: blank(z.string().min(1)),
  propertyId: blank(z.string().min(1)),

  // customer
  name: blank(z.string().min(2).max(120)),
  phone: blank(z.string().min(7).max(20)),
  email: blank(z.string().email()),
  aadhaar: blank(z.string().min(4).max(20)),
  pan: blank(z.string().min(4).max(20)),

  // requirement
  purpose: blank(z.enum(['BUY', 'RENT', 'INVEST'])),
  preferredCity: blank(z.string().max(120)),
  preferredArea: blank(z.string().max(160)),
  requirement: blank(z.string().max(120)),
  bedroomsWanted: z.coerce.number().int().min(0).max(20).optional(),
  budgetMin: z.coerce.number().nonnegative().optional(),
  budgetMax: z.coerce.number().nonnegative().optional(),

  message: blank(z.string().max(2000)),
  referralCode: blank(z.string()),
  agentId: blank(z.string()),
});

const createLead = asyncHandler(async (req, res) => {
  const input = createSchema.parse(req.body);
  // a customer enquiring for themselves already has contact details on file;
  // everyone else (agent / admin / guest) must supply a phone or email
  const isSelfEnquiry = req.user?.role === 'CUSTOMER';
  if (!isSelfEnquiry && !input.phone && !input.email) {
    throw ApiError.badRequest('Add the customer’s mobile number or email');
  }
  const lead = await svc.createLead(input, { actor: req.user });
  logActivity(req, { action: 'lead.create', entityType: 'lead', entityId: lead.id });
  return created(res, lead);
});

const listLeads = asyncHandler(async (req, res) => {
  const { page, limit, skip, take } = parsePagination(req.query, { defaultLimit: 20 });
  const { rows, total } = await svc.listLeads(req.query, { actor: req.user, skip, take });
  return ok(res, rows, pageMeta(page, limit, total));
});

const getLead = asyncHandler(async (req, res) => {
  const lead = await svc.getLead(req.params.id, { actor: req.user });
  return ok(res, lead);
});

const addNote = asyncHandler(async (req, res) => {
  const { body } = z.object({ body: z.string().min(1).max(4000) }).parse(req.body);
  await svc.getLead(req.params.id, { actor: req.user }); // authz
  const note = await prisma.leadNote.create({
    data: { leadId: req.params.id, authorId: req.user.id, body },
    include: { author: { select: { id: true, name: true } } },
  });
  return created(res, note);
});

const updateStatusSchema = z.object({
  status: z.string().min(1),
  note: z.string().max(2000).optional(),
  saleValue: z.coerce.number().optional(),
});

// Staff-only: move a lead through the pipeline; triggers commission engine on conversion.
const updateStatus = asyncHandler(async (req, res) => {
  const { status, note, saleValue } = updateStatusSchema.parse(req.body);

  const cfg = await prisma.leadStatusConfig.findUnique({ where: { key: status } });
  if (!cfg || !cfg.isActive) throw ApiError.badRequest(`Unknown status: ${status}`);

  const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
  if (!lead) throw ApiError.notFound('Lead not found');
  if (lead.statusKey === status) return ok(res, { unchanged: true });

  const wasConverted = lead.statusKey === 'CONVERTED';

  const updated = await prisma.$transaction(async (tx) => {
    const l = await tx.lead.update({
      where: { id: lead.id },
      data: {
        status: ['NEW', 'CONTACTED', 'SITE_VISIT', 'NEGOTIATION', 'CONVERTED', 'DROPPED'].includes(status)
          ? status
          : lead.status,
        statusKey: status,
        ...(saleValue != null ? { saleValue } : {}),
        ...(cfg.isConversion ? { convertedAt: new Date() } : {}),
      },
    });
    await tx.leadStatusEvent.create({
      data: { leadId: lead.id, fromStatus: lead.statusKey, toStatus: status, changedById: req.user.id, note },
    });
    return l;
  });

  let commissionResult = null;
  if (cfg.isConversion && !wasConverted) {
    commissionResult = await commissionSvc.distributeForLead(lead.id, { actorId: req.user.id });
  } else if (wasConverted && !cfg.isConversion) {
    commissionResult = await commissionSvc.reverseForLead(lead.id);
  }

  if (updated.agentId) {
    notify(updated.agentId, {
      type: 'lead.status',
      title: `Lead ${updated.code} → ${cfg.label}`,
      body: note || `Status updated to ${cfg.label}.`,
      email: false,
    }).catch(() => {});
  }

  logActivity(req, { action: 'lead.status', entityType: 'lead', entityId: lead.id, metadata: { status } });
  return ok(res, { lead: updated, commission: commissionResult });
});

const assignSchema = z.object({ assignedToId: z.string().nullable() });
const assignLead = asyncHandler(async (req, res) => {
  const { assignedToId } = assignSchema.parse(req.body);
  const lead = await prisma.lead.update({ where: { id: req.params.id }, data: { assignedToId } });
  if (assignedToId) {
    notify(assignedToId, { type: 'lead.assigned', title: `Lead ${lead.code} assigned to you`, email: false }).catch(() => {});
  }
  return ok(res, lead);
});

const addFollowUp = asyncHandler(async (req, res) => {
  const data = z
    .object({ dueAt: z.coerce.date(), note: z.string().max(1000).optional(), assignedToId: z.string().optional() })
    .parse(req.body);
  const fu = await prisma.followUp.create({
    data: { leadId: req.params.id, assignedToId: data.assignedToId || req.user.id, dueAt: data.dueAt, note: data.note },
  });
  return created(res, fu);
});

module.exports = { createLead, listLeads, getLead, addNote, updateStatus, assignLead, addFollowUp };
