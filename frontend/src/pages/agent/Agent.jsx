import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api, unwrap, apiError } from '../../lib/api';
import { inr, fromNow } from '../../lib/format';
import { PageLoader, EmptyState } from '../../components/ui';
import DataTable from '../../components/DataTable';
import { selectUser } from '../../features/auth/authSlice';

function KycGate() {
  const { data } = useQuery({ queryKey: ['kyc-me'], queryFn: () => unwrap(api.get('/kyc/me')) });
  if (!data || data.status === 'APPROVED') return null;

  const cl = data.checklist || {};
  const copy = {
    NOT_SUBMITTED: ['Complete your KYC to start earning', 'You can browse, but you can’t recruit sub-agents or receive commission until your KYC is approved.'],
    PENDING: ['KYC under review', 'An admin is reviewing your documents. We’ll notify you as soon as it’s done.'],
    REJECTED: ['KYC needs attention', 'Some documents were rejected — fix the flagged items and re-submit.'],
  }[data.status] || ['Complete your KYC', ''];

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900">{copy[0]}</p>
          <p className="mt-1 text-sm text-slate-600">{copy[1]}</p>
        </div>
        <Link to="/associate/kyc" className="btn-primary">
          {data.status === 'PENDING' ? 'View KYC' : 'Complete KYC'}
        </Link>
      </div>
      {data.status !== 'PENDING' && (
        <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs">
          {[['Personal & PAN', cl.profile], ['Documents', cl.docsDone], ['Bank details', cl.bank]].map(([label, done]) => (
            <li key={label} className={done ? 'text-emerald-700' : 'text-slate-500'}>{done ? '✓' : '○'} {label}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AgentOverview() {
  const user = useSelector(selectUser);
  const { data, isLoading } = useQuery({ queryKey: ['agent-me'], queryFn: () => unwrap(api.get('/agents/me')) });
  if (isLoading) return <PageLoader />;
  if (!data) return <EmptyState title="Agent profile unavailable" />;

  const e = data.earnings || {};
  const approved = user?.kycStatus === 'APPROVED';
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Associate dashboard</h1>

      <KycGate />

      <div className="card p-4">
        <p className="text-xs uppercase text-slate-400">Your referral link</p>
        <div className="mt-1 flex items-center gap-2">
          <code className="flex-1 truncate rounded bg-slate-50 px-2 py-1 text-sm">{data.referralLink}</code>
          <button className="btn-outline" onClick={() => { navigator.clipboard.writeText(data.referralLink); toast.success('Copied'); }}>Copy</button>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Code: <b>{data.referralCode}</b>
          {!approved && <span className="ml-2 text-amber-600">· active once KYC is approved</span>}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Direct recruits" value={data.directRecruits} />
        <Stat label="Total downline" value={data.downline?.total ?? 0} />
        <Stat label="Pending earnings" value={inr(e.pending || 0)} />
        <Stat label="Paid earnings" value={inr(e.paid || 0)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h2 className="font-semibold">Leads by status</h2>
          <div className="mt-3 space-y-2 text-sm">
            {Object.entries(data.leadsByStatus || {}).map(([k, v]) => (
              <div key={k} className="flex justify-between"><span>{k}</span><b>{v}</b></div>
            ))}
            {!Object.keys(data.leadsByStatus || {}).length && <p className="text-slate-400">No leads yet.</p>}
          </div>
        </div>
        <div className="card p-4">
          <h2 className="font-semibold">Downline by level</h2>
          <div className="mt-3 space-y-2 text-sm">
            {(data.downline?.perLevel || []).map((l) => (
              <div key={l.level} className="flex justify-between"><span>Level {l.level}</span><b>{l.count}</b></div>
            ))}
            {!data.downline?.perLevel?.length && <p className="text-slate-400">No downline yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}

export function AgentLeads() {
  const [scope, setScope] = useState('mine');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['agent-leads', scope, page],
    queryFn: () => api.get('/leads', { params: { scope: scope === 'downline' ? 'downline' : undefined, page } }).then((r) => r.data),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Leads</h1>
        <div className="flex items-center gap-2">
          <select className="input max-w-[160px]" value={scope} onChange={(e) => { setScope(e.target.value); setPage(1); }}>
            <option value="mine">My leads</option>
            <option value="downline">Downline leads</option>
          </select>
          <Link to="/associate/leads/new" className="btn-primary">+ Add lead</Link>
        </div>
      </div>
      <DataTable
        loading={isLoading}
        rows={data?.data}
        meta={data?.meta}
        onPage={setPage}
        empty="No leads found"
        columns={[
          { key: 'code', header: 'Code' },
          { key: 'customer', header: 'Customer', render: (r) => (
            <div>
              <p className="font-medium">{r.user?.name || r.guestName || '—'}</p>
              <p className="text-xs text-slate-400">{r.guestPhone || r.user?.phone || ''}</p>
            </div>
          )},
          { key: 'interest', header: 'Interest', render: (r) => (
            <div className="text-sm">
              {r.project?.name
                ? <p>{r.project.name}{r.property ? ` · ${r.property.unitType}` : ''}</p>
                : <p className="text-slate-500">{[r.requirement, r.preferredArea || r.preferredCity].filter(Boolean).join(' in ') || 'Requirement only'}</p>}
            </div>
          )},
          { key: 'status', header: 'Status', render: (r) => <span className="badge bg-brand-50 text-brand-700">{r.statusKey}</span> },
          { key: 'created', header: 'Created', render: (r) => fromNow(r.createdAt) },
        ]}
      />
    </div>
  );
}

const COMM_BADGE = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-sky-100 text-sky-700',
  PAID: 'bg-emerald-100 text-emerald-700',
  REVERSED: 'bg-rose-100 text-rose-700',
};

export function AgentCommissions() {
  const [status, setStatus] = useState('');
  const [scope, setScope] = useState('mine');
  const [page, setPage] = useState(1);

  const { data: summary, isLoading: sLoading } = useQuery({
    queryKey: ['comm-summary'], queryFn: () => unwrap(api.get('/commissions/summary')),
  });
  const { data: payouts = [] } = useQuery({
    queryKey: ['comm-payouts'], queryFn: () => unwrap(api.get('/commissions/payouts')),
  });
  const { data: ledger, isLoading } = useQuery({
    queryKey: ['comm-ledger', status, scope, page],
    queryFn: () => api.get('/commissions', { params: { status: status || undefined, scope: scope === 'downline' ? 'downline' : undefined, page } }).then((r) => r.data),
  });

  if (sLoading) return <PageLoader />;
  const t = summary?.totals || {};
  const monthly = summary?.monthly || [];
  const hasEarnings = (t.lifetime || 0) > 0;

  const cards = [
    ['Lifetime earned', t.lifetime, 'text-slate-900'],
    ['Pending approval', t.pending, 'text-amber-600'],
    ['Ready for payout', t.nextPayout, 'text-sky-600'],
    ['Paid out', t.paid, 'text-emerald-600'],
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Earnings</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, value, color]) => (
          <div key={label} className="card p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
            <p className={`mt-1 text-xl font-extrabold ${color}`}>{inr(value || 0)}</p>
          </div>
        ))}
      </div>

      {t.nextPayout > 0 && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">
          <b>{inr(t.nextPayout)}</b> in approved commission is ready — an admin will bundle it into your next payout.
        </div>
      )}

      {/* monthly chart */}
      <div className="card p-4">
        <h2 className="mb-3 font-semibold">Last 12 months</h2>
        {hasEarnings ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthly} margin={{ left: -12 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                tickFormatter={(v) => (v >= 1e5 ? `${(v / 1e5).toFixed(0)}L` : v)} />
              <Tooltip formatter={(v, n) => [inr(v), n === 'earned' ? 'Earned' : 'Paid']} labelStyle={{ color: '#334155' }} />
              <Bar dataKey="earned" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="paid" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-10 text-center text-sm text-slate-400">No earnings yet — your commission appears here once a lead you sourced is converted.</p>
        )}
      </div>

      {/* level breakdown */}
      {summary?.levels?.length > 0 && (
        <div className="card overflow-x-auto p-4">
          <h2 className="mb-2 font-semibold">By level</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-400">
              <tr><th className="py-1">Level</th><th>Rate</th><th>Entries</th><th>Pending</th><th>Approved</th><th>Paid</th><th>Total</th></tr>
            </thead>
            <tbody>
              {summary.levels.map((lvl) => {
                const b = summary.breakdown?.find((x) => x.level === lvl.level) || {};
                return (
                  <tr key={lvl.level} className="border-t border-slate-100">
                    <td className="py-2 font-medium">L{lvl.level}</td>
                    <td>{lvl.rateValue}{lvl.rateType === 'PERCENT' ? '%' : ' flat'}</td>
                    <td>{b.count || 0}</td>
                    <td>{inr(b.pending || 0)}</td>
                    <td>{inr(b.approved || 0)}</td>
                    <td>{inr(b.paid || 0)}</td>
                    <td className="font-semibold">{inr(b.total || 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* payout history */}
      <div>
        <h2 className="mb-3 font-semibold">Payout history</h2>
        {payouts.length === 0 ? (
          <p className="card p-6 text-center text-sm text-slate-400">No payouts yet.</p>
        ) : (
          <div className="card divide-y divide-slate-100">
            {payouts.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-4 text-sm">
                <div>
                  <p className="font-semibold">{inr(p.amount)}</p>
                  <p className="text-xs text-slate-400">
                    {p._count?.commissions ?? 0} entries · {p.method || 'bank transfer'} · {fromNow(p.createdAt)}
                  </p>
                </div>
                <span className={`badge ${p.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ledger */}
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Commission ledger</h2>
          <div className="flex gap-2">
            <select className="input h-9 max-w-[150px] py-1.5 text-sm" value={scope} onChange={(e) => { setScope(e.target.value); setPage(1); }}>
              <option value="mine">Mine</option>
              <option value="downline">Incl. downline</option>
            </select>
            <select className="input h-9 max-w-[150px] py-1.5 text-sm" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All statuses</option>
              {['PENDING', 'APPROVED', 'PAID', 'REVERSED'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <DataTable
          loading={isLoading}
          rows={ledger?.data}
          meta={ledger?.meta}
          onPage={setPage}
          empty="No commission entries"
          columns={[
            { key: 'lead', header: 'Lead', render: (r) => r.lead?.code },
            { key: 'project', header: 'Project', render: (r) => r.project?.name || '—' },
            { key: 'level', header: 'Level', render: (r) => `L${r.level}` },
            { key: 'amount', header: 'Amount', render: (r) => <span className="font-medium">{inr(r.amount)}</span> },
            { key: 'status', header: 'Status', render: (r) => <span className={`badge ${COMM_BADGE[r.status] || 'bg-slate-100 text-slate-600'}`}>{r.status}</span> },
            { key: 'date', header: 'Date', render: (r) => fromNow(r.createdAt) },
          ]}
        />
      </div>
    </div>
  );
}

export function AgentRecruit() {
  const user = useSelector(selectUser);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  if (user && user.role === 'AGENT' && user.kycStatus !== 'APPROVED') {
    return (
      <div className="max-w-lg">
        <h1 className="text-xl font-bold">Recruit a sub-agent</h1>
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-slate-700">
          <p className="font-medium">Approve your KYC first</p>
          <p className="mt-1 text-slate-600">You can recruit sub-agents once your own KYC is approved.</p>
          <Link to="/associate/kyc" className="btn-primary mt-3">Go to KYC</Link>
        </div>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/agents/recruit', form);
      toast.success(`${form.name} added to your downline (pending KYC)`);
      setForm({ name: '', email: '', phone: '', password: '' });
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-xl font-bold">Recruit a sub-agent</h1>
      <p className="text-sm text-slate-500">They&apos;ll be placed directly under you. They must complete KYC before earning.</p>
      <form onSubmit={submit} className="card space-y-4 p-5">
        <div><label className="label">Full name</label><input className="input" required value={form.name} onChange={set('name')} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Email</label><input className="input" type="email" required value={form.email} onChange={set('email')} /></div>
          <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={set('phone')} /></div>
        </div>
        <div><label className="label">Temp password</label><input className="input" required minLength={8} value={form.password} onChange={set('password')} /></div>
        <button className="btn-primary" disabled={busy}>{busy ? 'Adding…' : 'Add sub-agent'}</button>
      </form>
    </div>
  );
}
