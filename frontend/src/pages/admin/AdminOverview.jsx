import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar,
} from 'recharts';
import { api, unwrap } from '../../lib/api';
import { inr } from '../../lib/format';
import { PageLoader } from '../../components/ui';

export default function AdminOverview() {
  const { data: stats, isLoading } = useQuery({ queryKey: ['dash-stats'], queryFn: () => unwrap(api.get('/dashboard/stats')) });
  const { data: trend = [] } = useQuery({ queryKey: ['dash-trend'], queryFn: () => unwrap(api.get('/dashboard/leads-trend', { params: { days: 30 } })) });

  if (isLoading) return <PageLoader />;

  const cards = [
    ['Projects', `${stats.projects.published}/${stats.projects.total}`, 'published / total'],
    ['Properties', stats.properties, 'units listed'],
    ['Leads', stats.leads.total, `${stats.leads.conversionRate}% converted`],
    ['Agents', stats.users.agents, `${stats.users.pendingKyc} KYC pending`],
    ['Customers', stats.users.customers, 'registered'],
    ['Commission (pending)', inr(stats.commissions.pending || 0), `${inr(stats.commissions.paid || 0)} paid`],
  ];

  const statusData = Object.entries(stats.leads.byStatus || {}).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Overview</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([label, value, hint]) => (
          <div key={label} className="card p-4">
            <p className="text-xs uppercase text-slate-400">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
            <p className="text-xs text-slate-400">{hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-4">
          <h2 className="mb-3 font-semibold">Leads — last 30 days</h2>
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

        <div className="card p-4">
          <h2 className="mb-3 font-semibold">Lead pipeline</h2>
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
