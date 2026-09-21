import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar,
} from 'recharts';
import { api, unwrap } from '../../lib/api';
import { inr } from '../../lib/format';
import { PageLoader } from '../../components/ui';

const Icon = {
  layers: (p) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M12 3l9 5-9 5-9-5 9-5z" strokeLinejoin="round" /><path d="M3 13l9 5 9-5M3 8l9 5 9-5" strokeLinecap="round" strokeLinejoin="round" opacity=".6" /></svg>,
  building: (p) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M4 21h16M9 21v-4h2v4M9 8h1M14 8h1M9 12h1M14 12h1M15 21V11h4a1 1 0 0 1 1 1v9" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  chat: (p) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M21 11.5a8.4 8.4 0 0 1-8.9 8.4 8.7 8.7 0 0 1-3.4-.7L3 21l1.8-5.4A8.4 8.4 0 0 1 12.6 3a8.4 8.4 0 0 1 8.4 8.5z" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  users: (p) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" strokeLinecap="round" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20c0-3-1.9-5.2-4.5-5.8" strokeLinecap="round" /></svg>,
  user: (p) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><circle cx="12" cy="8" r="4" /><path d="M4 20c0-3.9 3.6-7 8-7s8 3.1 8 7" strokeLinecap="round" /></svg>,
  wallet: (p) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M16 14.5h2" strokeLinecap="round" /><path d="M7 6V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1" /></svg>,
  shieldCheck: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M12 3l7 3v6c0 4.4-3 7.9-7 9-4-1.1-7-4.6-7-9V6l7-3z" strokeLinejoin="round" /><path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  clock: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  plus: (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" {...p}><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>,
  arrow: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" {...p}><path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>,
};

const GLASS = 'rounded-2xl border border-slate-200 bg-white';

function Stat({ label, value, hint, icon: IconFn, tint, to }) {
  const inner = (
    <div className={`group flex items-start gap-3.5 p-4 transition ${to ? 'hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-200/60' : ''} ${GLASS}`}>
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tint}`}><IconFn /></span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-0.5 truncate text-2xl font-extrabold text-slate-900">{value}</p>
        {hint && <p className="mt-0.5 truncate text-xs text-slate-400">{hint}</p>}
      </div>
      {to && <Icon.arrow className="mt-1 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />}
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

export default function AdminOverview() {
  const { data: stats, isLoading } = useQuery({ queryKey: ['dash-stats'], queryFn: () => unwrap(api.get('/dashboard/stats')) });
  const { data: trend = [] } = useQuery({ queryKey: ['dash-trend'], queryFn: () => unwrap(api.get('/dashboard/leads-trend', { params: { days: 30 } })) });
  const { data: pendingProps } = useQuery({
    queryKey: ['dash-pending-properties'],
    queryFn: () => api.get('/properties', { params: { pending: true, limit: 1 } }).then((r) => r.data?.meta?.total ?? 0),
  });

  if (isLoading) return <PageLoader />;

  const statusData = Object.entries(stats.leads.byStatus || {}).map(([name, value]) => ({ name, value }));
  const pendingKyc = stats.users.pendingKyc || 0;

  return (
    <div className="space-y-6">
      {(pendingKyc > 0 || pendingProps > 0) && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700"><Icon.clock /></span>
          <p className="flex-1 text-sm font-medium text-amber-800">
            {pendingProps > 0 && <>{pendingProps} propert{pendingProps === 1 ? 'y' : 'ies'} awaiting publish. </>}
            {pendingKyc > 0 && <>{pendingKyc} KYC submission{pendingKyc === 1 ? '' : 's'} awaiting review.</>}
          </p>
          <div className="flex gap-2 text-sm font-semibold">
            {pendingProps > 0 && <Link to="/admin/properties" className="text-amber-800 hover:underline">Review properties →</Link>}
            {pendingKyc > 0 && <Link to="/admin/kyc" className="text-amber-800 hover:underline">Review KYC →</Link>}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Projects" value={`${stats.projects.published}/${stats.projects.total}`} hint="published / total" icon={Icon.layers} tint="bg-brand-50 text-brand-600" to="/admin/projects" />
        <Stat label="Properties" value={stats.properties} hint="units listed" icon={Icon.building} tint="bg-emerald-50 text-emerald-600" to="/admin/properties" />
        <Stat label="Leads" value={stats.leads.total} hint={`${stats.leads.conversionRate}% converted`} icon={Icon.chat} tint="bg-sky-50 text-sky-600" to="/admin/leads" />
        <Stat label="Associates" value={stats.users.agents} hint={`${stats.users.pendingKyc} KYC pending`} icon={Icon.users} tint="bg-indigo-50 text-indigo-600" to="/admin/associates" />
        <Stat label="Customers" value={stats.users.customers} hint="registered" icon={Icon.user} tint="bg-rose-50 text-rose-600" />
        <Stat label="Commission (pending)" value={inr(stats.commissions.pending || 0)} hint={`${inr(stats.commissions.paid || 0)} paid`} icon={Icon.wallet} tint="bg-amber-50 text-amber-600" to="/admin/commissions" />
      </div>

      <div className="flex flex-wrap gap-2.5">
        <Link to="/admin/projects/new" className="btn-primary flex items-center gap-1.5"><Icon.plus /> New project</Link>
        <Link to="/admin/properties/new" className="btn-outline flex items-center gap-1.5"><Icon.plus /> New property</Link>
        <Link to="/admin/kyc" className="btn-outline flex items-center gap-1.5"><Icon.shieldCheck /> Review KYC</Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className={`p-4 ${GLASS}`}>
          <h2 className="mb-3 font-semibold text-slate-900">Leads — last 30 days</h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="leads" stroke="#7c3aed" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="converted" stroke="#16a34a" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className={`p-4 ${GLASS}`}>
          <h2 className="mb-3 font-semibold text-slate-900">Lead pipeline</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
