const { Router } = require('express');
const { z } = require('zod');
const slugify = require('slugify');
const { prisma } = require('../../config/prisma');
const { optionalAuth, authenticate, authorize } = require('../../middleware/auth');
const { asyncHandler, ok, created } = require('../../utils/http');

const router = Router();
const admin = [authenticate, authorize('ADMIN', 'SUBADMIN')];

// ── Banners (home hero slider + strips) ──────────────────
const bannerBody = z.object({
  title: z.string().max(160).optional().or(z.literal('')),
  subtitle: z.string().max(300).optional().or(z.literal('')),
  imageUrl: z.string().min(1),
  linkUrl: z.string().optional().or(z.literal('')),
  ctaLabel: z.string().max(40).optional().or(z.literal('')),
  placement: z.string().default('home_hero'),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.coerce.boolean().default(true),
});

router.get(
  '/banners',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const staff = req.user && ['ADMIN', 'SUBADMIN'].includes(req.user.role);
    const where = {
      ...(staff ? {} : { isActive: true }),
      ...(req.query.placement ? { placement: req.query.placement } : {}),
    };
    return ok(res, await prisma.banner.findMany({ where, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }));
  })
);
router.post(
  '/banners',
  admin,
  asyncHandler(async (req, res) => {
    const d = bannerBody.parse(req.body);
    return created(res, await prisma.banner.create({
      data: {
        ...d,
        title: d.title || null, subtitle: d.subtitle || null,
        linkUrl: d.linkUrl || null, ctaLabel: d.ctaLabel || null,
      },
    }));
  })
);
router.patch('/banners/:id', admin, asyncHandler(async (req, res) => {
  const d = bannerBody.partial().parse(req.body);
  const patch = { ...d };
  ['title', 'subtitle', 'linkUrl', 'ctaLabel'].forEach((k) => { if (d[k] === '') patch[k] = null; });
  return ok(res, await prisma.banner.update({ where: { id: req.params.id }, data: patch }));
}));
// bulk reorder: [{ id, sortOrder }]
router.patch('/banners', admin, asyncHandler(async (req, res) => {
  const rows = z.array(z.object({ id: z.string(), sortOrder: z.number().int() })).parse(req.body);
  await prisma.$transaction(rows.map((r) => prisma.banner.update({ where: { id: r.id }, data: { sortOrder: r.sortOrder } })));
  return ok(res, { updated: rows.length });
}));
router.delete('/banners/:id', admin, asyncHandler(async (req, res) => {
  await prisma.banner.delete({ where: { id: req.params.id } });
  return ok(res, { deleted: true });
}));

// ── Testimonials ─────────────────────────────────────────
router.get('/testimonials', asyncHandler(async (req, res) => {
  return ok(res, await prisma.testimonial.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }));
}));
router.post('/testimonials', admin, asyncHandler(async (req, res) => {
  return created(res, await prisma.testimonial.create({ data: req.body }));
}));
router.patch('/testimonials/:id', admin, asyncHandler(async (req, res) => {
  return ok(res, await prisma.testimonial.update({ where: { id: req.params.id }, data: req.body }));
}));
router.delete('/testimonials/:id', admin, asyncHandler(async (req, res) => {
  await prisma.testimonial.delete({ where: { id: req.params.id } });
  return ok(res, { deleted: true });
}));

// ── Blog / News ──────────────────────────────────────────
const AUTHOR_SELECT = { select: { id: true, name: true, avatarUrl: true } };
const readMinutes = (html) => Math.max(1, Math.round((String(html || '').replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length) / 200));
const shapePost = (p, { withBody } = {}) => {
  if (!p) return p;
  const { body, ...rest } = p;
  return { ...rest, readMinutes: readMinutes(body), ...(withBody ? { body } : {}) };
};

router.get(
  '/posts',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const isStaff = req.user && ['ADMIN', 'SUBADMIN'].includes(req.user.role);
    const where = {
      ...(isStaff ? {} : { status: 'PUBLISHED' }),
      ...(req.query.category ? { category: req.query.category } : {}),
      ...(req.query.q
        ? { OR: [{ title: { contains: req.query.q } }, { excerpt: { contains: req.query.q } }] }
        : {}),
    };
    const rows = await prisma.post.findMany({
      where,
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      include: { author: AUTHOR_SELECT },
    });
    const categories = await prisma.post.groupBy({
      by: ['category'],
      where: { status: 'PUBLISHED', category: { not: null } },
      _count: { _all: true },
    });
    return ok(
      res,
      rows.map((p) => shapePost(p)),
      { categories: categories.map((c) => ({ name: c.category, count: c._count._all })) }
    );
  })
);

router.get(
  '/posts/:slug',
  asyncHandler(async (req, res) => {
    const post = await prisma.post.findUnique({
      where: { slug: req.params.slug },
      include: { author: AUTHOR_SELECT },
    });
    if (!post) return ok(res, null);
    const related = await prisma.post.findMany({
      where: {
        status: 'PUBLISHED',
        id: { not: post.id },
        ...(post.category ? { category: post.category } : {}),
      },
      orderBy: [{ publishedAt: 'desc' }],
      take: 3,
      include: { author: AUTHOR_SELECT },
    });
    let relatedList = related;
    if (relatedList.length < 3) {
      const more = await prisma.post.findMany({
        where: { status: 'PUBLISHED', id: { notIn: [post.id, ...relatedList.map((r) => r.id)] } },
        orderBy: [{ publishedAt: 'desc' }],
        take: 3 - relatedList.length,
        include: { author: AUTHOR_SELECT },
      });
      relatedList = [...relatedList, ...more];
    }
    return ok(res, { ...shapePost(post, { withBody: true }), related: relatedList.map((r) => shapePost(r)) });
  })
);

const postBody = z.object({
  title: z.string().min(2),
  excerpt: z.string().optional().or(z.literal('')),
  body: z.string().min(1),
  coverUrl: z.string().optional().or(z.literal('')),
  category: z.string().max(60).optional().or(z.literal('')),
  tags: z.array(z.string()).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
  metaTitle: z.string().optional().or(z.literal('')),
  metaDescription: z.string().optional().or(z.literal('')),
});

router.post(
  '/posts',
  admin,
  asyncHandler(async (req, res) => {
    const d = postBody.parse(req.body);
    const post = await prisma.post.create({
      data: {
        ...d,
        excerpt: d.excerpt || null, coverUrl: d.coverUrl || null, category: d.category || null,
        tags: d.tags || undefined,
        slug: slugify(d.title, { lower: true, strict: true }),
        authorId: req.user.id,
        publishedAt: d.status === 'PUBLISHED' ? new Date() : null,
      },
    });
    return created(res, post);
  })
);
router.patch('/posts/:id', admin, asyncHandler(async (req, res) => {
  const d = postBody.partial().parse(req.body);
  const patch = { ...d };
  ['excerpt', 'coverUrl', 'category', 'metaTitle', 'metaDescription'].forEach((k) => { if (d[k] === '') patch[k] = null; });
  if (d.title) patch.slug = slugify(d.title, { lower: true, strict: true });
  if (d.status === 'PUBLISHED') {
    const cur = await prisma.post.findUnique({ where: { id: req.params.id }, select: { publishedAt: true } });
    if (!cur?.publishedAt) patch.publishedAt = new Date();
  }
  return ok(res, await prisma.post.update({ where: { id: req.params.id }, data: patch }));
}));
router.delete('/posts/:id', admin, asyncHandler(async (req, res) => {
  await prisma.post.delete({ where: { id: req.params.id } });
  return ok(res, { deleted: true });
}));

// ── Lead status workflow config ──────────────────────────
router.get('/lead-statuses', asyncHandler(async (req, res) => {
  return ok(res, await prisma.leadStatusConfig.findMany({ orderBy: { sortOrder: 'asc' } }));
}));
router.post('/lead-statuses', admin, asyncHandler(async (req, res) => {
  const data = z
    .object({
      key: z.string().min(1),
      label: z.string().min(1),
      color: z.string().optional(),
      sortOrder: z.coerce.number().int().default(0),
      isConversion: z.boolean().default(false),
      isTerminal: z.boolean().default(false),
      isActive: z.boolean().default(true),
    })
    .parse(req.body);
  const row = await prisma.leadStatusConfig.upsert({ where: { key: data.key }, update: data, create: data });
  return created(res, row);
}));
router.patch('/lead-statuses/:key', admin, asyncHandler(async (req, res) => {
  return ok(res, await prisma.leadStatusConfig.update({ where: { key: req.params.key }, data: req.body }));
}));

module.exports = router;
