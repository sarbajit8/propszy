import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useProjects, useAmenities, useCities } from '../lib/queries';
import { inr, STATUS_LABEL, TYPE_LABEL } from '../lib/format';
import ProjectCard from '../components/ProjectCard';
import { CardSkeleton, EmptyState, Drawer } from '../components/ui';

const TYPES = ['RESIDENTIAL', 'COMMERCIAL', 'PLOT', 'MIXED'];
const STATUSES = ['UPCOMING', 'ONGOING', 'READY_TO_MOVE'];
const BEDROOMS = [1, 2, 3, 4, 5];
const BUDGET_PRESETS = [
  ['Under ₹50 L', '', '5000000'],
  ['₹50 L – ₹1 Cr', '5000000', '10000000'],
  ['₹1 – 2 Cr', '10000000', '20000000'],
  ['₹2 Cr +', '20000000', ''],
];
const SORTS = [
  ['newest', 'Newest first'],
  ['popular', 'Most popular'],
  ['price_asc', 'Price: low to high'],
  ['price_desc', 'Price: high to low'],
  ['name', 'Name (A–Z)'],
];

function Chip({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
        active ? 'bg-brand-600 text-white shadow-sm' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-brand-300'
      }`}
    >
      {children}
    </button>
  );
}

function Group({ label, children }) {
  return (
    <div className="border-b border-slate-100 py-4 first:pt-0 last:border-0">
      <p className="mb-2.5 text-sm font-semibold text-slate-800">{label}</p>
      {children}
    </div>
  );
}

export default function Projects() {
  const [sp, setSp] = useSearchParams();
  const [drawer, setDrawer] = useState(false);
  const { data: amenities = [] } = useAmenities();
  const { data: cities = [] } = useCities();

  const query = Object.fromEntries(sp.entries());
  const apiQuery = { ...query, limit: 12 };
  delete apiQuery.view;
  const { data, isLoading, isFetching } = useProjects(apiQuery);
  const projects = data?.data || [];
  const meta = data?.meta || {};

  const view = query.view === 'list' ? 'list' : 'grid';
  const csv = (key) => (sp.get(key) || '').split(',').filter(Boolean);

  const setParam = (key, value) => {
    const next = new URLSearchParams(sp);
    if (value === '' || value == null || (Array.isArray(value) && !value.length)) next.delete(key);
    else next.set(key, Array.isArray(value) ? value.join(',') : value);
    if (key !== 'page') next.delete('page');
    setSp(next, { replace: true });
  };
  const toggleCsv = (key, val) => {
    const cur = csv(key);
    setParam(key, cur.includes(String(val)) ? cur.filter((x) => x !== String(val)) : [...cur, String(val)]);
  };

  const activeChips = useMemo(() => {
    const chips = [];
    if (query.q) chips.push(['q', `“${query.q}”`, () => setParam('q', '')]);
    csv('city').forEach((c) => chips.push([`city:${c}`, c, () => toggleCsv('city', c)]));
    csv('type').forEach((t) => chips.push([`type:${t}`, TYPE_LABEL[t] || t, () => toggleCsv('type', t)]));
    csv('status').forEach((s) => chips.push([`status:${s}`, STATUS_LABEL[s] || s, () => toggleCsv('status', s)]));
    csv('bedrooms').forEach((b) => chips.push([`bed:${b}`, `${b} BHK`, () => toggleCsv('bedrooms', b)]));
    if (query.budgetMin || query.budgetMax) chips.push(['budget', `${query.budgetMin ? inr(query.budgetMin) : '₹0'} – ${query.budgetMax ? inr(query.budgetMax) : 'any'}`, () => { setParam('budgetMin', ''); setParam('budgetMax', ''); }]);
    if (query.areaMin || query.areaMax) chips.push(['area', `${query.areaMin || 0}–${query.areaMax || '∞'} sqft`, () => { setParam('areaMin', ''); setParam('areaMax', ''); }]);
    csv('amenities').forEach((id) => {
      const a = amenities.find((x) => x.id === id);
      if (a) chips.push([`am:${id}`, a.name, () => toggleCsv('amenities', id)]);
    });
    if (query.builder) chips.push(['builder', `Builder: ${query.builder}`, () => setParam('builder', '')]);
    if (query.reraNo) chips.push(['reraNo', `RERA: ${query.reraNo}`, () => setParam('reraNo', '')]);
    if (query.availableOnly === 'true') chips.push(['availableOnly', 'Available units', () => setParam('availableOnly', '')]);
    if (query.featured === 'true') chips.push(['featured', 'Featured', () => setParam('featured', '')]);
    return chips;
  }, [sp, amenities]); // eslint-disable-line

  const filterCount = activeChips.length;
  const clearAll = () => setSp(view === 'list' ? new URLSearchParams({ view: 'list' }) : new URLSearchParams());
  const page = Number(query.page || 1);

  const FilterPanel = (
    <div>
      <Group label="Search">
        <input
          className="input"
          placeholder="Project, builder, locality…"
          defaultValue={query.q || ''}
          onKeyDown={(e) => e.key === 'Enter' && setParam('q', e.target.value)}
          onBlur={(e) => e.target.value !== (query.q || '') && setParam('q', e.target.value)}
        />
      </Group>

      <Group label="Budget">
        <div className="flex flex-wrap gap-1.5">
          {BUDGET_PRESETS.map(([lbl, mn, mx]) => {
            const on = (query.budgetMin || '') === mn && (query.budgetMax || '') === mx;
            return <Chip key={lbl} active={on} onClick={() => { setParam('budgetMin', mn); setParam('budgetMax', mx); }}>{lbl}</Chip>;
          })}
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <input className="input" type="number" placeholder="Min ₹" defaultValue={query.budgetMin || ''} onBlur={(e) => setParam('budgetMin', e.target.value)} />
          <input className="input" type="number" placeholder="Max ₹" defaultValue={query.budgetMax || ''} onBlur={(e) => setParam('budgetMax', e.target.value)} />
        </div>
      </Group>

      <Group label="Configuration">
        <div className="flex flex-wrap gap-1.5">
          {BEDROOMS.map((b) => <Chip key={b} active={csv('bedrooms').includes(String(b))} onClick={() => toggleCsv('bedrooms', b)}>{b} BHK</Chip>)}
        </div>
      </Group>

      <Group label="Carpet area (sqft)">
        <div className="grid grid-cols-2 gap-2">
          <input className="input" type="number" placeholder="Min" defaultValue={query.areaMin || ''} onBlur={(e) => setParam('areaMin', e.target.value)} />
          <input className="input" type="number" placeholder="Max" defaultValue={query.areaMax || ''} onBlur={(e) => setParam('areaMax', e.target.value)} />
        </div>
      </Group>

      <Group label="Project type">
        <div className="flex flex-wrap gap-1.5">
          {TYPES.map((t) => <Chip key={t} active={csv('type').includes(t)} onClick={() => toggleCsv('type', t)}>{TYPE_LABEL[t]}</Chip>)}
        </div>
      </Group>

      <Group label="Possession">
        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map((s) => <Chip key={s} active={csv('status').includes(s)} onClick={() => toggleCsv('status', s)}>{STATUS_LABEL[s]}</Chip>)}
        </div>
      </Group>

      <Group label="City">
        <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
          {cities.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={csv('city').includes(c.name)} onChange={() => toggleCsv('city', c.name)} />
              {c.name} <span className="text-slate-300">{c.projectCount ?? ''}</span>
            </label>
          ))}
        </div>
      </Group>

      {amenities.length > 0 && (
        <Group label="Amenities">
          <div className="grid max-h-44 grid-cols-1 gap-1.5 overflow-y-auto pr-1">
            {amenities.map((a) => (
              <label key={a.id} className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={csv('amenities').includes(a.id)} onChange={() => toggleCsv('amenities', a.id)} />
                {a.name}
              </label>
            ))}
          </div>
        </Group>
      )}

      <Group label="Builder / Developer">
        <input className="input" placeholder="e.g. Prestige" defaultValue={query.builder || ''} onBlur={(e) => setParam('builder', e.target.value)} />
      </Group>

      <Group label="RERA number">
        <input className="input" placeholder="RERA-…" defaultValue={query.reraNo || ''} onBlur={(e) => setParam('reraNo', e.target.value)} />
      </Group>

      <Group label="More">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={query.availableOnly === 'true'} onChange={(e) => setParam('availableOnly', e.target.checked ? 'true' : '')} />
          Only with available units
        </label>
        <label className="mt-1.5 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={query.featured === 'true'} onChange={(e) => setParam('featured', e.target.checked ? 'true' : '')} />
          Featured projects only
        </label>
      </Group>

      <div className="pt-4">
        <Link to={`/map?${sp.toString()}`} onClick={() => setDrawer(false)} className="btn-outline w-full">
          View results on the map
        </Link>
      </div>
    </div>
  );

  return (
    <div className="bg-slate-50">
      {/* header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="container-app py-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Explore</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Projects for sale</h1>
          <p className="mt-1 text-sm text-slate-500">
            {meta.total != null ? `${meta.total} project${meta.total === 1 ? '' : 's'}` : '…'} across {cities.length} cities
          </p>
        </div>
      </div>

      {/* toolbar */}
      <div className="sticky top-16 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="container-app flex flex-wrap items-center gap-2 py-3">
          <button onClick={() => setDrawer(true)} className="btn-outline lg:hidden">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 5h18M6 12h12M10 19h4" strokeLinecap="round" /></svg>
            Filters{filterCount ? ` (${filterCount})` : ''}
          </button>
          <p className="hidden text-sm text-slate-500 sm:block">
            {isLoading ? 'Loading…' : `${meta.total ?? 0} result${meta.total === 1 ? '' : 's'}`}
          </p>

          <div className="ml-auto flex items-center gap-2">
            <select className="input h-9 max-w-[180px] py-1.5 text-sm" value={query.sort || 'newest'} onChange={(e) => setParam('sort', e.target.value)}>
              {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5">
              {['grid', 'list'].map((v) => (
                <button key={v} onClick={() => setParam('view', v)}
                  className={`rounded-md p-1.5 ${view === v ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-700'}`}
                  aria-label={`${v} view`}>
                  {v === 'grid'
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="8" height="8" rx="1" /><rect x="13" y="3" width="8" height="8" rx="1" /><rect x="3" y="13" width="8" height="8" rx="1" /><rect x="13" y="13" width="8" height="8" rx="1" /></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="4" width="18" height="4" rx="1" /><rect x="3" y="10" width="18" height="4" rx="1" /><rect x="3" y="16" width="18" height="4" rx="1" /></svg>}
                </button>
              ))}
            </div>
          </div>
        </div>

        {activeChips.length > 0 && (
          <div className="container-app flex flex-wrap items-center gap-2 pb-3">
            {activeChips.map(([key, label, onRemove]) => (
              <span key={key} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                {label}
                {onRemove && <button onClick={onRemove} className="text-brand-400 hover:text-brand-700">✕</button>}
              </span>
            ))}
            <button onClick={clearAll} className="text-xs font-medium text-slate-500 hover:text-rose-600">Clear all</button>
          </div>
        )}
      </div>

      {/* body: filter sidebar (left) + results (right) */}
      <div className="container-app grid gap-8 py-8 lg:grid-cols-[280px_1fr]">
        {/* left filter sidebar (desktop) */}
        <aside className="hidden lg:block">
          <div className="sticky top-32 rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-sm font-bold">Filters</h2>
              {filterCount > 0 && (
                <button onClick={clearAll} className="text-xs font-medium text-slate-500 hover:text-rose-600">Reset</button>
              )}
            </div>
            {FilterPanel}
          </div>
        </aside>

        {/* results */}
        <div className="min-w-0">
          {isLoading ? (
            <div className={view === 'list' ? 'space-y-3' : 'grid grid-cols-2 gap-3 sm:gap-6'}>
              {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : projects.length === 0 ? (
            <EmptyState
              title="No projects match your search"
              hint="Try removing a filter or widening your budget."
              action={filterCount ? <button className="btn-outline mt-2" onClick={clearAll}>Clear all filters</button> : null}
            />
          ) : (
            <>
              <div className={`${isFetching ? 'opacity-60 transition' : ''} ${view === 'list' ? 'space-y-3' : 'grid grid-cols-2 gap-3 sm:gap-6'}`}>
                {projects.map((p) => <ProjectCard key={p.id} project={p} variant={view} />)}
              </div>

              {meta.pages > 1 && (
                <div className="mt-10 flex items-center justify-center gap-1">
                  <button className="btn-outline" disabled={page <= 1} onClick={() => setParam('page', String(page - 1))}>Prev</button>
                  {Array.from({ length: meta.pages }, (_, i) => i + 1)
                    .filter((n) => n === 1 || n === meta.pages || Math.abs(n - page) <= 1)
                    .map((n, idx, arr) => (
                      <span key={n} className="flex items-center">
                        {idx > 0 && n - arr[idx - 1] > 1 && <span className="px-1 text-slate-300">…</span>}
                        <button onClick={() => setParam('page', String(n))}
                          className={`h-9 w-9 rounded-lg text-sm ${page === n ? 'bg-brand-600 text-white' : 'border border-slate-200 bg-white'}`}>
                          {n}
                        </button>
                      </span>
                    ))}
                  <button className="btn-outline" disabled={page >= meta.pages} onClick={() => setParam('page', String(page + 1))}>Next</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* mobile filter drawer */}
      <Drawer
        open={drawer}
        onClose={() => setDrawer(false)}
        title="Filters"
        footer={
          <div className="flex items-center justify-between gap-2">
            <button className="btn-ghost" onClick={clearAll}>Reset</button>
            <button className="btn-primary flex-1" onClick={() => setDrawer(false)}>
              Show {meta.total ?? 0} result{meta.total === 1 ? '' : 's'}
            </button>
          </div>
        }
      >
        {FilterPanel}
      </Drawer>
    </div>
  );
}
