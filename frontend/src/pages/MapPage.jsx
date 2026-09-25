import { useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useProjectPins, useCities, useProperties } from '../lib/queries';
import { usePublicConfig } from '../lib/publicConfig';
import { priceRange, STATUS_LABEL, TYPE_LABEL } from '../lib/format';
import { Spinner, StatusBadge } from '../components/ui';
import MapView from '../components/MapView';
import PropertyCard from '../components/PropertyCard';
import Scroller from '../components/Scroller';

const TYPES = ['RESIDENTIAL', 'COMMERCIAL', 'PLOT', 'MIXED'];
const STATUSES = ['UPCOMING', 'ONGOING', 'READY_TO_MOVE'];

function MapProjectCard({ p, active, onHover, onLeave, onClick, cardRef }) {
  const img = p.coverImageUrl || p.media?.[0]?.url || `https://picsum.photos/seed/${p.id}/240/180`;
  return (
    <div
      ref={cardRef}
      onMouseEnter={() => onHover(p.id)}
      onMouseLeave={onLeave}
      onClick={() => onClick(p)}
      className={`flex cursor-pointer gap-3 rounded-xl border p-2.5 transition ${
        active ? 'border-brand-500 bg-brand-50/60 ring-1 ring-brand-500' : 'border-slate-200 bg-white hover:border-brand-300'
      }`}
    >
      <img src={img} alt={p.name} className="h-20 w-24 shrink-0 rounded-lg object-cover" loading="lazy" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/projects/${p.slug || p.id}`} className="line-clamp-1 text-sm font-semibold text-slate-900 hover:text-brand-700">
            {p.name}
          </Link>
          <StatusBadge status={p.status} label={STATUS_LABEL[p.status]} />
        </div>
        <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
          {[p.address, p.city, p.state].filter(Boolean).join(', ') || p.city || p.state || '—'}
        </p>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold text-brand-700">{priceRange(p.priceMin, p.priceMax)}</span>
          <span className="shrink-0 text-xs text-slate-400">
            {TYPE_LABEL[p.type] || p.type}{p._count?.properties ? ` · ${p._count.properties} units` : ''}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function MapPage() {
  const [sp, setSp] = useSearchParams();

  const q = Object.fromEntries(sp.entries());

  // Do not force any default state or city (e.g. Kolkata/West Bengal)
  const effectiveState = q.state || '';
  const effectiveCity = q.city || '';

  const { data: cities = [] } = useCities();

  const states = useMemo(() => {
    const set = new Set();
    cities.forEach((c) => {
      if (c.state) set.add(c.state);
    });
    return Array.from(set).sort();
  }, [cities]);

  const filteredCities = useMemo(() => {
    if (!effectiveState) return cities;
    return cities.filter((c) => !c.state || c.state.toLowerCase() === effectiveState.toLowerCase());
  }, [cities, effectiveState]);

  const queryParams = useMemo(() => {
    const params = { ...q };
    if (effectiveState) params.state = effectiveState;
    if (effectiveCity) params.city = effectiveCity;
    return params;
  }, [q, effectiveState, effectiveCity]);

  const { data: pins = [], isLoading, isFetching } = useProjectPins(queryParams);
  const { data: featured } = useProperties({ featured: 'true', city: effectiveCity || undefined, limit: 12 });

  const [hoverId, setHoverId] = useState(null);
  const [selected, setSelected] = useState(null); // pin object we've focused/panned to
  const cardRefs = useRef({});

  const activeId = hoverId || selected?.id || null;

  const setParam = (k, v) => {
    const next = new URLSearchParams(sp);
    if (v) next.set(k, v); else next.delete(k);
    setSp(next);
  };

  // marker click → scroll the matching card into view
  const onMarkerSelect = (p) => {
    setSelected(p || null);
    if (p) {
      const el = cardRefs.current[p.id];
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  // card click → pan the map to it
  const onCardClick = (p) => {
    setSelected(p);
  };

  const withCoords = useMemo(() => pins.filter((p) => p.lat && p.lng), [pins]);
  const featuredUnits = featured?.data || [];
  const activeFilters = [
    effectiveState ? 'state' : null,
    effectiveCity ? 'city' : null,
    q.q ? 'q' : null,
    q.type ? 'type' : null,
    q.status ? 'status' : null,
    q.budgetMin ? 'budgetMin' : null,
    q.budgetMax ? 'budgetMax' : null,
    q.featured === 'true' ? 'featured' : null,
  ].filter(Boolean);

  return (
    <div className="relative min-h-[calc(100vh-60px)] bg-slate-50">
      <div className="container-app py-4 sm:py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Projects map</h1>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
              {isLoading ? 'Loading…' : `${withCoords.length} project${withCoords.length === 1 ? '' : 's'} with location pin · ${pins.length} total`}
              {isFetching && !isLoading ? ' · updating…' : ''}
              {effectiveState ? ` · ${effectiveState}` : ''}
            </p>
          </div>
        </div>

        {/* filter bar */}
        <div className="mt-3 sm:mt-4 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
          <input
            className="input max-w-[200px] flex-1 text-xs sm:text-sm"
            placeholder="Search project or builder…"
            defaultValue={q.q || ''}
            onKeyDown={(e) => e.key === 'Enter' && setParam('q', e.target.value)}
          />

          {/* State Filter with default West Bengal */}
          <select
            className="input max-w-[160px] text-xs sm:text-sm font-semibold text-slate-800"
            value={effectiveState}
            onChange={(e) => {
              const newState = e.target.value;
              const next = new URLSearchParams(sp);
              next.set('state', newState);
              if (newState && effectiveCity) {
                const match = cities.find((c) => c.name.toLowerCase() === effectiveCity.toLowerCase());
                if (match?.state && match.state.toLowerCase() !== newState.toLowerCase()) {
                  next.delete('city');
                }
              }
              setSp(next);
            }}
          >
            <option value="">All States</option>
            {states.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* City Filter */}
          <select
            className="input max-w-[160px] text-xs sm:text-sm"
            value={effectiveCity}
            onChange={(e) => setParam('city', e.target.value)}
          >
            <option value="">{effectiveState ? `All Cities in ${effectiveState}` : 'All Cities'}</option>
            {filteredCities.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          <select className="input max-w-[140px] text-xs sm:text-sm" value={q.type || ''} onChange={(e) => setParam('type', e.target.value)}>
            <option value="">Any type</option>
            {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
          </select>
          <select className="input max-w-[150px] text-xs sm:text-sm" value={q.status || ''} onChange={(e) => setParam('status', e.target.value)}>
            <option value="">Any status</option>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <input className="input max-w-[105px] text-xs sm:text-sm" type="number" placeholder="Min ₹" defaultValue={q.budgetMin || ''}
            onBlur={(e) => setParam('budgetMin', e.target.value)} />
          <input className="input max-w-[105px] text-xs sm:text-sm" type="number" placeholder="Max ₹" defaultValue={q.budgetMax || ''}
            onBlur={(e) => setParam('budgetMax', e.target.value)} />
          <label className="flex items-center gap-1.5 px-2 text-xs sm:text-sm text-slate-600 cursor-pointer">
            <input type="checkbox" checked={q.featured === 'true'} onChange={(e) => setParam('featured', e.target.checked ? 'true' : '')} />
            <span>Featured only</span>
          </label>
          {activeFilters.length > 0 && (
            <button
              type="button"
              className="btn-ghost text-xs text-rose-600 font-semibold"
              onClick={() => setSp(new URLSearchParams())}
            >
              Clear filters ({activeFilters.length}) ✕
            </button>
          )}
        </div>

        {/* split layout: Map on top on mobile (order-1), side-by-side on desktop */}
        <div className="mt-4 grid gap-5 lg:grid-cols-[380px_1fr] xl:grid-cols-[420px_1fr]">
          {/* 1. Map Column: on mobile renders first (top), on desktop stays on right (order-2) */}
          <div className="order-1 lg:order-2">
            <div className="lg:sticky lg:top-20">
              <div className="h-[320px] sm:h-[380px] lg:h-[70vh] w-full overflow-hidden rounded-2xl shadow-xs">
                <MapView
                  pins={withCoords}
                  height="100%"
                  zoom={effectiveCity ? 12 : 5}
                  activeId={activeId}
                  panTo={selected ? { lat: Number(selected.lat), lng: Number(selected.lng) } : undefined}
                  onSelect={onMarkerSelect}
                />
              </div>
            </div>
          </div>

          {/* 2. Projects List Column: on mobile renders directly under map (order-2), on desktop is left column (order-1) */}
          <div className="order-2 lg:order-1 flex flex-col">
            <div className="mb-2.5 flex items-center justify-between px-0.5">
              <h2 className="text-sm font-bold text-slate-900">
                Available Projects
                <span className="ml-2 rounded-full bg-slate-200/80 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                  {pins.length}
                </span>
              </h2>
              {withCoords.length > 0 && (
                <span className="text-xs text-slate-400">
                  {withCoords.length} on map
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="flex justify-center py-20">
                <Spinner className="h-7 w-7 text-brand-600" />
              </div>
            ) : pins.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
                <p className="text-sm font-semibold text-slate-700">No projects match these filters</p>
                <p className="mt-1 text-xs text-slate-400">
                  {effectiveState ? `No projects found in ${effectiveState}.` : 'Try adjusting your search criteria.'}
                </p>
                {effectiveState && (
                  <button
                    type="button"
                    onClick={() => {
                      const next = new URLSearchParams(sp);
                      next.set('state', '');
                      next.delete('city');
                      setSp(next);
                    }}
                    className="btn-outline mt-3 text-xs"
                  >
                    View All States
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* 4 projects visible on mobile, scroll inside like Home page */}
                <div className="space-y-2.5 max-h-[408px] overflow-y-auto pr-1.5 overscroll-contain [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-track]:bg-transparent lg:max-h-[70vh]">
                  {pins.map((p) => (
                    <MapProjectCard
                      key={p.id}
                      p={p}
                      active={p.id === activeId}
                      onHover={setHoverId}
                      onLeave={() => setHoverId(null)}
                      onClick={onCardClick}
                      cardRef={(el) => {
                        cardRefs.current[p.id] = el;
                      }}
                    />
                  ))}
                </div>

                {pins.length > 4 && (
                  <div className="mt-2 flex items-center justify-between px-1 text-xs text-slate-500 lg:hidden">
                    <span>Showing 4 of {pins.length} projects</span>
                    <span className="flex items-center gap-1 font-medium text-brand-600">
                      <span>Scroll inside to view more</span>
                      <svg className="h-3.5 w-3.5 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* featured properties below the map */}
      {featuredUnits.length > 0 && (
        <section className="border-t border-slate-200 bg-white">
          <div className="container-app py-10">
            <div className="mb-5 flex items-end justify-between">
              <div>
                <h2 className="text-xl font-bold">Featured properties{q.city ? ` in ${q.city}` : ''}</h2>
                <p className="mt-1 text-sm text-slate-500">Hand-picked units ready to enquire</p>
              </div>
              <Link to="/properties" className="text-sm font-medium text-brand-700 hover:underline">View all →</Link>
            </div>
            <Scroller>
              {featuredUnits.map((u) => <PropertyCard key={u.id} property={u} />)}
            </Scroller>
          </div>
        </section>
      )}
    </div>
  );
}
