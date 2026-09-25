import { useRef, useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useHome, useProjectPins, useCities } from '../lib/queries';
import { Spinner, StatusBadge } from '../components/ui';
import ProjectCard from '../components/ProjectCard';
import PropertyCard from '../components/PropertyCard';
import Scroller from '../components/Scroller';
import BlogCard from '../components/BlogCard';
import HeroSearch from '../components/HeroSearch';
import MapView from '../components/MapView';
import { cityImage, cityImageFallback } from '../lib/cityImages';
import { priceRange, STATUS_LABEL, TYPE_LABEL } from '../lib/format';

const MAP_TYPES = ['RESIDENTIAL', 'COMMERCIAL', 'PLOT', 'MIXED'];
const MAP_STATUSES = ['UPCOMING', 'ONGOING', 'READY_TO_MOVE'];

const enc = encodeURIComponent;
const truncate = (s = '', n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const initials = (s = '') => s.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

/* Developer card: logo + stats + about + project tabs + featured-project image */
function DeveloperCard({ dev }) {
  const projects = dev.projects || [];
  const [active, setActive] = useState(0);
  const p = projects[Math.min(active, projects.length - 1)];
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card transition duration-300 hover:-translate-y-0.5 hover:shadow-xl">
      <div className="p-3.5 sm:p-5">
        <div className="flex items-center gap-3 sm:gap-3.5">
          <span className="grid h-11 w-11 sm:h-14 sm:w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 ring-1 ring-slate-200/70">
            {dev.logoUrl
              ? <img src={dev.logoUrl} alt="" className="h-full w-full object-contain p-1 sm:p-1.5" />
              : <span className="text-sm sm:text-base font-extrabold text-brand-700">{initials(dev.name)}</span>}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm sm:text-[15px] font-bold text-slate-900">{dev.name}</h3>
            <div className="mt-1 sm:mt-1.5 flex items-center gap-2.5 sm:gap-3">
              {dev.foundedYear && (
                <>
                  <span className="text-xs sm:text-sm font-bold text-slate-900">
                    {dev.foundedYear}
                    <span className="ml-1 text-[9px] sm:text-[10px] font-medium uppercase tracking-wide text-slate-400">Est.</span>
                  </span>
                  <span className="h-3 w-px bg-slate-200" />
                </>
              )}
              <span className="text-xs sm:text-sm font-bold text-slate-900">
                {dev.projectCount ?? dev.count}
                <span className="ml-1 text-[9px] sm:text-[10px] font-medium uppercase tracking-wide text-slate-400">Projects</span>
              </span>
            </div>
          </div>
        </div>
        {dev.description && (
          <p className="mt-2.5 sm:mt-3.5 line-clamp-2 text-xs sm:text-[13px] leading-relaxed text-slate-500">{dev.description}</p>
        )}
      </div>

      {projects.length > 0 && p && (
        <div className="mt-auto">
          <div className="flex gap-3 sm:gap-4 overflow-x-auto border-t border-slate-100 px-3.5 sm:px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {projects.map((pr, i) => (
              <button
                key={pr.id}
                onClick={() => setActive(i)}
                className={`relative shrink-0 whitespace-nowrap py-2 sm:py-2.5 text-xs font-semibold transition ${
                  i === active ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {truncate(pr.name, 15)}
                {i === active && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand-600" />}
              </button>
            ))}
          </div>
          <Link to={`/projects/${p.slug || p.id}`} className="group/img relative block overflow-hidden">
            <img
              src={p.image || `https://picsum.photos/seed/${p.id}/640/400`}
              alt={p.name}
              loading="lazy"
              className="aspect-[16/10] w-full object-cover transition duration-700 group-hover/img:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 text-white">
              <p className="line-clamp-1 text-sm sm:text-[15px] font-bold drop-shadow">{p.name}</p>
              <p className="mt-0.5 line-clamp-1 text-[11px] sm:text-xs text-white/70">{[p.address, p.city].filter(Boolean).join(', ')}</p>
              <div className="mt-1 sm:mt-1.5 flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold">{priceRange(p.priceMin, p.priceMax)}</span>
                <span className="text-[11px] sm:text-xs font-semibold text-white/0 transition group-hover/img:text-white/90">View →</span>
              </div>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}

/* ── shared bits ─────────────────────────────────────────── */

function Band({ tint, children }) {
  return <section className={tint || ''}>{children}</section>;
}

function Head({ title, subtitle, to, toLabel = 'View all' }) {
  return (
    <div className="mb-4 sm:mb-5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1.5 sm:gap-4">
      <div className="min-w-0">
        <h2 className="text-lg font-bold sm:text-xl md:text-[22px] tracking-tight text-slate-900">{title}</h2>
        {subtitle && <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-slate-500 line-clamp-2">{subtitle}</p>}
      </div>
      {to && (
        <Link to={to} className="inline-flex self-start sm:self-auto shrink-0 text-xs sm:text-sm font-semibold text-brand-700 hover:underline">
          {toLabel} →
        </Link>
      )}
    </div>
  );
}

const cardRow = (section, { projectVariant = 'plain' } = {}) => (
  <Scroller>
    {section.items.map((it) =>
      section.kind === 'properties'
        ? <PropertyCard key={it.id} property={it} variant="plain" />
        : <ProjectCard key={it.id} project={it} variant={projectVariant} />
    )}
  </Scroller>
);


/* ── page ────────────────────────────────────────────────── */

/* Isometric "real-estate growth" illustration — pure inline SVG, zero network */
export function InvestArt({ className = '' }) {
  const winRows = (x, y, cols, rows, w, gapX, gapY, fill, opacity = 1) =>
    Array.from({ length: rows }).flatMap((_, r) =>
      Array.from({ length: cols }).map((_, c) => (
        <rect key={`${x}-${y}-${r}-${c}`} x={x + c * (w + gapX)} y={y + r * (w * 1.4 + gapY)}
          width={w} height={w * 1.4} rx="1.5" fill={fill} fillOpacity={opacity} />
      )),
    );
  return (
    <svg className={className} viewBox="0 0 320 250" fill="none" aria-hidden="true">
      <ellipse cx="162" cy="224" rx="140" ry="16" fill="#7c3aed" fillOpacity="0.12" />
      {/* back tower */}
      <rect x="40" y="104" width="72" height="116" rx="6" fill="#ede9fe" />
      {winRows(54, 118, 3, 5, 10, 8, 8, '#c4b5fd')}
      {/* main tower */}
      <rect x="120" y="52" width="86" height="168" rx="8" fill="#a78bfa" />
      <rect x="120" y="52" width="30" height="168" fill="#7c3aed" fillOpacity="0.35" />
      {winRows(134, 70, 3, 7, 11, 9, 9, '#ffffff', 0.9)}
      {/* right block */}
      <rect x="214" y="128" width="66" height="92" rx="6" fill="#7c3aed" />
      {winRows(228, 142, 3, 4, 9, 8, 8, '#ffffff', 0.75)}
      {/* growth line */}
      <path d="M46 168 L118 118 L172 140 L268 66" stroke="#4c1d95" strokeWidth="4"
        strokeLinecap="round" strokeLinejoin="round" />
      <path d="M248 60 L270 65 L266 87" stroke="#4c1d95" strokeWidth="4"
        strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="118" cy="118" r="5" fill="#fff" stroke="#7c3aed" strokeWidth="3" />
      <circle cx="172" cy="140" r="5" fill="#fff" stroke="#7c3aed" strokeWidth="3" />
    </svg>
  );
}

/* Split "explore on the map" panel — project list synced to a Google map */
function HomeMapExplorer() {
  const { data: cities = [] } = useCities();
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({
    q: '',
    city: '',
    type: '',
    status: '',
    budgetMin: '',
    budgetMax: '',
    featured: false,
  });

  const activeCount = useMemo(() => {
    return Object.entries(filters).filter(([k, v]) => (k === 'featured' ? v : !!v)).length;
  }, [filters]);

  const queryParams = useMemo(() => {
    const p = {};
    if (filters.q) p.q = filters.q;
    if (filters.city) p.city = filters.city;
    if (filters.type) p.type = filters.type;
    if (filters.status) p.status = filters.status;
    if (filters.budgetMin) p.budgetMin = filters.budgetMin;
    if (filters.budgetMax) p.budgetMax = filters.budgetMax;
    if (filters.featured) p.featured = 'true';
    return p;
  }, [filters]);

  const { data: pins = [], isLoading, isFetching } = useProjectPins(queryParams);
  const [hoverId, setHoverId] = useState(null);
  const [selected, setSelected] = useState(null);
  const cardRefs = useRef({});
  const withCoords = useMemo(() => pins.filter((p) => p.lat && p.lng), [pins]);
  const activeId = hoverId || selected?.id || null;

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setFilters({
      q: '',
      city: '',
      type: '',
      status: '',
      budgetMin: '',
      budgetMax: '',
      featured: false,
    });
  };

  return (
    <div className="container-app py-8 sm:py-12">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2.5 sm:gap-3">
        <div>
          <h2 className="text-lg font-bold sm:text-xl md:text-[22px] tracking-tight text-slate-900">Explore projects on the map</h2>
          <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-slate-500">
            {isLoading
              ? 'Loading projects…'
              : `Compare locations and prices across ${withCoords.length} live project${withCoords.length === 1 ? '' : 's'}`}
            {isFetching && !isLoading ? ' · updating…' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link to="/map" className="shrink-0 text-xs sm:text-sm font-semibold text-brand-700 hover:underline">
            Open full map →
          </Link>
        </div>
      </div>

      {/* Filter bar */}
      <div className="mb-4 sm:mb-5 rounded-2xl border border-slate-200 bg-white p-2.5 sm:p-3 shadow-xs">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full sm:min-w-[180px] sm:flex-1">
            <input
              className="input w-full pl-8 text-xs sm:text-sm"
              placeholder="Search project or builder…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleFilterChange('q', searchInput.trim());
              }}
              onBlur={() => handleFilterChange('q', searchInput.trim())}
            />
            <svg
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <select
              className="input text-xs sm:text-sm sm:max-w-[140px]"
              value={filters.city}
              onChange={(e) => handleFilterChange('city', e.target.value)}
            >
              <option value="">All cities</option>
              {cities.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>

            <select
              className="input text-xs sm:text-sm sm:max-w-[130px]"
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
            >
              <option value="">Any type</option>
              {MAP_TYPES.map((t) => (
                <option key={t} value={t}>{TYPE_LABEL[t] || t}</option>
              ))}
            </select>

            <select
              className="input text-xs sm:text-sm sm:max-w-[140px]"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">Any status</option>
              {MAP_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s] || s}</option>
              ))}
            </select>

            <div className="flex items-center gap-1.5">
              <input
                className="input w-1/2 sm:w-[90px] text-xs sm:text-sm"
                type="number"
                placeholder="Min ₹"
                defaultValue={filters.budgetMin}
                onBlur={(e) => handleFilterChange('budgetMin', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFilterChange('budgetMin', e.target.value)}
              />
              <input
                className="input w-1/2 sm:w-[90px] text-xs sm:text-sm"
                type="number"
                placeholder="Max ₹"
                defaultValue={filters.budgetMax}
                onBlur={(e) => handleFilterChange('budgetMax', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFilterChange('budgetMax', e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-start gap-3 pt-0.5 sm:pt-0">
            <label className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                checked={filters.featured}
                onChange={(e) => handleFilterChange('featured', e.target.checked)}
              />
              <span>Featured only</span>
            </label>

            {activeCount > 0 && (
              <button
                type="button"
                className="btn-ghost py-1 px-2 text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
                onClick={handleClearFilters}
              >
                Clear ({activeCount}) ✕
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        {/* Project cards list */}
        <div className="order-2 lg:order-1 flex flex-col">
          <div className="mb-2 flex items-center justify-between px-1 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">
              {pins.length} project{pins.length === 1 ? '' : 's'} available
            </span>
            {withCoords.length > 0 && (
              <span>{withCoords.length} with map location</span>
            )}
          </div>

          <div className="space-y-2.5 max-h-[380px] sm:max-h-[420px] lg:max-h-[480px] overflow-y-auto pr-1 overscroll-contain [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-track]:bg-transparent">
            {isLoading ? (
              <div className="flex h-64 items-center justify-center rounded-xl border border-slate-200 bg-white">
                <Spinner className="h-6 w-6 text-brand-600" />
              </div>
            ) : pins.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
                <p className="text-sm font-semibold text-slate-700">No projects match these filters</p>
                <p className="mt-1 text-xs text-slate-400">Try adjusting your search criteria or clear filters</p>
                {activeCount > 0 && (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="btn-outline mt-3 text-xs"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              pins.map((p) => (
                <div
                  key={p.id}
                  ref={(el) => { cardRefs.current[p.id] = el; }}
                  onMouseEnter={() => setHoverId(p.id)}
                  onMouseLeave={() => setHoverId(null)}
                  onClick={() => setSelected(p)}
                  className={`flex cursor-pointer gap-2.5 sm:gap-3 rounded-xl border p-2.5 transition ${
                    p.id === activeId ? 'border-brand-500 bg-brand-50/60 ring-1 ring-brand-500 shadow-sm' : 'border-slate-200 bg-white hover:border-brand-300'
                  }`}
                >
                  <img
                    src={p.coverImageUrl || p.media?.[0]?.url || `https://picsum.photos/seed/${p.id}/200/160`}
                    alt={p.name} loading="lazy" className="h-[68px] w-[80px] sm:h-[72px] sm:w-[88px] shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-1.5">
                      <Link to={`/projects/${p.slug || p.id}`} className="line-clamp-1 text-xs sm:text-sm font-semibold text-slate-900 hover:text-brand-700">{p.name}</Link>
                      <StatusBadge status={p.status} label={STATUS_LABEL[p.status]} className="text-[10px] px-1.5 py-0.5" />
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-[11px] sm:text-xs text-slate-500">{[p.address, p.city].filter(Boolean).join(', ') || p.city || '—'}</p>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <span className="truncate text-xs sm:text-sm font-semibold text-brand-700">{priceRange(p.priceMin, p.priceMax)}</span>
                      <span className="shrink-0 text-[11px] sm:text-xs text-slate-400">
                        {TYPE_LABEL[p.type] || p.type}{p._count?.properties ? ` · ${p._count.properties} units` : ''}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Map view */}
        <div className="order-1 lg:order-2">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs h-[300px] sm:h-[380px] lg:h-[480px]">
            <MapView
              pins={withCoords}
              height="100%"
              zoom={filters.city ? 12 : 5}
              activeId={activeId}
              panTo={selected ? { lat: Number(selected.lat), lng: Number(selected.lng) } : undefined}
              onSelect={(p) => {
                setSelected(p || null);
                if (p) cardRefs.current[p.id]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

const QUICK_CATEGORIES = [
  {
    label: 'Flats',
    sub: 'Apartments',
    to: '/properties?category=Apartment',
    p: 'M4 21V7l8-4 8 4v14M9 21v-5h6v5M8 10h.01M12 10h.01M16 10h.01',
  },
  {
    label: 'Villas',
    sub: 'Independent',
    to: '/properties?category=Villa',
    p: 'M3 21V10l9-7 9 7v11M9 21v-6a3 3 0 0 1 6 0v6',
  },
  {
    label: 'Plots',
    sub: 'Land & Sites',
    to: '/properties?category=Plot',
    p: 'M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7M12 11v10',
  },
  {
    label: 'Commercial',
    sub: 'Offices & Retail',
    to: '/properties?category=Commercial',
    p: 'M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M16 8h2a2 2 0 0 1 2 2v11M8 7h.01M8 11h.01M8 15h.01M12 7h.01M12 11h.01M12 15h.01',
  },
  {
    label: 'New launch',
    sub: 'Just Launched',
    to: '/properties?status=UPCOMING&sort=newest',
    badge: 'NEW',
    badgeColor: 'bg-rose-500',
    p: 'M12 2l2.4 7.4H22l-6 4.5 2.3 7.1-6.3-4.6L5.7 21 8 13.9 2 9.4h7.6z',
  },
  {
    label: 'Ready to move',
    sub: 'Zero Wait',
    to: '/properties?status=READY_TO_MOVE',
    badge: 'POPULAR',
    badgeColor: 'bg-emerald-600',
    p: 'M3 12l9-9 9 9M5 10v10h14V10M10 20v-6h4v6',
  },
  {
    label: 'Rentals',
    sub: 'Verified Homes',
    to: '/properties?intent=RENT',
    p: 'M9 22V12h6v10M2 10.5L12 3l10 7.5M4 10v12h16V10',
  },
  {
    label: 'Luxury',
    sub: '₹2 Cr+ Prime',
    to: '/properties?priceMin=20000000',
    badge: 'PRIME',
    badgeColor: 'bg-amber-600',
    p: 'M3 8l4 10h10l4-10-5 3-4-6-4 6-5-3z',
  },
];

function HomeQuickCategories() {
  const scrollRef = useRef(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const max = scrollWidth - clientWidth;
    setScrollProgress(max > 0 ? scrollLeft / max : 0);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  return (
    <div className="border-b border-slate-100 bg-gradient-to-b from-white via-slate-50/50 to-white py-3.5 sm:py-6 overflow-hidden">
      <div className="container-app relative">
        {/* Categories container: Smooth horizontal slider on mobile, responsive grid on sm+ */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="-mx-4 flex gap-2.5 overflow-x-auto px-4 scroll-smooth pb-1 pt-1.5 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-3.5 sm:overflow-visible sm:px-0 lg:grid-cols-8"
        >
          {QUICK_CATEGORIES.map((c) => (
            <Link
              key={c.label}
              to={c.to}
              className="group relative flex w-[88px] shrink-0 snap-start flex-col items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-2.5 sm:p-3 text-center shadow-2xs transition-all duration-300 hover:-translate-y-1 hover:border-brand-300 hover:bg-gradient-to-b hover:from-white hover:to-brand-50/40 hover:shadow-md hover:shadow-brand-500/10 active:scale-95 sm:w-auto"
            >
              {c.badge && (
                <span
                  className={`absolute -top-1.5 right-1 rounded-full px-1.5 py-0.2 text-[8px] sm:text-[9px] font-extrabold uppercase tracking-wider text-white shadow-xs ${c.badgeColor}`}
                >
                  {c.badge}
                </span>
              )}

              <span className="grid h-10 w-10 sm:h-12 sm:w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-50 via-purple-50/60 to-brand-100/70 text-brand-600 ring-1 ring-brand-500/15 transition-all duration-300 group-hover:scale-110 group-hover:from-brand-600 group-hover:to-brand-700 group-hover:text-white group-hover:shadow-md group-hover:shadow-brand-500/30">
                <svg
                  className="h-5 w-5 sm:h-[22px] sm:w-[22px] transition-transform duration-300 group-hover:rotate-3"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d={c.p} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>

              <div className="mt-2 w-full">
                <span className="block truncate text-[11px] sm:text-[13px] font-bold text-slate-800 transition-colors group-hover:text-brand-700">
                  {c.label}
                </span>
                <span className="mt-0.5 block truncate text-[9px] sm:text-[10px] text-slate-400 transition-colors group-hover:text-brand-600 font-medium">
                  {c.sub}
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Mobile Slider Indicator Dots */}
        <div className="mt-2 flex items-center justify-center gap-1.5 sm:hidden">
          <span
            className={`h-1 rounded-full transition-all duration-300 ${
              scrollProgress < 0.35 ? 'w-5 bg-brand-600' : 'w-1.5 bg-slate-200'
            }`}
          />
          <span
            className={`h-1 rounded-full transition-all duration-300 ${
              scrollProgress >= 0.35 && scrollProgress <= 0.7 ? 'w-5 bg-brand-600' : 'w-1.5 bg-slate-200'
            }`}
          />
          <span
            className={`h-1 rounded-full transition-all duration-300 ${
              scrollProgress > 0.7 ? 'w-5 bg-brand-600' : 'w-1.5 bg-slate-200'
            }`}
          />
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { data, isLoading } = useHome();
  const [demandTab, setDemandTab] = useState('RESIDENTIAL');

  if (isLoading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Spinner className="h-8 w-8 text-brand-600" /></div>;
  }

  const d = data || {};
  const t = d.toggles || {};
  const stats = d.stats || {};
  const sections = d.sections || [];
  const allCities = d.cities || [];
  const cities = allCities.filter((c) => c.isPopular || c.count > 0);
  // "Explore top cities" rail — admin-flagged featured cities, else fall back
  const featuredCities = allCities.filter((c) => c.isFeatured);
  const topCities = featuredCities.length ? featuredCities : cities;
  const builders = d.builders || [];
  const posts = d.posts || [];
  const banners = (d.heroBanners || []).filter((b) => b.imageUrl);

  // sections deliberately hidden from the home page
  const HIDDEN = new Set([
    'trending-units', 'trending-projects', 'bestseller-units', 'bestseller-projects',
    'ready-to-move', 'affordable', 'luxury', 'commercial', 'plots',
  ]);

  const sec = (key) => sections.find((s) => s.key === key);
  const usedKeys = new Set();
  const take = (key) => { const s = sec(key); if (s) usedKeys.add(key); return s; };

  const recProps = take('featured-units');
  const recProjects = take('featured-projects');
  const newLaunch = sec('new-launches');
  const restSections = sections.filter(
    (s) => !usedKeys.has(s.key) && s.key !== newLaunch?.key && !HIDDEN.has(s.key),
  );

  return (
    <>
      <HeroSearch cities={cities} stats={stats} banners={banners} />

      {/* Quick categories */}
      <HomeQuickCategories />

      {/* Explore cities — slider (right below hero) */}
      {topCities.length > 0 && (
        <div className="container-app py-8 sm:py-10">
          <Head
            title="Explore top cities"
            subtitle="Discover homes in India’s most sought-after locations"
            to="/projects"
          />
          <Scroller itemClass="w-[145px] sm:w-[200px]">
            {topCities.slice(0, 12).map((c) => (
              <Link
                key={c.name}
                to={`/projects?city=${enc(c.name)}`}
                className="group relative block overflow-hidden rounded-2xl ring-1 ring-black/5 transition duration-300 hover:ring-2 hover:ring-brand-500/40"
              >
                <div className="aspect-[3/4]" />
                <img
                  src={cityImage(c)}
                  onError={(e) => cityImageFallback(e, c)}
                  alt={c.name}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3 sm:p-3.5 text-white">
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-sm sm:text-[15px] font-bold drop-shadow">{c.name}</p>
                    <p className="text-[11px] sm:text-xs text-white/70">{c.count} {c.count === 1 ? 'project' : 'projects'}</p>
                  </div>
                  <span className="grid h-6 w-6 sm:h-7 sm:w-7 shrink-0 translate-y-1 place-items-center rounded-full bg-white/15 text-white opacity-0 backdrop-blur-sm transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M7 17L17 7M17 7H8M17 7v9" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>
              </Link>
            ))}
          </Scroller>
        </div>
      )}

      {/* Recommended properties */}
      {recProps && (
        <div className="container-app py-8 sm:py-10">
          <Head title="Recommended properties" subtitle="Handpicked units ready to enquire" to="/properties" />
          {cardRow(recProps)}
        </div>
      )}

      {/* Recommended projects */}
      {recProjects && (
        <Band tint="bg-white">
          <div className="container-app py-8 sm:py-10">
            <Head
              title="Recommended Projects"
              subtitle={`The most searched projects${cities[0]?.name ? ` in ${cities[0].name}` : ''}`}
              to="/projects"
            />
            {cardRow(recProjects, { projectVariant: 'recommended' })}
          </div>
        </Band>
      )}

      {/* Explore on the map */}
      <HomeMapExplorer />

      {/* Newly launched projects */}
      {newLaunch && newLaunch.items.length > 0 && (
        <Band tint="bg-gradient-to-b from-brand-50/70 via-white to-white">
          <div className="container-app py-8 sm:py-12">
            <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-700">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6 4.5 2.3 7.1-6.3-4.6L5.7 21 8 13.9 2 9.4h7.6z" /></svg>
                  Just launched
                </span>
                <h2 className="mt-2 text-lg font-bold sm:text-xl md:text-[22px] tracking-tight">Newly launched projects</h2>
                <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-slate-500">Priority access to pre-launch pricing and inventory</p>
              </div>
              <Link to="/projects?status=UPCOMING" className="btn-outline self-start sm:self-auto shrink-0 text-xs sm:text-sm">Explore all launches →</Link>
            </div>
            <Scroller itemClass="w-[230px] sm:w-[280px]">
              {newLaunch.items.slice(0, 12).map((p) => (
                <ProjectCard key={p.id} project={p} variant="recommended" tag="New launch" />
              ))}
            </Scroller>
          </div>
        </Band>
      )}

      {/* Demand across India — market-pulse leaderboard */}
      {cities.length > 0 && (() => {
        const ranked = [...cities].sort((a, b) => b.count - a.count).slice(0, 8);
        const half = Math.ceil(ranked.length / 2);
        const cols = [ranked.slice(0, half), ranked.slice(half)];
        return (
          <Band tint="bg-slate-900">
            <div className="container-app py-10 sm:py-14">
              <div className="grid gap-8 lg:grid-cols-[0.9fr_1.4fr] lg:items-center">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-400">Market pulse</p>
                  <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl lg:text-3xl">Demand across India</h2>
                  <p className="mt-2 sm:mt-3 max-w-sm text-xs sm:text-sm leading-relaxed text-slate-400">
                    Where homebuyers are most active right now. Switch segments to compare apartments,
                    plots and commercial.
                  </p>
                  <div className="mt-4 sm:mt-5 inline-flex max-w-full overflow-x-auto rounded-full bg-white/10 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {[['RESIDENTIAL', 'Apartments'], ['PLOT', 'Plots'], ['COMMERCIAL', 'Commercial']].map(([v, l]) => (
                      <button key={v} onClick={() => setDemandTab(v)}
                        className={`rounded-full px-3 sm:px-3.5 py-1 sm:py-1.5 text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                          demandTab === v ? 'bg-white text-slate-900' : 'text-slate-300 hover:text-white'
                        }`}>
                        {l}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 sm:mt-6">
                    <Link to="/projects" className="text-xs sm:text-sm font-semibold text-brand-300 hover:text-brand-200">
                      Browse all cities →
                    </Link>
                  </div>
                </div>

                <div className="grid gap-x-8 sm:grid-cols-2">
                  {cols.map((col, ci) => (
                    <ol key={ci} className="divide-y divide-white/10">
                      {col.map((c, i) => {
                        const n = ci * half + i + 1;
                        return (
                          <li key={c.name}>
                            <Link to={`/projects?city=${enc(c.name)}&type=${demandTab}`}
                              className="group flex items-center gap-3 py-2.5 sm:py-3.5 text-xs sm:text-sm">
                              <span className="w-6 sm:w-7 shrink-0 text-base sm:text-lg font-bold tabular-nums text-white/25 group-hover:text-brand-400">
                                {String(n).padStart(2, '0')}
                              </span>
                              <span className="flex-1 truncate font-semibold text-white group-hover:text-brand-300">{c.name}</span>
                              <span className="shrink-0 text-slate-400 text-xs sm:text-sm">
                                {c.count} {c.count === 1 ? 'proj' : 'projects'}
                              </span>
                              <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-brand-400"
                                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </Link>
                          </li>
                        );
                      })}
                    </ol>
                  ))}
                </div>
              </div>
            </div>
          </Band>
        );
      })()}

      {/* Prominent builders */}
      {builders.length > 0 && (
        <Band tint="bg-slate-50/70">
        <div className="container-app py-8 sm:py-12">
          <Head title="Prominent real-estate builders" subtitle="Trusted developers with a proven track record" to="/projects" />
          {builders.some((b) => (b.projects || []).length) ? (
            <Scroller itemClass="w-[260px] sm:w-[340px]">
              {builders.slice(0, 10).map((b) => <DeveloperCard key={b.slug || b.name} dev={b} />)}
            </Scroller>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {builders.slice(0, 8).map((b) => (
                <Link key={b.name} to={`/projects?builder=${enc(b.name)}`} className="card flex items-center gap-2.5 sm:gap-3 p-3 sm:p-4 hover:shadow-md">
                  <span className="grid h-9 w-9 sm:h-10 sm:w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-xs sm:text-sm font-bold text-brand-700">{initials(b.name)}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs sm:text-sm font-semibold">{b.name}</span>
                    <span className="text-[11px] sm:text-xs text-slate-400">{b.count} project{b.count === 1 ? '' : 's'}</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
        </Band>
      )}

      {/* remaining curated sliders */}
      {restSections.map((s, i) => (
        <Band key={s.key} tint={i % 2 === 0 ? 'bg-white' : ''}>
          <div className="container-app py-8 sm:py-10">
            <Head title={s.title} subtitle={s.subtitle} to={s.kind === 'properties' ? '/properties' : '/projects'} />
            {cardRow(s)}
          </div>
        </Band>
      ))}

      {/* Blog */}
      {t.blog !== false && posts.length > 0 && (
        <div className="container-app py-8 sm:py-12">
          <Head title="Top reads on home buying" subtitle="Guides for buyers and investors" to="/blog" toLabel="All articles" />
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <BlogCard post={posts[0]} variant="featured" />
            <div className="flex flex-col gap-4 sm:gap-5">
              {posts.slice(1, 5).map((p) => <BlogCard key={p.id} post={p} variant="compact" />)}
            </div>
          </div>
        </div>
      )}

      {/* Invest in real estate */}
      <div className="container-app py-6 sm:py-8">
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-brand-50 p-4 sm:p-10">
          <div className="grid items-center gap-5 sm:gap-8 lg:grid-cols-[0.9fr_1fr_auto]">
            <div className="order-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Your wealth, our priority</p>
              <h2 className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl lg:text-3xl">Invest in real estate</h2>
              <p className="mt-1.5 sm:mt-2 max-w-sm text-xs sm:text-sm text-slate-500">
                Start small. Grow big. Be a part of premium, verified property projects.
              </p>
              <Link to="/projects" className="btn-primary mt-5 hidden sm:inline-flex">Explore investment plans →</Link>
            </div>

            {/* Growth Art - visible on mobile screen as well as desktop */}
            <div className="order-2 lg:order-3 relative mx-auto flex w-full max-w-[170px] sm:max-w-[240px] lg:max-w-[300px] items-center justify-center py-1 sm:py-2 lg:py-0">
              <InvestArt className="w-full drop-shadow-sm transition-transform duration-300 hover:scale-105" />
            </div>

            <div className="order-3 lg:order-2 space-y-2.5 sm:space-y-3">
              {[
                { t: 'Flexible SIP plans', d: 'Invest monthly, starting from a small amount', p: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
                { t: 'Track growth in real time', d: 'Watch your portfolio value update live', p: 'M3 3v18h18M7 15l4-4 3 3 5-6' },
                { t: 'Withdraw anytime*', d: 'Subject to applicable terms & conditions', p: 'M12 3v12M8 11l4 4 4-4M5 21h14' },
              ].map((f) => (
                <div key={f.t} className="flex items-start gap-2.5 sm:gap-3 rounded-xl sm:rounded-2xl bg-white p-3 sm:p-3.5 shadow-card transition hover:shadow-md">
                  <span className="grid h-8 w-8 sm:h-9 sm:w-9 shrink-0 place-items-center rounded-lg sm:rounded-xl bg-brand-50 text-brand-700">
                    <svg className="h-4 w-4 sm:h-[18px] sm:w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d={f.p} strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-slate-900">{f.t}</p>
                    <p className="text-[11px] sm:text-xs text-slate-500">{f.d}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile CTA button at bottom of section */}
            <div className="order-4 sm:hidden pt-1">
              <Link to="/projects" className="btn-primary w-full justify-center text-xs sm:text-sm py-2.5">Explore investment plans →</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Become an associate — violet band */}
      <div className="container-app py-6 sm:py-8">
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-brand-800 via-brand-900 to-[#2a0a52] p-5 sm:p-10 text-white">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand-500/20 blur-3xl" />
          <div className="relative grid gap-5 sm:gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">Together we build opportunities</p>
              <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl lg:text-3xl">Become a Propszy associate</h2>
              <p className="mt-1.5 sm:mt-2 max-w-md text-xs sm:text-sm text-white/70">
                Grow your network, earn attractive commissions and build your future in real estate — with
                marketing support, training and digital tools.
              </p>
              <div className="mt-4 sm:mt-5 flex flex-wrap gap-1.5 sm:gap-2">
                {['Attractive commission', 'Marketing support', 'Training & guidance', 'Digital tools'].map((t) => (
                  <span key={t} className="rounded-full bg-white/10 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[11px] sm:text-xs font-medium text-white/80">{t}</span>
                ))}
              </div>
            </div>
            <Link to="/become-associate" className="btn bg-white text-brand-800 hover:bg-brand-50 w-full sm:w-auto justify-center text-center text-xs sm:text-sm py-2.5">Join as an associate →</Link>
          </div>
        </div>
      </div>

      {/* Newsletter */}
      <div className="container-app pb-6 sm:pb-8">
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-[#1c0838] p-5 sm:p-10 text-white">
          <div className="absolute -left-10 bottom-0 h-56 w-56 rounded-full bg-brand-600/25 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-white sm:text-xl lg:text-2xl">Stay updated with the best opportunities</h2>
              <p className="mt-1 text-xs sm:text-sm text-white/60">New projects, investment plans and real-estate insights — in your inbox.</p>
            </div>
            <form
              className="flex w-full max-w-md flex-col sm:flex-row gap-2"
              onSubmit={(e) => { e.preventDefault(); const el = e.currentTarget.elements.email; if (el.value) { e.currentTarget.reset(); el.blur(); } }}
            >
              <input name="email" type="email" required placeholder="Enter your email address"
                className="w-full rounded-xl bg-white/10 px-3.5 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm text-white placeholder:text-white/40 focus:bg-white/15 focus:outline-none" />
              <button className="btn bg-brand-600 text-white hover:bg-brand-500 w-full sm:w-auto justify-center shrink-0 py-2.5 sm:py-3 text-xs sm:text-sm">Subscribe</button>
            </form>
          </div>
        </div>
      </div>

      {/* Popular cities link grid */}
      {cities.length > 0 && (
        <Band tint="bg-slate-50">
          <div className="container-app py-8 sm:py-12">
            <Head title="Real estate in popular Indian cities" />
            <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm sm:grid-cols-3 lg:grid-cols-6">
              {cities.map((c) => (
                <Link key={c.name} to={`/projects?city=${enc(c.name)}`}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 font-medium text-slate-600 hover:border-brand-300 hover:text-brand-700 truncate block text-center sm:text-left">
                  Property in {c.name}
                </Link>
              ))}
            </div>
          </div>
        </Band>
      )}

    </>
  );
}
