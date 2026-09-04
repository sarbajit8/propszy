const { Router } = require('express');
const { prisma } = require('../../config/prisma');
const { asyncHandler, ok } = require('../../utils/http');

const router = Router();
const enc = encodeURIComponent;

// Static "smart" shortcuts matched against the query text.
const SHORTCUTS = [
  { kw: ['residential', 'apartment', 'flat', 'home'], title: 'Residential projects', to: '/projects?type=RESIDENTIAL' },
  { kw: ['commercial', 'office', 'shop', 'retail'], title: 'Commercial spaces', to: '/projects?type=COMMERCIAL' },
  { kw: ['plot', 'land'], title: 'Plots & land', to: '/projects?type=PLOT' },
  { kw: ['villa', 'independent'], title: 'Villas', to: '/properties?unitType=villa' },
  { kw: ['ready', 'ready to move', 'rtm'], title: 'Ready to move in', to: '/projects?status=READY_TO_MOVE' },
  { kw: ['new launch', 'upcoming', 'pre launch', 'prelaunch'], title: 'New launches', to: '/projects?status=UPCOMING' },
  { kw: ['ongoing', 'under construction'], title: 'Under-construction projects', to: '/projects?status=ONGOING' },
  { kw: ['luxury', 'premium'], title: 'Luxury projects (₹2 Cr+)', to: '/projects?budgetMin=20000000&sort=price_desc' },
  { kw: ['affordable', 'budget', 'cheap', 'under 50'], title: 'Affordable homes (under ₹60 L)', to: '/properties?priceMax=6000000&sort=price_asc' },
  { kw: ['featured', 'handpicked', 'top'], title: 'Featured projects', to: '/projects?featured=true' },
  { kw: ['1 bhk', '1bhk', '1 bedroom'], title: '1 BHK units', to: '/properties?bedrooms=1' },
  { kw: ['2 bhk', '2bhk', '2 bedroom'], title: '2 BHK units', to: '/properties?bedrooms=2' },
  { kw: ['3 bhk', '3bhk', '3 bedroom'], title: '3 BHK units', to: '/properties?bedrooms=3' },
  { kw: ['4 bhk', '4bhk', '4 bedroom'], title: '4 BHK units', to: '/properties?bedrooms=4' },
];

// GET /api/search?q=
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) return ok(res, { query: q, groups: [] });
    const like = { contains: q };
    const qLower = q.toLowerCase();

    const [projects, properties, cities, builderRows, posts, amenities] = await Promise.all([
      prisma.project.findMany({
        where: { isPublished: true, OR: [{ name: like }, { address: like }, { reraNo: like }, { builder: like }] },
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        take: 6,
        select: {
          id: true, name: true, slug: true, city: true, type: true, status: true,
          priceMin: true, priceMax: true, coverImageUrl: true,
          media: { where: { kind: 'IMAGE' }, take: 1, orderBy: { sortOrder: 'asc' }, select: { url: true } },
        },
      }),
      prisma.property.findMany({
        where: { project: { isPublished: true }, OR: [{ unitType: like }, { project: { name: like } }] },
        take: 5,
        select: {
          id: true, unitType: true, price: true, bedrooms: true, carpetArea: true, areaUnit: true,
          project: { select: { name: true, city: true } },
          media: { where: { kind: 'IMAGE' }, take: 1, orderBy: { sortOrder: 'asc' }, select: { url: true } },
        },
      }),
      prisma.city.findMany({ where: { isActive: true, name: like }, take: 5, select: { id: true, name: true, state: true } }),
      prisma.project.groupBy({ by: ['builder'], where: { isPublished: true, builder: like }, _count: { _all: true }, orderBy: { builder: 'asc' }, take: 5 }),
      prisma.post.findMany({
        where: { status: 'PUBLISHED', OR: [{ title: like }, { excerpt: like }, { category: like }] },
        take: 3, select: { id: true, title: true, slug: true, category: true },
      }),
      prisma.amenity.findMany({ where: { name: like }, take: 4, select: { id: true, name: true } }),
    ]);

    const shortcuts = SHORTCUTS
      .filter((s) => s.kw.some((k) => k.includes(qLower) || qLower.includes(k)))
      .slice(0, 4);

    const groups = [];

    if (shortcuts.length) {
      groups.push({
        type: 'shortcut',
        label: 'Categories',
        items: shortcuts.map((s) => ({ id: s.to, title: s.title, to: s.to })),
      });
    }
    if (cities.length) {
      groups.push({
        type: 'city',
        label: 'Cities',
        items: cities.map((c) => ({ id: c.id, title: c.name, subtitle: c.state || 'India', to: `/projects?city=${enc(c.name)}` })),
      });
    }
    if (projects.length) {
      groups.push({
        type: 'project',
        label: 'Projects',
        items: projects.map((p) => ({
          id: p.id,
          title: p.name,
          subtitle: [p.type?.[0] + p.type?.slice(1).toLowerCase(), p.city].filter(Boolean).join(' · '),
          image: p.coverImageUrl || p.media?.[0]?.url || null,
          to: `/projects/${p.slug || p.id}`,
        })),
      });
    }
    if (properties.length) {
      groups.push({
        type: 'property',
        label: 'Properties',
        items: properties.map((u) => ({
          id: u.id,
          title: u.unitType,
          subtitle: [u.project?.name, u.project?.city].filter(Boolean).join(' · '),
          image: u.media?.[0]?.url || null,
          to: `/properties/${u.id}`,
        })),
      });
    }
    if (builderRows.length) {
      groups.push({
        type: 'builder',
        label: 'Developers',
        items: builderRows
          .filter((b) => b.builder)
          .map((b) => ({ id: b.builder, title: b.builder, subtitle: `${b._count._all} project${b._count._all === 1 ? '' : 's'}`, to: `/projects?builder=${enc(b.builder)}` })),
      });
    }
    if (amenities.length) {
      groups.push({
        type: 'amenity',
        label: 'Amenities',
        items: amenities.map((a) => ({ id: a.id, title: a.name, to: `/projects?amenities=${a.id}` })),
      });
    }
    if (posts.length) {
      groups.push({
        type: 'article',
        label: 'From the blog',
        items: posts.map((p) => ({ id: p.id, title: p.title, subtitle: p.category || 'Article', to: `/blog/${p.slug}` })),
      });
    }

    return ok(res, { query: q, groups });
  })
);

module.exports = router;
