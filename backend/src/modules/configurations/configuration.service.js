const { prisma } = require('../../config/prisma');

const enc = encodeURIComponent;

function resolveTarget(c) {
  switch (c.filterType) {
    case 'bedrooms': return `/properties?bedrooms=${enc(c.filterValue || '')}`;
    case 'type': return `/projects?type=${enc(c.filterValue || '')}`;
    case 'status': return `/projects?status=${enc(c.filterValue || '')}`;
    default: return c.filterValue || '/projects';
  }
}

async function countFor(c) {
  try {
    if (c.filterType === 'bedrooms') {
      const beds = String(c.filterValue || '').split(',').map(Number).filter((n) => !Number.isNaN(n));
      if (!beds.length) return null;
      return prisma.property.count({ where: { project: { isPublished: true }, bedrooms: { in: beds } } });
    }
    if (c.filterType === 'type') return prisma.project.count({ where: { isPublished: true, type: c.filterValue } });
    if (c.filterType === 'status') return prisma.project.count({ where: { isPublished: true, status: c.filterValue } });
  } catch { /* ignore */ }
  return null;
}

async function shapeConfiguration(c, { withCount = true } = {}) {
  return {
    id: c.id, label: c.label, slug: c.slug, subtitle: c.subtitle,
    imageUrl: c.imageUrl, icon: c.icon,
    filterType: c.filterType, filterValue: c.filterValue,
    isFeatured: c.isFeatured, isActive: c.isActive, sortOrder: c.sortOrder,
    to: resolveTarget(c),
    count: withCount ? await countFor(c) : undefined,
  };
}

module.exports = { resolveTarget, countFor, shapeConfiguration };
