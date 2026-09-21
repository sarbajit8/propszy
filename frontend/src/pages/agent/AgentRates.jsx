import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { selectUser } from '../../features/auth/authSlice';
import { api } from '../../lib/api';
import { useCities } from '../../lib/queries';
import { inr, TYPE_LABEL } from '../../lib/format';
import { CardSkeleton, EmptyState } from '../../components/ui';

const TYPES = ['RESIDENTIAL', 'COMMERCIAL', 'PLOT', 'MIXED'];

function RateCard({ u, isAdmin }) {
  const levels = u.scheme?.levels || [];
  const l1 = levels.find((l) => l.level === 1);
  const myCommission = u.myCommission || l1?.amount || 0;
  const totalPrice = u.price || u.sale || 0;

  // Ensure exactly 5 levels exist for the 5-level commission breakdown
  const fiveLevels = [1, 2, 3, 4, 5].map((lvl) => {
    const existing = levels.find((l) => l.level === lvl);
    return existing || { level: lvl, amount: 0, percent: 0 };
  });

  return (
    <div className="card overflow-hidden transition duration-200 hover:shadow-md">
      {/* 1. Property / Unit Header */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900">{u.project.name}</p>
          <p className="truncate text-xs text-slate-500 mt-0.5">
            {u.unitType}{u.project.city ? ` · ${u.project.city}` : ''}
          </p>
        </div>
        <span className="badge bg-slate-100 text-slate-600 font-medium">{TYPE_LABEL[u.project.type] || u.project.type}</span>
      </div>

      {/* 2. Total Property Price — Prominently displayed */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Property Price</span>
        <span className="text-sm font-extrabold text-slate-900">{inr(totalPrice)}</span>
      </div>

      {/* 3. Commission Summary Box */}
      {isAdmin ? (
        /* Admin View: Shows pool type, pool %, and L1 % */
        <div className="bg-brand-50/70 border-b border-brand-100/70 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-600">Admin Commission Pool</p>
          <p className="text-xl font-extrabold text-brand-700">{inr(myCommission)}</p>
          <p className="mt-0.5 text-xs text-slate-600">
            {u.scheme?.poolType === 'PERCENT' ? `${u.scheme.poolValue}% pool` : `${inr(u.scheme?.poolValue || 0)} pool`} = {inr(u.scheme?.pool || 0)}
            {' · '}L1 ({l1?.percent ?? '—'}%)
          </p>
        </div>
      ) : (
        /* Agent View: Shows ONLY their commission in AMOUNT (No % leaked) */
        <div className="bg-gradient-to-br from-brand-50 to-violet-50/60 border-b border-brand-100/70 px-4 py-3.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-brand-600">Your Commission (Direct Sale)</p>
          <p className="mt-0.5 text-2xl font-black text-brand-700">{inr(myCommission)}</p>
          <p className="mt-1 text-xs text-slate-500">
            Amount earned when you directly source the buyer for this property
          </p>
        </div>
      )}

      {/* 4. 5-Level Commission Breakdown */}
      <div className="p-4">
        <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">
          {isAdmin ? 'Full Ladder (Percentages & Amounts)' : '5-Level Commission Breakdown'}
        </p>

        <div className="space-y-1.5">
          {fiveLevels.map((l) => {
            const isL1 = l.level === 1;
            const roleLabel = isL1 ? 'Level 1 · You (Direct)' : `Level ${l.level} · Upline ${l.level - 1}`;

            return (
              <div
                key={l.level}
                className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition ${
                  isL1 ? 'bg-brand-50/70 font-semibold text-brand-900 border border-brand-100/60' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`grid h-5 w-5 place-items-center rounded text-[10px] font-bold ${
                    isL1 ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    L{l.level}
                  </span>
                  <span>{roleLabel}</span>
                </div>

                <div className="flex items-center gap-2">
                  {/* For Admin: Show the percentage badge */}
                  {isAdmin && l.percent != null && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
                      {l.percent}%
                    </span>
                  )}
                  {/* For Both: Show the amount in INR */}
                  <span className={`font-bold ${isL1 ? 'text-brand-700 text-sm' : 'text-slate-800'}`}>
                    {inr(l.amount || 0)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {isAdmin && u.scheme?.source === 'project' && (
          <p className="mt-2.5 text-[11px] text-slate-400">Uses project default commission settings.</p>
        )}
      </div>
    </div>
  );
}

export default function AgentRates() {
  const [sp, setSp] = useSearchParams();
  const q = Object.fromEntries(sp.entries());
  const user = useSelector(selectUser);
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUBADMIN';

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
          {isAdmin
            ? 'Full commission ladder with pool percentages, unit schemes, and level-wise payout splits.'
            : 'Total property prices, your direct commission amount, and 5-level commission breakdown per unit.'}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <input
          className="input max-w-[220px] flex-1"
          placeholder="Search project or unit…"
          defaultValue={q.q || ''}
          onKeyDown={(e) => e.key === 'Enter' && setParam('q', e.target.value)}
        />
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
            {rows.map((u) => <RateCard key={u.id} u={u} isAdmin={isAdmin} />)}
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
