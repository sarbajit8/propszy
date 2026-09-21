import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, unwrap, apiError } from '../../lib/api';
import { inr, fromNow } from '../../lib/format';
import { PageLoader } from '../../components/ui';
import DataTable from '../../components/DataTable';
import AdminHeroSlider from './AdminHeroSlider';

/* ─────────────── Associates (agents) ─────────────── */
export function AdminAgents() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['admin-agents', page, q],
    queryFn: () => api.get('/agents', { params: { page, q, limit: 15 } }).then((r) => r.data),
  });
  const [treeFor, setTreeFor] = useState(null);

  const remove = async (r) => {
    if (!confirm(`Delete associate "${r.name}"? This can't be undone.`)) return;
    try {
      await api.delete(`/users/${r.id}`);
      toast.success('Associate deleted');
      qc.invalidateQueries({ queryKey: ['admin-agents'] });
    } catch (e) { toast.error(apiError(e)); }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Associates</h1>
      <input className="input max-w-xs" placeholder="Search associates…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
      <DataTable
        loading={isLoading}
        rows={data?.data}
        meta={data?.meta}
        onPage={setPage}
        empty="No associates"
        columns={[
          { key: 'name', header: 'Associate', render: (r) => (
            <div><p className="font-medium">{r.name}</p><p className="text-xs text-slate-400">{r.email} · {r.referralCode}</p></div>
          )},
          { key: 'sponsor', header: 'Sponsor', render: (r) => r.sponsorAgent?.name || '—' },
          { key: 'downline', header: 'Direct', render: (r) => r._count?.downline ?? 0 },
          { key: 'leads', header: 'Leads', render: (r) => r._count?.leadsAsAgent ?? 0 },
          { key: 'kyc', header: 'KYC', render: (r) => (
            <span className={`badge ${r.kycStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : r.kycStatus === 'REJECTED' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
              {r.kycStatus}
            </span>
          )},
          { key: 'tree', header: '', render: (r) => (
            <button className="text-xs text-brand-700 hover:underline" onClick={() => setTreeFor(r)}>View tree</button>
          )},
          { key: 'actions', header: '', render: (r) => (
            <button className="text-xs font-medium text-rose-600 hover:underline" onClick={() => remove(r)}>Delete</button>
          )},
        ]}
      />
      {treeFor && <AgentTreeModal agent={treeFor} onClose={() => setTreeFor(null)} />}
    </div>
  );
}

/* ─────────────── Customers (users) ─────────────── */
export function AdminUsers() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, q],
    queryFn: () => api.get('/users', { params: { role: 'CUSTOMER', page, q, limit: 15 } }).then((r) => r.data),
  });

  const remove = async (r) => {
    if (!confirm(`Delete customer "${r.name}"? This can't be undone.`)) return;
    try {
      await api.delete(`/users/${r.id}`);
      toast.success('Customer deleted');
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    } catch (e) { toast.error(apiError(e)); }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Customers</h1>
      <input className="input max-w-xs" placeholder="Search customers…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
      <DataTable
        loading={isLoading}
        rows={data?.data}
        meta={data?.meta}
        onPage={setPage}
        empty="No customers"
        columns={[
          { key: 'name', header: 'Customer', render: (r) => (
            <div><p className="font-medium">{r.name}</p><p className="text-xs text-slate-400">{r.email}{r.phone ? ` · ${r.phone}` : ''}</p></div>
          )},
          { key: 'status', header: 'Status', render: (r) => (
            <span className={`badge ${r.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
              {r.isActive ? 'Active' : 'Disabled'}
            </span>
          )},
          { key: 'joined', header: 'Joined', render: (r) => fromNow(r.createdAt) },
          { key: 'actions', header: '', render: (r) => (
            <button className="text-xs font-medium text-rose-600 hover:underline" onClick={() => remove(r)}>Delete</button>
          )},
        ]}
      />
    </div>
  );
}

function AgentTreeModal({ agent, onClose }) {
  const { data: tree } = useQuery({ queryKey: ['agent-tree', agent.id], queryFn: () => unwrap(api.get(`/agents/${agent.id}/tree`)) });
  const renderNode = (n, depth = 0) => (
    <li key={n.id} className="ml-4 border-l border-slate-200 pl-4">
      <div className="py-1 text-sm">
        <b>{n.name}</b> <span className="text-xs text-slate-400">{n.attributes?.code} · {n.attributes?.kyc}</span>
      </div>
      {n.children?.length > 0 && <ul>{n.children.map((c) => renderNode(c, depth + 1))}</ul>}
    </li>
  );
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[80vh] w-full max-w-lg overflow-auto rounded-xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">{agent.name} — downline</h2>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>
        {!tree ? <PageLoader /> : <ul>{renderNode(tree)}</ul>}
      </div>
    </div>
  );
}

/* ─────────────── KYC review ─────────────── */
const KYC_BADGE = {
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-rose-100 text-rose-700',
  PENDING: 'bg-amber-100 text-amber-700',
  NOT_SUBMITTED: 'bg-slate-100 text-slate-600',
};

function AgentKycPanel({ agentId, onChange }) {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-kyc-agent', agentId],
    queryFn: () => unwrap(api.get(`/kyc/agents/${agentId}`)),
  });
  if (isLoading || !data) return <div className="p-4 text-sm text-slate-400">Loading…</div>;

  const { agent, documents, bankDetail } = data;
  const p = agent.kycProfile || {};

  const reviewDoc = async (id, status) => {
    const remarks = status === 'REJECTED' ? (prompt('Reason for rejection?') || '') : '';
    try { await api.patch(`/kyc/documents/${id}/review`, { status, remarks }); onChange(); }
    catch (e) { toast.error(apiError(e)); }
  };
  const setStatus = async (status) => {
    const remarks = status === 'REJECTED' ? (prompt('Reason (shown to the associate)?') || '') : '';
    if (!confirm(`Mark this associate's KYC as ${status}?`)) return;
    try { await api.patch(`/kyc/agents/${agentId}/status`, { status, remarks }); toast.success(`KYC ${status.toLowerCase()}`); onChange(); }
    catch (e) { toast.error(apiError(e)); }
  };

  return (
    <div className="space-y-4 bg-slate-50 p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card p-4 text-sm">
          <p className="mb-2 font-semibold">Details</p>
          {[
            ['Legal name', p.legalName], ['PAN', p.panNumber], ['Aadhaar', p.aadhaarNumber],
            ['DOB', p.dob], ['Agency', p.agencyName], ['Experience', p.experienceYears ? `${p.experienceYears} yrs` : ''],
            ['Address', [p.addressLine, p.city, p.state, p.pincode].filter(Boolean).join(', ')],
          ].map(([k, v]) => v ? <p key={k} className="flex justify-between gap-3 py-0.5"><span className="text-slate-400">{k}</span><span className="text-right font-medium">{v}</span></p> : null)}
          {!p.legalName && <p className="text-slate-400">Not filled.</p>}
        </div>
        <div className="card p-4 text-sm">
          <p className="mb-2 font-semibold">Bank</p>
          {bankDetail ? (
            <>
              <p className="flex justify-between py-0.5"><span className="text-slate-400">Name</span><b>{bankDetail.accountName}</b></p>
              <p className="flex justify-between py-0.5"><span className="text-slate-400">A/C</span><b>{bankDetail.accountNumber}</b></p>
              <p className="flex justify-between py-0.5"><span className="text-slate-400">IFSC</span><b>{bankDetail.ifsc}</b></p>
              {bankDetail.bankName && <p className="flex justify-between py-0.5"><span className="text-slate-400">Bank</span><b>{bankDetail.bankName}</b></p>}
              {bankDetail.upiId && <p className="flex justify-between py-0.5"><span className="text-slate-400">UPI</span><b>{bankDetail.upiId}</b></p>}
            </>
          ) : <p className="text-slate-400">Not added.</p>}
        </div>
      </div>

      <div className="card divide-y divide-slate-100">
        {documents.map((d) => (
          <div key={d.id} className="flex items-center gap-3 p-3 text-sm">
            <span className="flex-1 font-medium">{d.docType}{d.number ? ` · ${d.number}` : ''}</span>
            <a href={d.fileUrl} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">Open</a>
            <span className={`badge ${KYC_BADGE[d.status] || KYC_BADGE.PENDING}`}>{d.status}</span>
            <button className="text-xs text-emerald-700 hover:underline" onClick={() => reviewDoc(d.id, 'APPROVED')}>Approve</button>
            <button className="text-xs text-rose-600 hover:underline" onClick={() => reviewDoc(d.id, 'REJECTED')}>Reject</button>
          </div>
        ))}
        {!documents.length && <p className="p-4 text-center text-sm text-slate-400">No documents uploaded.</p>}
      </div>

      <div className="flex gap-2">
        <button className="btn-primary" onClick={() => setStatus('APPROVED')}>Approve KYC</button>
        <button className="btn-outline" onClick={() => setStatus('REJECTED')}>Reject KYC</button>
      </div>
    </div>
  );
}

export function AdminKyc() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('PENDING');
  const [openId, setOpenId] = useState(null);
  const { data, isLoading } = useQuery({
    queryKey: ['admin-kyc', status],
    queryFn: () => api.get('/kyc', { params: { status: status || undefined } }).then((r) => r.data),
  });

  // group the flat document list into one row per associate
  const agents = [];
  const seen = new Set();
  (data?.data || []).forEach((doc) => {
    if (!doc.agent || seen.has(doc.agent.id)) return;
    seen.add(doc.agent.id);
    agents.push(doc.agent);
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin-kyc'] });
    qc.invalidateQueries({ queryKey: ['admin-kyc-agent'] });
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">KYC review</h1>
      <div className="flex gap-2">
        {['PENDING', 'APPROVED', 'REJECTED', ''].map((s) => (
          <button key={s || 'all'} onClick={() => { setStatus(s); setOpenId(null); }}
            className={`badge ${status === s ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {isLoading ? <PageLoader /> : agents.length === 0 ? (
        <div className="card p-10 text-center text-sm text-slate-400">No associates to review here.</div>
      ) : (
        <div className="card divide-y divide-slate-100">
          {agents.map((a) => (
            <div key={a.id}>
              <button onClick={() => setOpenId(openId === a.id ? null : a.id)}
                className="flex w-full items-center gap-3 p-4 text-left text-sm hover:bg-slate-50">
                <div className="flex-1">
                  <p className="font-medium">{a.name}</p>
                  <p className="text-xs text-slate-400">{a.email} · {a.referralCode}</p>
                </div>
                <span className={`badge ${KYC_BADGE[a.kycStatus] || KYC_BADGE.PENDING}`}>{(a.kycStatus || 'PENDING').replace('_', ' ')}</span>
                <span className="text-slate-300">{openId === a.id ? '▲' : '▼'}</span>
              </button>
              {openId === a.id && <AgentKycPanel agentId={a.id} onChange={refresh} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────── MLM config ─────────────── */
export function AdminMlm() {
  const qc = useQueryClient();
  const { data: levels = [], isLoading } = useQuery({ queryKey: ['mlm-levels'], queryFn: () => unwrap(api.get('/mlm/levels')) });
  const { data: settings } = useQuery({ queryKey: ['mlm-settings'], queryFn: () => unwrap(api.get('/mlm/settings')) });
  const [row, setRow] = useState({ level: '', rateType: 'PERCENT', rateValue: '', label: '' });

  const save = async (e) => {
    e.preventDefault();
    try {
      await api.post('/mlm/levels', { ...row, level: Number(row.level), rateValue: Number(row.rateValue) });
      toast.success('Level saved');
      setRow({ level: '', rateType: 'PERCENT', rateValue: '', label: '' });
      qc.invalidateQueries({ queryKey: ['mlm-levels'] });
    } catch (err) { toast.error(apiError(err)); }
  };

  const update = async (level, patch) => {
    await api.patch(`/mlm/levels/${level}`, patch);
    qc.invalidateQueries({ queryKey: ['mlm-levels'] });
  };

  const del = async (level) => {
    if (!confirm(`Delete level ${level}?`)) return;
    await api.delete(`/mlm/levels/${level}`);
    qc.invalidateQueries({ queryKey: ['mlm-levels'] });
  };

  if (isLoading) return <PageLoader />;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-bold">MLM levels &amp; commission config</h1>

      <div className="card p-4 text-sm">
        <p className="font-semibold">How it works</p>
        <p className="mt-1 text-slate-500">
          When a lead is marked <b>Converted</b>, the system resolves that project&apos;s commission base
          (flat ₹ or % of sale value), then walks the sponsor chain from the sourcing associate — level 1 = the
          associate, level 2 = their sponsor, and so on — applying each level&apos;s rate below.
        </p>
        {settings && <p className="mt-2 text-xs text-slate-400">Max depth: {settings.maxDepth} · Payout trigger: {settings.payoutOnStatus}</p>}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-slate-400">
            <tr><th className="px-4 py-2">Level</th><th>Type</th><th>Rate</th><th>Label</th><th>Active</th><th /></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {levels.map((l) => (
              <tr key={l.level}>
                <td className="px-4 py-2 font-medium">L{l.level}</td>
                <td>
                  <select className="rounded border border-slate-200 px-1 text-xs" defaultValue={l.rateType}
                    onChange={(e) => update(l.level, { rateType: e.target.value })}>
                    <option>PERCENT</option><option>FLAT</option>
                  </select>
                </td>
                <td>
                  <input className="w-20 rounded border border-slate-200 px-1 text-xs" type="number" step="0.01" defaultValue={l.rateValue}
                    onBlur={(e) => update(l.level, { rateValue: Number(e.target.value) })} />
                </td>
                <td className="text-xs text-slate-500">{l.label || '—'}</td>
                <td>
                  <input type="checkbox" defaultChecked={l.isActive} onChange={(e) => update(l.level, { isActive: e.target.checked })} />
                </td>
                <td><button className="text-xs text-rose-600 hover:underline" onClick={() => del(l.level)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form onSubmit={save} className="card grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
        <input className="input" type="number" placeholder="Level #" required value={row.level} onChange={(e) => setRow((r) => ({ ...r, level: e.target.value }))} />
        <select className="input" value={row.rateType} onChange={(e) => setRow((r) => ({ ...r, rateType: e.target.value }))}>
          <option>PERCENT</option><option>FLAT</option>
        </select>
        <input className="input" type="number" step="0.01" placeholder="Rate" required value={row.rateValue} onChange={(e) => setRow((r) => ({ ...r, rateValue: e.target.value }))} />
        <input className="input" placeholder="Label" value={row.label} onChange={(e) => setRow((r) => ({ ...r, label: e.target.value }))} />
        <button className="btn-primary col-span-2 sm:col-span-4">Add / update level</button>
      </form>
    </div>
  );
}

/* ─────────────── Commission ledger + payouts ─────────────── */
export function AdminCommissions() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['admin-comm', status, page],
    queryFn: () => api.get('/commissions', { params: { status: status || undefined, page, limit: 20 } }).then((r) => r.data),
  });

  const setC = async (id, s) => {
    await api.patch(`/commissions/${id}/status`, { status: s });
    toast.success(`Marked ${s}`);
    qc.invalidateQueries({ queryKey: ['admin-comm'] });
  };

  const totals = data?.meta?.totals || {};

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Commission ledger</h1>
        <a href="/api/reports/commissions.csv" className="btn-outline">Export CSV</a>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {['PENDING', 'APPROVED', 'PAID', 'REVERSED'].map((s) => (
          <div key={s} className="card p-3">
            <p className="text-xs uppercase text-slate-400">{s}</p>
            <p className="mt-1 font-bold">{inr(totals[s] || 0)}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {['', 'PENDING', 'APPROVED', 'PAID', 'REVERSED'].map((s) => (
          <button key={s || 'all'} onClick={() => { setStatus(s); setPage(1); }}
            className={`badge ${status === s ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{s || 'All'}</button>
        ))}
      </div>

      <DataTable
        loading={isLoading}
        rows={data?.data}
        meta={data?.meta}
        onPage={setPage}
        empty="No commission entries"
        columns={[
          { key: 'agent', header: 'Associate', render: (r) => r.agent?.name },
          { key: 'lead', header: 'Lead', render: (r) => r.lead?.code },
          { key: 'project', header: 'Project', render: (r) => r.project?.name },
          { key: 'level', header: 'Lvl', render: (r) => `L${r.level}` },
          { key: 'amount', header: 'Amount', render: (r) => inr(r.amount) },
          { key: 'status', header: 'Status', render: (r) => <span className="badge bg-slate-100 text-slate-600">{r.status}</span> },
          { key: 'actions', header: '', render: (r) => (
            <div className="flex gap-2 text-xs">
              {r.status === 'PENDING' && <button className="text-emerald-700 hover:underline" onClick={() => setC(r.id, 'APPROVED')}>Approve</button>}
              {r.status === 'APPROVED' && <button className="text-brand-700 hover:underline" onClick={() => setC(r.id, 'PAID')}>Mark paid</button>}
              {r.status !== 'REVERSED' && <button className="text-rose-600 hover:underline" onClick={() => setC(r.id, 'REVERSED')}>Reverse</button>}
            </div>
          )},
        ]}
      />
    </div>
  );
}

/* ─────────────── Reports ─────────────── */
export function AdminReports() {
  const reports = [
    ['Leads', '/api/reports/leads.csv', 'All leads with source, associate, status, sale value'],
    ['Commissions', '/api/reports/commissions.csv', 'Full commission ledger, level-wise'],
    ['Projects', '/api/reports/projects.csv', 'Projects with unit counts, lead counts, commission base'],
  ];
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Reports &amp; exports</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map(([name, href, desc]) => (
          <a key={name} href={href} className="card block p-5 hover:shadow-lg">
            <p className="font-semibold">{name}</p>
            <p className="mt-1 text-sm text-slate-500">{desc}</p>
            <p className="mt-3 text-sm text-brand-700">Download CSV →</p>
          </a>
        ))}
      </div>
    </div>
  );
}

/* ─────────────── Properties (flat list) ─────────────── */
export function AdminProperties() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState('all'); // all | pending
  const { data, isLoading } = useQuery({
    queryKey: ['admin-properties', page, tab],
    queryFn: () => api.get('/properties', { params: { page, limit: 20, ...(tab === 'pending' ? { pending: true } : {}) } }).then((r) => r.data),
  });
  const { data: pendingCount } = useQuery({
    queryKey: ['admin-properties-pending-count'],
    queryFn: () => api.get('/properties', { params: { pending: true, limit: 1 } }).then((r) => r.data?.meta?.total ?? 0),
  });

  const remove = async (r) => {
    if (!confirm(`Delete "${r.name || r.unitType}"? This can't be undone.`)) return;
    try {
      await api.delete(`/properties/${r.id}`);
      toast.success('Property deleted');
      qc.invalidateQueries({ queryKey: ['admin-properties'] });
      qc.invalidateQueries({ queryKey: ['admin-properties-pending-count'] });
    } catch (e) { toast.error(apiError(e)); }
  };

  const approve = async (r) => {
    try {
      await api.patch(`/properties/${r.id}`, { isPublished: true });
      toast.success('Property approved & published');
      qc.invalidateQueries({ queryKey: ['admin-properties'] });
      qc.invalidateQueries({ queryKey: ['admin-properties-pending-count'] });
    } catch (e) { toast.error(apiError(e)); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Properties</h1>
          <p className="text-sm text-slate-500">Every listing is added project-wise, with the full Housing.com-style detail flow.</p>
        </div>
        <Link to="/admin/properties/new" className="btn-primary shrink-0">+ Add property</Link>
      </div>

      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm">
        {[['all', 'All properties'], ['pending', `Pending review${pendingCount ? ` (${pendingCount})` : ''}`]].map(([v, l]) => (
          <button key={v} onClick={() => { setTab(v); setPage(1); }}
            className={`rounded-md px-3 py-1.5 font-medium ${tab === v ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
            {l}
          </button>
        ))}
      </div>

      <DataTable
        loading={isLoading}
        rows={data?.data}
        meta={data?.meta}
        onPage={setPage}
        empty={tab === 'pending' ? 'Nothing pending review — all caught up.' : 'No units yet'}
        columns={[
          { key: 'unitType', header: 'Property', render: (r) => (
            <Link to={`/admin/properties/${r.id}`} className="font-medium text-brand-700 hover:underline">{r.name || r.unitType}</Link>
          )},
          { key: 'project', header: 'Project', render: (r) => (
            r.project
              ? <Link to={`/admin/projects/${r.project.id}`} className="text-brand-700 hover:underline">{r.project.name}</Link>
              : <span className="text-slate-400">Standalone</span>
          )},
          { key: 'owner', header: 'Owner', render: (r) => (
            r.createdBy
              ? <span className="badge bg-amber-50 text-amber-700" title={r.createdBy.phone || r.createdBy.email}>{r.createdBy.name} (customer)</span>
              : <span className="text-slate-400">Admin</span>
          )},
          { key: 'publish', header: 'Visibility', render: (r) => (
            r.projectId
              ? <span className={`badge ${r.project?.isPublished ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{r.project?.isPublished ? 'Live' : 'Project unpublished'}</span>
              : <span className={`badge ${r.isPublished ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{r.isPublished ? 'Live' : 'Pending review'}</span>
          )},
          { key: 'price', header: 'Price', render: (r) => inr(r.price) },
          { key: 'area', header: 'Area', render: (r) => r.carpetArea ? `${r.carpetArea} ${r.areaUnit || 'sqft'}` : '—' },
          { key: 'stock', header: 'Stock', render: (r) => {
            const isSold = r.status === 'SOLD' || (r.availableUnits != null && r.availableUnits <= 0);
            return isSold ? (
              <span className="badge bg-rose-100 font-bold text-rose-700">0 / {r.totalUnits || 1} (Sold)</span>
            ) : (
              <span className="badge bg-emerald-50 font-semibold text-emerald-700">
                {r.availableUnits ?? 1} / {r.totalUnits ?? 1} avail
              </span>
            );
          }},
          { key: 'status', header: 'Status', render: (r) => {
            const isSold = r.status === 'SOLD' || (r.availableUnits != null && r.availableUnits <= 0);
            return isSold ? (
              <span className="badge bg-rose-600 font-extrabold text-white">SOLD OUT</span>
            ) : (
              <span className="badge bg-slate-100 text-slate-600">{r.status}</span>
            );
          }},
          { key: 'actions', header: '', render: (r) => (
            <div className="flex gap-2 text-xs">
              <a href={`/properties/${r.id}`} target="_blank" rel="noreferrer" className="text-slate-500 hover:underline">View</a>
              {!r.projectId && !r.isPublished && (
                <button onClick={() => approve(r)} className="font-semibold text-emerald-600 hover:underline">
                  {r.createdBy ? 'Approve & publish' : 'Publish'}
                </button>
              )}
              <Link to={`/admin/properties/${r.id}`} className="text-brand-700 hover:underline">Edit</Link>
              <button onClick={() => remove(r)} className="text-rose-600 hover:underline">Delete</button>
            </div>
          )},
        ]}
      />
    </div>
  );
}

/* ─────────────── Wishlists (by customer) ─────────────── */
export function AdminWishlists() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-wishlists'], queryFn: () => unwrap(api.get('/favorites/admin')) });
  const [openId, setOpenId] = useState(null);
  if (isLoading) return <PageLoader />;
  const groups = data || [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Wishlists</h1>
        <p className="text-sm text-slate-500">Every customer's saved projects &amp; units, grouped by user.</p>
      </div>

      {!groups.length ? (
        <p className="card p-6 text-center text-sm text-slate-400">No one has saved anything yet.</p>
      ) : (
        <div className="card divide-y divide-slate-100">
          {groups.map((g) => {
            const open = openId === g.user.id;
            return (
              <div key={g.user.id}>
                <button type="button" onClick={() => setOpenId(open ? null : g.user.id)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50">
                  <div>
                    <p className="text-sm font-semibold">{g.user.name}</p>
                    <p className="text-xs text-slate-400">{g.user.phone || g.user.email}</p>
                  </div>
                  <span className="badge bg-brand-50 text-brand-700">{g.items.length} saved</span>
                </button>
                {open && (
                  <div className="divide-y divide-slate-50 bg-slate-50 px-4">
                    {g.items.map((it) => (
                      <div key={it.id} className="flex items-center justify-between py-2 text-sm">
                        {it.project ? (
                          <Link to={`/admin/projects/${it.project.id}`} className="text-brand-700 hover:underline">{it.project.name} · {it.project.city}</Link>
                        ) : it.property ? (
                          <Link to={`/admin/properties/${it.property.id}`} className="text-brand-700 hover:underline">
                            {it.property.name || it.property.unitType}{it.property.project ? ` · ${it.property.project.name}` : ''}
                          </Link>
                        ) : <span className="text-slate-400">Removed listing</span>}
                        <span className="text-xs text-slate-400">{fromNow(it.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─────────────── CMS ─────────────── */
export function AdminCms() {
  const qc = useQueryClient();
  const { data: testimonials = [] } = useQuery({ queryKey: ['cms-tst'], queryFn: () => unwrap(api.get('/cms/testimonials')) });
  const [tst, setTst] = useState({ name: '', quote: '', role: '' });

  const addTst = async (e) => {
    e.preventDefault();
    try {
      await api.post('/cms/testimonials', tst);
      toast.success('Testimonial added');
      setTst({ name: '', quote: '', role: '' });
      qc.invalidateQueries({ queryKey: ['cms-tst'] });
    } catch (err) { toast.error(apiError(err)); }
  };

  return (
    <div className="max-w-2xl space-y-10">
      <h1 className="text-xl font-bold">CMS</h1>

      <AdminHeroSlider />

      <section>
        <h2 className="font-semibold">Testimonials</h2>
        <div className="mt-2 space-y-2">
          {testimonials.map((t) => (
            <div key={t.id} className="card p-3 text-sm">
              <p>&ldquo;{t.quote}&rdquo;</p>
              <p className="mt-1 text-xs text-slate-400">— {t.name}{t.role ? `, ${t.role}` : ''}</p>
            </div>
          ))}
        </div>
        <form onSubmit={addTst} className="card mt-3 grid gap-2 p-4">
          <input className="input" placeholder="Name *" required value={tst.name} onChange={(e) => setTst((t) => ({ ...t, name: e.target.value }))} />
          <input className="input" placeholder="Role" value={tst.role} onChange={(e) => setTst((t) => ({ ...t, role: e.target.value }))} />
          <textarea className="input" placeholder="Quote *" required value={tst.quote} onChange={(e) => setTst((t) => ({ ...t, quote: e.target.value }))} />
          <button className="btn-primary">Add testimonial</button>
        </form>
      </section>
    </div>
  );
}
