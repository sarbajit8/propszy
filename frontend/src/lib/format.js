// Indian-style currency shortening: 6500000 -> "₹65 L", 14200000 -> "₹1.42 Cr"
export function inr(value) {
  if (value == null || value === '') return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2).replace(/\.00$/, '')} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2).replace(/\.00$/, '')} L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

export function priceRange(min, max) {
  if (!min && !max) return 'Price on request';
  if (min && max) return `${inr(min)} – ${inr(max)}`;
  return inr(min || max);
}

export const STATUS_LABEL = {
  UPCOMING: 'Upcoming',
  ONGOING: 'Ongoing',
  READY_TO_MOVE: 'Ready to Move',
  AVAILABLE: 'Available',
  SOLD: 'Sold',
  ON_HOLD: 'On Hold',
};

export const TYPE_LABEL = {
  RESIDENTIAL: 'Residential',
  COMMERCIAL: 'Commercial',
  PLOT: 'Plot',
  MIXED: 'Mixed-use',
};

export function fromNow(date) {
  const d = new Date(date);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  const t = [
    [31536000, 'y'], [2592000, 'mo'], [604800, 'w'],
    [86400, 'd'], [3600, 'h'], [60, 'm'],
  ];
  for (const [secs, label] of t) {
    const v = Math.floor(s / secs);
    if (v >= 1) return `${v}${label} ago`;
  }
  return 'just now';
}
