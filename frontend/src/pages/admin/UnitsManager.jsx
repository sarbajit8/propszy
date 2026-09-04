import { useState, Fragment, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, unwrap, apiError } from '../../lib/api';
import { inr } from '../../lib/format';
import MediaManager from './MediaManager';
import CommissionEditor, { CommissionFields, DEFAULT_SCHEME } from './CommissionEditor';

const EMPTY = { unitType: '', categoryId: '', carpetArea: '', price: '', floor: '', facing: '', bedrooms: '', bathrooms: '', status: 'AVAILABLE' };

export default function UnitsManager({ projectId, units = [] }) {
  const qc = useQueryClient();
  const [rows, setRows] = useState(units);
  const [form, setForm] = useState(EMPTY);
  const [scheme, setScheme] = useState({ ...DEFAULT_SCHEME });
  const [showComm, setShowComm] = useState(false);
  const [open, setOpen] = useState(null); // { id, tab: 'media' | 'commission' }
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const { data: cats } = useQuery({ queryKey: ['unit-categories'], queryFn: () => unwrap(api.get('/unit-categories')) });
  const catList = useMemo(() => {
    const tree = cats?.tree || [];
    const out = [];
    for (const p of tree) {
      out.push({ id: p.id, label: p.name, group: p.name, isParent: true });
      for (const c of p.children || []) out.push({ id: c.id, label: c.name, group: p.name, isParent: false });
    }
    return out;
  }, [cats]);
  const catName = (id) => catList.find((c) => c.id === id)?.label || '—';

  // auto counts by category
  const tally = useMemo(() => {
    const m = {};
    for (const u of rows) {
      const k = u.category?.name || catName(u.categoryId) || 'Uncategorised';
      m[k] = (m[k] || 0) + 1;
    }
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [rows, catList]);

  const num = (v) => (v === '' ? undefined : Number(v));

  const add = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/properties', {
        projectId,
        unitType: form.unitType,
        categoryId: form.categoryId || null,
        carpetArea: num(form.carpetArea),
        price: num(form.price),
        floor: form.floor || undefined,
        facing: form.facing || undefined,
        bedrooms: num(form.bedrooms),
        bathrooms: num(form.bathrooms),
        status: form.status,
        commissionScheme: showComm && scheme.enabled
          ? { enabled: true, poolType: scheme.poolType, poolValue: Number(scheme.poolValue) || 0, levels: scheme.levels.map((l, i) => ({ level: i + 1, percent: Number(l.percent) || 0 })) }
          : undefined,
      });
      setRows((r) => [...r, data.data]);
      setForm(EMPTY);
      setScheme({ ...DEFAULT_SCHEME });
      setShowComm(false);
      toast.success('Unit added');
      qc.invalidateQueries();
    } catch (err) { toast.error(apiError(err)); }
  };

  const patchUnit = async (u, patch) => {
    try {
      await api.patch(`/properties/${u.id}`, patch);
      setRows((r) => r.map((x) => (x.id === u.id ? { ...x, ...patch } : x)));
    } catch (err) { toast.error(apiError(err)); }
  };

  const remove = async (u) => {
    if (!confirm(`Delete unit "${u.unitType}"?`)) return;
    try {
      await api.delete(`/properties/${u.id}`);
      setRows((r) => r.filter((x) => x.id !== u.id));
      qc.invalidateQueries();
    } catch (err) { toast.error(apiError(err)); }
  };

  return (
    <fieldset className="card space-y-4 p-5">
      <legend className="px-1 text-sm font-semibold">Units / properties</legend>

      {tally.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-2.5 text-xs">
          <span className="font-semibold text-slate-500">Inventory:</span>
          {tally.map(([k, n]) => (
            <span key={k} className="rounded-full bg-white px-2 py-0.5 font-medium text-slate-700 ring-1 ring-slate-200">
              {k} <span className="text-brand-700">{n}</span>
            </span>
          ))}
          <span className="ml-auto font-semibold text-slate-700">{rows.length} unit{rows.length === 1 ? '' : 's'} total</span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-slate-400">
            <tr><th className="py-1">Type</th><th>Category</th><th>Area</th><th>Price</th><th>Status</th><th>Homepage</th><th /></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((u) => (
              <Fragment key={u.id}>
                <tr>
                  <td className="py-2 font-medium">{u.unitType}</td>
                  <td>
                    <select className="rounded border border-slate-200 px-1 py-0.5 text-xs" value={u.categoryId || ''}
                      onChange={(e) => patchUnit(u, { categoryId: e.target.value || null, category: null })}>
                      <option value="">—</option>
                      {catList.map((c) => (
                        <option key={c.id} value={c.id}>{c.isParent ? c.label : `  ${c.label}`}</option>
                      ))}
                    </select>
                  </td>
                  <td>{u.carpetArea || '—'}</td>
                  <td>{inr(u.price)}</td>
                  <td>
                    <select className="rounded border border-slate-200 px-1 py-0.5 text-xs" value={u.status}
                      onChange={(e) => patchUnit(u, { status: e.target.value })}>
                      {['AVAILABLE', 'SOLD', 'ON_HOLD'].map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="whitespace-nowrap text-xs">
                    {[['isFeatured', 'Feat'], ['isTrending', 'Trend'], ['isBestSeller', 'Best']].map(([k, lbl]) => (
                      <label key={k} className="mr-2 inline-flex items-center gap-1">
                        <input type="checkbox" checked={!!u[k]} onChange={(e) => patchUnit(u, { [k]: e.target.checked })} />
                        {lbl}
                      </label>
                    ))}
                  </td>
                  <td className="flex gap-2 py-2 text-xs">
                    <button onClick={() => setOpen(open?.id === u.id && open.tab === 'media' ? null : { id: u.id, tab: 'media' })} className="text-brand-700 hover:underline">Media</button>
                    <button onClick={() => setOpen(open?.id === u.id && open.tab === 'commission' ? null : { id: u.id, tab: 'commission' })}
                      className={`hover:underline ${u.commissionScheme?.enabled ? 'font-semibold text-emerald-700' : 'text-brand-700'}`}>
                      Commission{u.commissionScheme?.enabled ? ' •' : ''}
                    </button>
                    <button onClick={() => remove(u)} className="text-rose-600 hover:underline">Delete</button>
                  </td>
                </tr>
                {open?.id === u.id && (
                  <tr>
                    <td colSpan={7} className="bg-slate-50 p-3">
                      {open.tab === 'media'
                        ? <MediaManager propertyId={u.id} media={u.media || []} />
                        : <CommissionEditor property={u} onSaved={(scheme) => setRows((r) => r.map((x) => (x.id === u.id ? { ...x, commissionScheme: scheme } : x)))} />}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {!rows.length && <tr><td colSpan={7} className="py-4 text-center text-slate-400">No units yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <form onSubmit={add} className="space-y-3 border-t border-slate-100 pt-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <input className="input" placeholder="Unit type * (e.g. 3BHK)" required value={form.unitType} onChange={set('unitType')} />
          <select className="input" value={form.categoryId} onChange={set('categoryId')}>
            <option value="">Category…</option>
            {catList.map((c) => (
              <option key={c.id} value={c.id}>{c.isParent ? c.label : `${c.group} › ${c.label}`}</option>
            ))}
          </select>
          <input className="input" type="number" placeholder="Carpet area" value={form.carpetArea} onChange={set('carpetArea')} />
          <input className="input" type="number" placeholder="Price ₹" value={form.price} onChange={set('price')} />
          <input className="input" placeholder="Floor" value={form.floor} onChange={set('floor')} />
          <input className="input" placeholder="Facing" value={form.facing} onChange={set('facing')} />
          <input className="input" type="number" placeholder="Beds" value={form.bedrooms} onChange={set('bedrooms')} />
          <input className="input" type="number" placeholder="Baths" value={form.bathrooms} onChange={set('bathrooms')} />
        </div>

        <button type="button" onClick={() => setShowComm((v) => !v)} className="text-xs font-medium text-brand-700 hover:underline">
          {showComm ? '− Hide commission' : '+ Set commission for this unit'}
        </button>
        {showComm && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <CommissionFields
              scheme={scheme}
              onChange={setScheme}
              sample={Number(form.price) || 10000000}
            />
          </div>
        )}

        <button className="btn-primary">Add unit</button>
      </form>
    </fieldset>
  );
}
