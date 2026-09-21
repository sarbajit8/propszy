const { z } = require('zod');
const { prisma } = require('../../config/prisma');
const { ApiError } = require('../../utils/ApiError');
const { asyncHandler, ok, created } = require('../../utils/http');
const { storage } = require('../../services/storage');

const KIND_BY_MIME = (mime, hint) => {
  if (hint) return hint;
  if (mime === 'application/pdf') return 'BROCHURE';
  if (mime.startsWith('video/')) return 'VIDEO';
  return 'IMAGE';
};

const attachSchema = z.object({
  projectId: z.string().optional(),
  propertyId: z.string().optional(),
  kind: z.enum(['IMAGE', 'VIDEO', 'FLOOR_PLAN', 'MASTER_PLAN', 'BROCHURE', 'TOUR_360']).optional(),
  title: z.string().max(200).optional(),
});

const isStaff = (req) => req.user && ['ADMIN', 'SUBADMIN'].includes(req.user.role);

// A non-staff user may only attach/manage media on a property they created — never a project.
async function assertOwnsProperty(req, propertyId) {
  if (isStaff(req)) return;
  if (!propertyId) throw ApiError.forbidden('You do not have access to this resource');
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property || property.createdById !== req.user.id) throw ApiError.forbidden('You do not have access to this resource');
}

// POST /media/upload   (multipart: files[]) + body { projectId|propertyId, kind }
const upload = asyncHandler(async (req, res) => {
  const meta = attachSchema.parse(req.body);
  if (!meta.projectId && !meta.propertyId) {
    throw ApiError.badRequest('Provide projectId or propertyId');
  }
  await assertOwnsProperty(req, meta.propertyId);
  const files = req.files?.length ? req.files : req.file ? [req.file] : [];
  if (!files.length) throw ApiError.badRequest('No files uploaded');

  const folder = meta.projectId ? `projects/${meta.projectId}` : `properties/${meta.propertyId}`;
  const lastOrder = await prisma.media.aggregate({
    where: { projectId: meta.projectId || undefined, propertyId: meta.propertyId || undefined },
    _max: { sortOrder: true },
  });
  let order = (lastOrder._max.sortOrder ?? -1) + 1;

  const createdRows = [];
  for (const file of files) {
    const saved = await storage.save(file, folder);
    const row = await prisma.media.create({
      data: {
        kind: KIND_BY_MIME(file.mimetype, meta.kind),
        url: saved.url,
        title: meta.title || file.originalname,
        mimeType: file.mimetype,
        sizeBytes: saved.size,
        sortOrder: order++,
        projectId: meta.projectId || null,
        propertyId: meta.propertyId || null,
      },
    });
    createdRows.push({ ...row, key: saved.key });
  }
  return created(res, createdRows);
});

// PATCH /media/:id  { title?, kind?, sortOrder? }
const updateMedia = asyncHandler(async (req, res) => {
  const data = z
    .object({
      title: z.string().max(200).optional(),
      kind: z.enum(['IMAGE', 'VIDEO', 'FLOOR_PLAN', 'MASTER_PLAN', 'BROCHURE', 'TOUR_360']).optional(),
      sortOrder: z.coerce.number().int().optional(),
    })
    .parse(req.body);
  const existing = await prisma.media.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound('Media not found');
  await assertOwnsProperty(req, existing.propertyId);
  const media = await prisma.media.update({ where: { id: req.params.id }, data });
  return ok(res, media);
});

// PATCH /media/reorder  { ids: [] }  — applies index as sortOrder
const reorder = asyncHandler(async (req, res) => {
  const { ids } = z.object({ ids: z.array(z.string()).min(1) }).parse(req.body);
  if (!isStaff(req)) {
    const rows = await prisma.media.findMany({ where: { id: { in: ids } } });
    for (const row of rows) await assertOwnsProperty(req, row.propertyId);
  }
  await prisma.$transaction(
    ids.map((id, i) => prisma.media.update({ where: { id }, data: { sortOrder: i } }))
  );
  return ok(res, { reordered: ids.length });
});

const deleteMedia = asyncHandler(async (req, res) => {
  const media = await prisma.media.findUnique({ where: { id: req.params.id } });
  if (!media) throw ApiError.notFound('Media not found');
  await assertOwnsProperty(req, media.propertyId);
  await prisma.media.delete({ where: { id: media.id } });
  // best-effort blob cleanup for local driver
  const key = media.url.split('/uploads/')[1];
  if (key) storage.remove(key).catch(() => {});
  return ok(res, { deleted: true });
});

module.exports = { upload, updateMedia, reorder, deleteMedia };
