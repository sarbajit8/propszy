import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, unwrap, apiError } from '../../lib/api';
import { fromNow, inr } from '../../lib/format';
import { PageLoader } from '../../components/ui';
import DataTable from '../../components/DataTable';

export default function AdminLeads() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState(null);

  const { data: statuses = [] } = useQuery({ queryKey: ['lead-statuses'], queryFn: () => unwrap(api.get('/cms/lead-statuses')) });
  const { data, isLoading } = useQuery({
    queryKey: ['admin-leads', page, status],
    queryFn: () => api.get('/leads', { params: { page, status: status || undefined, limit: 15 } }).then((r) => r.data),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Leads</h1>
        <a href="/api/reports/leads.csv" className="btn-outline">Export CSV</a>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => { setStatus(''); setPage(1); }}
          className={`badge ${!status ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}>All</button>
        {statuses.map((s) => (
          <button key={s.key} onClick={() => { setStatus(s.key); setPage(1); }}
            className={`badge ${status === s.key ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {s.label}
          </button>
        ))}
      </div>

      <DataTable
        loading={isLoading}
        rows={data?.data}
        meta={data?.meta}
        onPage={setPage}
        empty="No leads"
        columns={[
          { key: 'code', header: 'Code', render: (r) => (
            <button className="font-medium text-brand-700 hover:underline" onClick={() => setSelected(r.id)}>{r.code}</button>
          )},
          { key: 'customer', header: 'Customer', render: (r) => (
            <div>
              <p>{r.user?.name || r.guestName || '—'}</p>
              <p className="text-xs text-slate-400">{r.guestPhone || r.user?.phone || r.guestEmail || ''}</p>
            </div>
          )},
          { key: 'project', header: 'Project', render: (r) => r.project?.name },
          { key: 'agent', header: 'Agent', render: (r) => r.agent?.name || '—' },
          { key: 'source', header: 'Source' },
          { key: 'status', header: 'Status', render: (r) => <span className="badge bg-brand-50 text-brand-700">{r.statusKey}</span> },
          { key: 'created', header: 'Age', render: (r) => fromNow(r.createdAt) },
        ]}
      />

      {selected && (
        <LeadDrawer
          id={selected}
          statuses={statuses}
          onClose={() => setSelected(null)}
          onChange={() => { qc.invalidateQueries({ queryKey: ['admin-leads'] }); }}
        />
      )}
    </div>
  );
}

function LeadDrawer({ id, statuses, onClose, onChange }) {
  const qc = useQueryClient();
  const { data: lead, isLoading } = useQuery({ queryKey: ['lead', id], queryFn: () => unwrap(api.get(`/leads/${id}`)) });
  const [note, setNote] = useState('');
  const [saleValue, setSaleValue] = useState('');

  const setStatus = async (statusKey, isConversion) => {
    if (isConversion && !saleValue && !confirm('No sale value entered — PERCENT commissions will fall back to unit/project price. Continue?')) return;
    try {
      const { data } = await api.patch(`/leads/${id}/status`, { status: statusKey, saleValue: saleValue ? Number(saleValue) : undefined });
      if (data.data.commission?.commissions?.length) {
        toast.success(`Converted — ${data.data.commission.commissions.length} commission entries created`);
      } else {
        toast.success('Status updated');
      }
      qc.invalidateQueries({ queryKey: ['lead', id] });
      onChange();
    } catch (e) { toast.error(apiError(e)); }
  };

  const addNote = async () => {
    if (!note.trim()) return;
    await api.post(`/leads/${id}/notes`, { body: note });
    setNote('');
    qc.invalidateQueries({ queryKey: ['lead', id] });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        {isLoading || !lead ? <PageLoader /> : (
          <div className="space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold">{lead.code}</h2>
                <p className="text-sm text-slate-500">
                  {lead.project?.name || (lead.preferredCity ? `Wants property in ${lead.preferredCity}` : 'Requirement only')}
                  {lead.property ? ` · ${lead.property.unitType}` : ''}
                </p>
              </div>
              <button className="btn-ghost" onClick={onClose}>✕</button>
            </div>

            <div className="card p-3 text-sm">
              <p><b>{lead.user?.name || lead.guestName || '—'}</b></p>
              <p className="text-slate-500">{lead.guestPhone || lead.user?.phone || '—'} · {lead.guestEmail || lead.user?.email || '—'}</p>
              {(lead.guestAadhaar || lead.guestPan) && (
                <p className="mt-1 text-xs text-slate-400">
                  {lead.guestAadhaar ? `Aadhaar ${lead.guestAadhaar}` : ''}{lead.guestAadhaar && lead.guestPan ? ' · ' : ''}{lead.guestPan ? `PAN ${lead.guestPan}` : ''}
                </p>
              )}
              {lead.message && <p className="mt-2 text-slate-600">{lead.message}</p>}
              {lead.agent && <p className="mt-2 text-xs text-slate-400">Sourced by {lead.agent.name} ({lead.agent.referralCode})</p>}
            </div>

            {(lead.purpose || lead.preferredCity || lead.preferredArea || lead.requirement || lead.budgetMin || lead.budgetMax || lead.bedroomsWanted != null) && (
              <div className="card p-3 text-sm">
                <p className="mb-1 font-semibold">Requirement</p>
                <dl className="space-y-0.5 text-slate-600">
                  {lead.purpose && <div className="flex justify-between"><dt className="text-slate-400">Purpose</dt><dd>{lead.purpose}</dd></div>}
                  {(lead.preferredCity || lead.preferredArea) && <div className="flex justify-between"><dt className="text-slate-400">Location</dt><dd className="text-right">{[lead.preferredArea, lead.preferredCity].filter(Boolean).join(', ')}</dd></div>}
                  {lead.requirement && <div className="flex justify-between"><dt className="text-slate-400">Config</dt><dd>{lead.requirement}</dd></div>}
                  {lead.bedroomsWanted != null && <div className="flex justify-between"><dt className="text-slate-400">Bedrooms</dt><dd>{lead.bedroomsWanted}</dd></div>}
                  {(lead.budgetMin || lead.budgetMax) && <div className="flex justify-between"><dt className="text-slate-400">Budget</dt><dd>{lead.budgetMin ? inr(lead.budgetMin) : '₹0'} – {lead.budgetMax ? inr(lead.budgetMax) : 'any'}</dd></div>}
                </dl>
              </div>
            )}

            <div>
              <label className="label">Sale value (₹) — for conversion</label>
              <input className="input" type="number" value={saleValue} onChange={(e) => setSaleValue(e.target.value)}
                placeholder={lead.saleValue || 'e.g. 9800000'} />
            </div>

            <div>
              <p className="label">Move to status</p>
              <div className="flex flex-wrap gap-2">
                {statuses.map((s) => (
                  <button key={s.key} disabled={s.key === lead.statusKey}
                    onClick={() => setStatus(s.key, s.isConversion)}
                    className={`badge ${s.key === lead.statusKey ? 'bg-slate-200 text-slate-500' : 'bg-brand-50 text-brand-700 hover:bg-brand-100'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {lead.commissions?.length > 0 && (
              <div className="card p-3">
                <p className="mb-1 text-sm font-semibold">Commissions</p>
                {lead.commissions.map((c) => (
                  <div key={c.id} className="flex justify-between text-xs">
                    <span>L{c.level} · {c.status}</span><span>{inr(c.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            <div>
              <p className="label">Timeline</p>
              <div className="space-y-1 text-xs text-slate-500">
                {(lead.statusEvents || []).map((ev) => (
                  <div key={ev.id}>{ev.fromStatus || '—'} → <b>{ev.toStatus}</b> · {fromNow(ev.createdAt)}{ev.note ? ` — ${ev.note}` : ''}</div>
                ))}
              </div>
            </div>

            <div>
              <p className="label">Notes</p>
              <div className="mb-2 space-y-2">
                {(lead.notes || []).map((n) => (
                  <div key={n.id} className="rounded bg-slate-50 p-2 text-xs">
                    <p>{n.body}</p>
                    <p className="mt-1 text-slate-400">{n.author?.name} · {fromNow(n.createdAt)}</p>
                  </div>
                ))}
              </div>
              <textarea className="input min-h-[60px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note…" />
              <button className="btn-outline mt-2" onClick={addNote}>Add note</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
