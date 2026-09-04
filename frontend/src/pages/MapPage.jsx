import { useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useProjectPins, useCities, useProperties } from '../lib/queries';
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
          {[p.address, p.city].filter(Boolean).join(', ') || p.city || '—'}
        </p>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-sm font-semibold text-brand-700">{priceRange(p.priceMin, p.priceMax)}</span>
          <span className="text-xs text-slate-400">
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
  const { data: cities = [] } = useCities();
  const { data: pins = [], isLoading, isFetching } = useProjectPins(q);
  const { data: featured } = useProperties({ featured: 'true', city: q.city || undefined, limit: 12 });

  const [hoverId, setHoverId] = useState(null);
  const [selected, setSelected] = useState(null); // pin object we've focused/panned to
  const [mobileView, setMobileView] = useState('list'); // list | map
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
    setMobileView('map');
  };

  const withCoords = useMemo(() => pins.filter((p) => p.lat && p.lng), [pins]);
  const featuredUnits = featured?.data || [];
  const activeFilters = ['q', 'city', 'type', 'status', 'budgetMin', 'budgetMax', 'featured'].filter((k) => q[k]);

  return (
    <div className="bg-slate-50">
      <div className="container-app py-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Projects map</h1>
            <p className="mt-1 text-sm text-slate-500">
              {isLoading ? 'Loading…' : `${withCoords.length} project${withCoords.length === 1 ? '' : 's'} with a location pin`}
              {isFetching && !isLoading ? ' · updating…' : ''}
            </p>
          </div>
          {/* mobile view toggle */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm lg:hidden">
            {['list', 'map'].map((v) => (
              <button key={v} onClick={() => setMobileView(v)}
                className={`rounded-md px-3 py-1.5 capitalize ${mobileView === v ? 'bg-brand-600 text-white' : 'text-slate-600'}`}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* filter bar */}
        <div className="mt-4 flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-3">
          <input
            className="input max-w-[220px] flex-1"
            placeholder="Search project or builder…"
            defaultValue={q.q || ''}
            onKeyDown={(e) => e.key === 'Enter' && setParam('q', e.target.value)}
          />
          <select className="input max-w-[170px]" value={q.city || ''} onChange={(e) => setParam('city', e.target.value)}>
            <option value="">All cities</option>
            {cities.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          <select className="input max-w-[150px]" value={q.type || ''} onChange={(e) => setParam('type', e.target.value)}>
            <option value="">Any type</option>
            {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
          </select>
          <select className="input max-w-[160px]" value={q.status || ''} onChange={(e) => setParam('status', e.target.value)}>
            <option value="">Any status</option>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <input className="input max-w-[120px]" type="number" placeholder="Min ₹" defaultValue={q.budgetMin || ''}
            onBlur={(e) => setParam('budgetMin', e.target.value)} />
          <input className="input max-w-[120px]" type="number" placeholder="Max ₹" defaultValue={q.budgetMax || ''}
            onBlur={(e) => setParam('budgetMax', e.target.value)} />
          <label className="flex items-center gap-2 px-2 text-sm text-slate-600">
            <input type="checkbox" checked={q.featured === 'true'} onChange={(e) => setParam('featured', e.target.checked ? 'true' : '')} />
            Featured only
          </label>
          {activeFilters.length > 0 && (
            <button className="btn-ghost" onClick={() => setSp(new URLSearchParams())}>Clear ({activeFilters.length})</button>
          )}
        </div>

        {/* split layout */}
        <div className="mt-4 grid gap-4 lg:grid-cols-[380px_1fr] xl:grid-cols-[420px_1fr]">
          {/* list */}
          <div className={`${mobileView === 'map' ? 'hidden' : ''} lg:block`}>
            {isLoading ? (
              <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-600" /></div>
            ) : pins.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
                No projects match these filters.
              </div>
            ) : (
              <div className="space-y-2.5 lg:max-h-[70vh] lg:overflow-y-auto lg:pr-1">
                {pins.map((p) => (
                  <MapProjectCard
                    key={p.id}
                    p={p}
                    active={p.id === activeId}
                    onHover={setHoverId}
                    onLeave={() => setHoverId(null)}
                    onClick={onCardClick}
                    cardRef={(el) => { cardRefs.current[p.id] = el; }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* map */}
          <div className={`${mobileView === 'list' ? 'hidden' : ''} lg:block`}>
            <div className="lg:sticky lg:top-20">
              <MapView
                pins={pins}
                height="70vh"
                zoom={11}
                activeId={activeId}
                panTo={selected}
                onSelect={onMarkerSelect}
              />
            </div>
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
