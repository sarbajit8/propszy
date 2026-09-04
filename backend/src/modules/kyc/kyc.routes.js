const { Router } = require('express');
const { z } = require('zod');
const { prisma } = require('../../config/prisma');
const { authenticate, authorize } = require('../../middleware/auth');
const { uploader } = require('../../middleware/upload');
const { asyncHandler, ok, created, parsePagination, pageMeta } = require('../../utils/http');
const { ApiError } = require('../../utils/ApiError');
const { storage } = require('../../services/storage');
const { notify } = require('../../services/notify');

const router = Router();
router.use(authenticate);

const DOC_TYPES = ['PAN', 'AADHAAR', 'ID_PROOF', 'ADDRESS_PROOF', 'BANK_PROOF', 'PHOTO'];
const REQUIRED_DOCS = ['PAN', 'PHOTO', 'ADDRESS_PROOF', 'BANK_PROOF'];

const profileSchema = z.object({
  legalName: z.string().min(3).max(120),
  dob: z.string().optional().or(z.literal('')),
  panNumber: z.string().min(10).max(10),
  aadhaarNumber: z.string().max(20).optional().or(z.literal('')),
  addressLine: z.string().min(5).max(300),
  city: z.string().min(2).max(80),
  state: z.string().max(80).optional().or(z.literal('')),
  pincode: z.string().min(4).max(10),
  agencyName: z.string().max(160).optional().or(z.literal('')),
  experienceYears: z.coerce.number().int().min(0).max(60).optional(),
}).passthrough();

function profileComplete(p) {
  return !!(p && p.legalName && p.panNumber && p.addressLine && p.city && p.pincode);
}

async function kycState(userId) {
  const [documents, bankDetail, user] = await Promise.all([
    prisma.kycDocument.findMany({ where: { agentId: userId }, orderBy: { createdAt: 'desc' } }),
    prisma.bankDetail.findUnique({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { kycStatus: true, kycProfile: true, kycSubmittedAt: true } }),
  ]);

  // latest doc per type
  const byType = {};
  for (const d of documents) if (!byType[d.docType]) byType[d.docType] = d;

  const checklist = {
    profile: profileComplete(user.kycProfile),
    bank: !!bankDetail,
    documents: REQUIRED_DOCS.map((type) => ({
      type,
      uploaded: !!byType[type],
      status: byType[type]?.status || null,
      remarks: byType[type]?.remarks || null,
    })),
  };
  checklist.docsDone = checklist.documents.every((d) => d.uploaded);
  checklist.allDone = checklist.profile && checklist.bank && checklist.docsDone;
  checklist.canSubmit = checklist.allDone && ['NOT_SUBMITTED', 'REJECTED'].includes(user.kycStatus);

  return {
    status: user.kycStatus,
    submittedAt: user.kycSubmittedAt,
    profile: user.kycProfile || null,
    requiredDocs: REQUIRED_DOCS,
    documents,
    bankDetail,
    checklist,
  };
}

// GET /kyc/me
router.get('/me', authorize('AGENT', 'ADMIN'), asyncHandler(async (req, res) => ok(res, await kycState(req.user.id))));

// PUT /kyc/profile
router.put('/profile', authorize('AGENT', 'ADMIN'), asyncHandler(async (req, res) => {
  const data = profileSchema.parse(req.body);
  await prisma.user.update({ where: { id: req.user.id }, data: { kycProfile: data } });
  return ok(res, await kycState(req.user.id));
}));

// POST /kyc/documents (multipart: file)
router.post(
  '/documents',
  authorize('AGENT'),
  uploader('any').single('file'),
  asyncHandler(async (req, res) => {
    const { docType, number } = z
      .object({ docType: z.enum(DOC_TYPES), number: z.string().max(40).optional() })
      .parse(req.body);
    if (!req.file) throw ApiError.badRequest('File is required');

    const saved = await storage.save(req.file, `kyc/${req.user.id}`);
    // replace any previous doc of this type (keep history minimal)
    await prisma.kycDocument.deleteMany({ where: { agentId: req.user.id, docType } });
    const doc = await prisma.kycDocument.create({
      data: { agentId: req.user.id, docType, number: number || null, fileUrl: saved.url, status: 'PENDING' },
    });
    return created(res, doc);
  })
);

// DELETE /kyc/documents/:id
router.delete('/documents/:id', authorize('AGENT'), asyncHandler(async (req, res) => {
  const doc = await prisma.kycDocument.findFirst({ where: { id: req.params.id, agentId: req.user.id } });
  if (!doc) throw ApiError.notFound('Document not found');
  await prisma.kycDocument.delete({ where: { id: doc.id } });
  return ok(res, { deleted: true });
}));

// PUT /kyc/bank
router.put('/bank', authorize('AGENT', 'ADMIN'), asyncHandler(async (req, res) => {
  const data = z
    .object({
      accountName: z.string().min(2),
      accountNumber: z.string().min(6).max(30),
      ifsc: z.string().min(6).max(15),
      bankName: z.string().optional().or(z.literal('')),
      branch: z.string().optional().or(z.literal('')),
      upiId: z.string().optional().or(z.literal('')),
    })
    .parse(req.body);
  const bank = await prisma.bankDetail.upsert({
    where: { userId: req.user.id },
    update: data,
    create: { ...data, userId: req.user.id },
  });
  return ok(res, bank);
}));

// POST /kyc/submit — lock it in for admin review
router.post('/submit', authorize('AGENT'), asyncHandler(async (req, res) => {
  const state = await kycState(req.user.id);
  if (state.status === 'APPROVED') throw ApiError.badRequest('Your KYC is already approved');
  if (state.status === 'PENDING') throw ApiError.badRequest('Your KYC is already under review');
  if (!state.checklist.profile) throw ApiError.badRequest('Complete your personal & PAN details first');
  if (!state.checklist.bank) throw ApiError.badRequest('Add your payout bank details first');
  if (!state.checklist.docsDone) throw ApiError.badRequest('Upload all required documents first');

  await prisma.user.update({ where: { id: req.user.id }, data: { kycStatus: 'PENDING', kycSubmittedAt: new Date() } });

  const admins = await prisma.user.findMany({ where: { role: { in: ['ADMIN', 'SUBADMIN'] } }, select: { id: true } });
  admins.forEach((a) =>
    notify(a.id, { type: 'kyc.submitted', title: 'KYC submitted for review', body: `${req.user.name} submitted their KYC.`, email: false }).catch(() => {})
  );

  return ok(res, await kycState(req.user.id));
}));

// ── Admin review ──────────────────────────────────────────
router.get('/', authorize('ADMIN', 'SUBADMIN'), asyncHandler(async (req, res) => {
  const { page, limit, skip, take } = parsePagination(req.query, { defaultLimit: 20 });
  const where = req.query.status ? { status: req.query.status } : {};
  const [rows, total] = await Promise.all([
    prisma.kycDocument.findMany({
      where,
      include: { agent: { select: { id: true, name: true, email: true, referralCode: true, kycStatus: true, kycProfile: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.kycDocument.count({ where }),
  ]);
  return ok(res, rows, pageMeta(page, limit, total));
}));

// GET /kyc/agents/:id — admin views one agent's full KYC
router.get('/agents/:id', authorize('ADMIN', 'SUBADMIN'), asyncHandler(async (req, res) => {
  const agent = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: { id: true, name: true, email: true, phone: true, referralCode: true, kycStatus: true, kycProfile: true, kycSubmittedAt: true },
  });
  if (!agent) throw ApiError.notFound('Agent not found');
  const [documents, bankDetail] = await Promise.all([
    prisma.kycDocument.findMany({ where: { agentId: agent.id }, orderBy: { createdAt: 'desc' } }),
    prisma.bankDetail.findUnique({ where: { userId: agent.id } }),
  ]);
  return ok(res, { agent, documents, bankDetail });
}));

router.patch('/documents/:id/review', authorize('ADMIN', 'SUBADMIN'), asyncHandler(async (req, res) => {
  const { status, remarks } = z
    .object({ status: z.enum(['APPROVED', 'REJECTED']), remarks: z.string().max(500).optional() })
    .parse(req.body);

  const doc = await prisma.kycDocument.update({
    where: { id: req.params.id },
    data: { status, remarks: remarks || null, reviewedById: req.user.id, reviewedAt: new Date() },
  });

  const docs = await prisma.kycDocument.findMany({ where: { agentId: doc.agentId } });
  const anyRejected = docs.some((d) => d.status === 'REJECTED');
  const required = REQUIRED_DOCS.every((t) => docs.some((d) => d.docType === t && d.status === 'APPROVED'));
  const nextStatus = anyRejected ? 'REJECTED' : required ? 'APPROVED' : 'PENDING';
  await prisma.user.update({ where: { id: doc.agentId }, data: { kycStatus: nextStatus } });

  notify(doc.agentId, {
    type: 'kyc.review',
    title: `KYC ${doc.docType} ${status.toLowerCase()}`,
    body: remarks || `Your ${doc.docType} document was ${status.toLowerCase()}.`
      + (nextStatus === 'APPROVED' ? ' Your KYC is now approved — you can start earning.' : ''),
  }).catch(() => {});

  return ok(res, { document: doc, agentKycStatus: nextStatus });
}));

// PATCH /kyc/agents/:id/status — admin sets overall status directly (approve/reject all)
router.patch('/agents/:id/status', authorize('ADMIN', 'SUBADMIN'), asyncHandler(async (req, res) => {
  const { status, remarks } = z
    .object({ status: z.enum(['APPROVED', 'REJECTED', 'PENDING', 'NOT_SUBMITTED']), remarks: z.string().max(500).optional() })
    .parse(req.body);
  await prisma.user.update({ where: { id: req.params.id }, data: { kycStatus: status } });
  if (status === 'APPROVED' || status === 'REJECTED') {
    await prisma.kycDocument.updateMany({
      where: { agentId: req.params.id },
      data: { status, remarks: remarks || null, reviewedById: req.user.id, reviewedAt: new Date() },
    });
  }
  notify(req.params.id, {
    type: 'kyc.review',
    title: `KYC ${status.toLowerCase().replace('_', ' ')}`,
    body: remarks || `An admin set your KYC status to ${status.toLowerCase().replace('_', ' ')}.`,
  }).catch(() => {});
  return ok(res, { status });
}));

module.exports = router;
