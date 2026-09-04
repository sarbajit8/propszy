import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useCities } from '../../lib/queries';
import { inr, TYPE_LABEL } from '../../lib/format';
import { CardSkeleton, EmptyState } from '../../components/ui';

const TYPES = ['RESIDENTIAL', 'COMMERCIAL', 'PLOT', 'MIXED'];

function RateCard({ u }) {
  const l1 = u.scheme.levels.find((l) => l.level === 1);
  return (
    <div className="card overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{u.project.name}</p>
          <p className="truncate text-xs text-slate-400">
            {u.unitType}{u.project.city ? ` · ${u.project.city}` : ''} · {inr(u.price)}
          </p>
        </div>
        <span className="badge bg-slate-100 text-slate-600">{TYPE_LABEL[u.project.type] || u.project.type}</span>
      </div>

      <div className="bg-brand-50/60 px-4 py-3">
        <p className="text-[11px] uppercase tracking-wide text-brand-500">You earn (you source the buyer)</p>
        <p className="text-lg font-extrabold text-brand-700">{inr(l1?.amount || 0)}</p>
        <p className="text-xs text-slate-500">
          {u.scheme.poolType === 'PERCENT' ? `${u.scheme.poolValue}% pool` : `${inr(u.scheme.poolValue)} pool`} = {inr(u.scheme.pool)}
          {' · '}L1 {l1?.percent ?? '—'}%
        </p>
      </div>

      <div className="p-4">
        <p className="mb-2 text-xs font-semibold text-slate-500">Full ladder</p>
        <div className="space-y-1">
          {u.scheme.levels.map((l) => (
            <div key={l.level} className="flex items-center justify-between text-sm">
              <span className="text-slate-500">L{l.level}{l.level === 1 ? ' · you' : ` · upline ${l.level - 1}`}</span>
              <span className="font-medium">
                {l.percent != null && <span className="mr-2 text-xs text-slate-400">{l.percent}%</span>}
                {inr(l.amount)}
              </span>
            </div>
          ))}
        </div>
        {u.scheme.source === 'project' && (
          <p className="mt-2 text-[11px] text-slate-400">Uses the project default commission.</p>
        )}
      </div>
    </div>
  );
}

export default function AgentRates() {
  const [sp, setSp] = useSearchParams();
  const q = Object.fromEntries(sp.entries());
  const { data: cities = [] } = useCities();
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['comm-rates', q],
    queryFn: () => api.get('/commissions/rates', { params: { ...q, limit: 18 } }).then((r) => r.data),
    keepPreviousData: true,
  });
  const rows = data?.data || [];
  const meta = data?.meta || {};
  const page = Number(q.page || 1);

  const setParam = (k, v) => {
    const next = new URLSearchParams(sp);
    v ? next.set(k, v) : next.delete(k);
    if (k !== 'page') next.delete('page');
    setSp(next, { replace: true });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Commission rates</h1>
        <p className="mt-1 text-sm text-slate-500">
          What you earn per unit if you source the buyer, plus the full upline ladder.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <input className="input max-w-[220px] flex-1" placeholder="Search project or unit…"
          defaultValue={q.q || ''} onKeyDown={(e) => e.key === 'Enter' && setParam('q', e.target.value)} />
        <select className="input max-w-[160px]" value={q.city || ''} onChange={(e) => setParam('city', e.target.value)}>
          <option value="">All cities</option>
          {cities.map((c) => <option key={c.id || c.name} value={c.name}>{c.name}</option>)}
        </select>
        <select className="input max-w-[150px]" value={q.type || ''} onChange={(e) => setParam('type', e.target.value)}>
          <option value="">Any type</option>
          {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="No units found" hint="Adjust the filters." />
      ) : (
        <>
          <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${isFetching ? 'opacity-60' : ''}`}>
            {rows.map((u) => <RateCard key={u.id} u={u} />)}
          </div>
          {meta.pages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-1">
              <button className="btn-outline" disabled={page <= 1} onClick={() => setParam('page', String(page - 1))}>Prev</button>
              <span className="px-3 text-sm text-slate-500">Page {page} / {meta.pages}</span>
              <button className="btn-outline" disabled={page >= meta.pages} onClick={() => setParam('page', String(page + 1))}>Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
