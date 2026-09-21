import { useState, Fragment, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, unwrap, apiError } from '../../lib/api';
import { inr } from '../../lib/format';
import MediaManager from './MediaManager';
import VideoUpload from '../../components/VideoUpload';
import CommissionEditor, { CommissionFields, DEFAULT_SCHEME } from './CommissionEditor';

const EMPTY = {
  unitType: '', categoryId: '', carpetArea: '', price: '', floor: '', facing: '',
  bedrooms: '', bathrooms: '', status: 'AVAILABLE', totalUnits: '1', availableUnits: '1', videoUrl: ''
};

export default function UnitsManager({ projectId, units = [] }) {
  const qc = useQueryClient();
  const [rows, setRows] = useState(units);
  const [form, setForm] = useState(EMPTY);
  const [scheme, setScheme] = useState({ ...DEFAULT_SCHEME });
  const [showComm, setShowComm] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [open, setOpen] = useState(null); // { id, tab: 'media' | 'video' | 'commission' }
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

  const totalStock = useMemo(() => {
    const tot = rows.reduce((s, u) => s + (u.totalUnits ?? 1), 0);
    const avail = rows.reduce((s, u) => s + (u.status === 'SOLD' ? 0 : (u.availableUnits ?? 1)), 0);
    return { total: tot, available: avail, sold: tot - avail };
  }, [rows]);

  const num = (v) => (v === '' ? undefined : Number(v));

  const add = async (e) => {
    e.preventDefault();
    try {
      const tot = num(form.totalUnits) ?? 1;
      const avail = form.status === 'SOLD' ? 0 : (num(form.availableUnits) ?? tot);
      const stat = avail <= 0 ? 'SOLD' : form.status;
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
        totalUnits: tot,
        availableUnits: avail,
        status: stat,
        videoUrl: form.videoUrl?.trim() || undefined,
        commissionScheme: showComm && scheme.enabled
          ? { enabled: true, poolType: scheme.poolType, poolValue: Number(scheme.poolValue) || 0, levels: scheme.levels.map((l, i) => ({ level: i + 1, percent: Number(l.percent) || 0 })) }
          : undefined,
      });
      setRows((r) => [...r, data.data]);
      setForm(EMPTY);
      setScheme({ ...DEFAULT_SCHEME });
      setShowComm(false);
      setShowVideo(false);
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

      {rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-2.5 text-xs">
          <span className="font-semibold text-slate-500">Inventory:</span>
          {tally.map(([k, n]) => (
            <span key={k} className="rounded-full bg-white px-2 py-0.5 font-medium text-slate-700 ring-1 ring-slate-200">
              {k} <span className="text-brand-700">{n}</span>
            </span>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-bold text-emerald-800">
              {totalStock.available} Available
            </span>
            {totalStock.sold > 0 && (
              <span className="rounded-full bg-rose-100 px-2.5 py-0.5 font-bold text-rose-700">
                {totalStock.sold} Sold Out
              </span>
            )}
            <span className="font-semibold text-slate-700">
              {totalStock.total} total units ({rows.length} typologies)
            </span>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-slate-400">
            <tr><th className="py-1">Type</th><th>Category</th><th>Area</th><th>Price</th><th>Stock (Avail / Total)</th><th>Status</th><th>Homepage</th><th /></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((u) => (
              <Fragment key={u.id}>
                <tr>
                  <td className="py-2 font-medium">
                    <div className="flex items-center gap-1.5">
                      <span>{u.unitType}</span>
                      {u.videoUrl && <span className="rounded bg-emerald-50 px-1 py-0.5 text-[9px] font-bold text-emerald-700" title="Has video">🎥</span>}
                    </div>
                  </td>
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
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        title="Available Stock (0 = Sold Out)"
                        className={`w-14 rounded border px-1.5 py-0.5 text-center text-xs font-bold ${
                          (u.availableUnits ?? (u.status === 'SOLD' ? 0 : 1)) <= 0
                            ? 'border-rose-300 bg-rose-50 text-rose-700'
                            : 'border-emerald-300 bg-emerald-50 text-emerald-800'
                        }`}
                        value={u.availableUnits ?? (u.status === 'SOLD' ? 0 : 1)}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value) || 0);
                          const patch = {
                            availableUnits: val,
                            status: val <= 0 ? 'SOLD' : (u.status === 'SOLD' ? 'AVAILABLE' : u.status),
                          };
                          patchUnit(u, patch);
                        }}
                      />
                      <span className="text-xs text-slate-400">/</span>
                      <input
                        type="number"
                        min="1"
                        title="Total Units"
                        className="w-14 rounded border border-slate-200 px-1.5 py-0.5 text-center text-xs text-slate-700"
                        value={u.totalUnits ?? 1}
                        onChange={(e) => {
                          const val = Math.max(1, parseInt(e.target.value) || 1);
                          patchUnit(u, { totalUnits: val });
                        }}
                      />
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <select
                        className={`rounded border px-1.5 py-0.5 text-xs font-semibold ${
                          u.status === 'SOLD' || (u.availableUnits != null && u.availableUnits <= 0)
                            ? 'border-rose-300 bg-rose-50 text-rose-700'
                            : 'border-slate-200 text-slate-700'
                        }`}
                        value={u.status}
                        onChange={(e) => {
                          const s = e.target.value;
                          const patch = { status: s };
                          if (s === 'SOLD') patch.availableUnits = 0;
                          else if (s === 'AVAILABLE' && (u.availableUnits <= 0 || u.status === 'SOLD')) {
                            patch.availableUnits = u.totalUnits || 1;
                          }
                          patchUnit(u, patch);
                        }}
                      >
                        <option value="AVAILABLE">AVAILABLE</option>
                        <option value="SOLD">SOLD OUT</option>
                        <option value="ON_HOLD">ON HOLD</option>
                      </select>
                      {(u.status === 'SOLD' || (u.availableUnits != null && u.availableUnits <= 0)) && (
                        <span className="rounded bg-rose-600 px-1.5 py-0.5 text-[9px] font-extrabold text-white">
                          SOLD OUT
                        </span>
                      )}
                    </div>
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
                    <button onClick={() => setOpen(open?.id === u.id && open.tab === 'video' ? null : { id: u.id, tab: 'video' })}
                      className={`hover:underline ${u.videoUrl ? 'font-semibold text-emerald-700' : 'text-brand-700'}`}>
                      Video{u.videoUrl ? ' •' : ''}
                    </button>
                    <button onClick={() => setOpen(open?.id === u.id && open.tab === 'commission' ? null : { id: u.id, tab: 'commission' })}
                      className={`hover:underline ${u.commissionScheme?.enabled ? 'font-semibold text-emerald-700' : 'text-brand-700'}`}>
                      Commission{u.commissionScheme?.enabled ? ' •' : ''}
                    </button>
                    <button onClick={() => remove(u)} className="text-rose-600 hover:underline">Delete</button>
                  </td>
                </tr>
                {open?.id === u.id && (
                  <tr>
                    <td colSpan={7} className="bg-slate-50 p-4">
                      {open.tab === 'media' && <MediaManager propertyId={u.id} media={u.media || []} />}
                      {open.tab === 'video' && (
                        <div className="max-w-lg space-y-2 rounded-xl border border-slate-200 bg-white p-4">
                          <div>
                            <h4 className="text-sm font-bold text-slate-800">Featured Video — {u.unitType}</h4>
                            <p className="text-xs text-slate-500">Upload a normal video walkthrough (MP4, WebM) or paste a YouTube / Vimeo link. Shown on the project details page.</p>
                          </div>
                          <VideoUpload
                            value={u.videoUrl}
                            folder="properties"
                            onChange={(url) => patchUnit(u, { videoUrl: url })}
                          />
                        </div>
                      )}
                      {open.tab === 'commission' && (
                        <CommissionEditor property={u} onSaved={(scheme) => setRows((r) => r.map((x) => (x.id === u.id ? { ...x, commissionScheme: scheme } : x)))} />
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {!rows.length && <tr><td colSpan={7} className="py-4 text-center text-slate-400">No units yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <form onSubmit={add} className="space-y-4 border-t border-slate-100 pt-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Add New Unit / Typology</h4>
        
        {/* Core specs with clear labels */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Unit Type / Typology *</label>
            <input className="input" placeholder="e.g. 2BHK, 3BHK, Villa" required value={form.unitType} onChange={set('unitType')} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Category</label>
            <select className="input" value={form.categoryId} onChange={set('categoryId')}>
              <option value="">Category…</option>
              {catList.map((c) => (
                <option key={c.id} value={c.id}>{c.isParent ? c.label : `${c.group} › ${c.label}`}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Carpet Area (sqft)</label>
            <input className="input" type="number" placeholder="e.g. 1250" value={form.carpetArea} onChange={set('carpetArea')} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Price (₹)</label>
            <input className="input" type="number" placeholder="e.g. 6500000" value={form.price} onChange={set('price')} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Floor</label>
            <input className="input" placeholder="e.g. 5, or 1 to 12" value={form.floor} onChange={set('floor')} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Facing</label>
            <input className="input" placeholder="e.g. North-East" value={form.facing} onChange={set('facing')} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Bedrooms</label>
            <input className="input" type="number" placeholder="e.g. 3" value={form.bedrooms} onChange={set('bedrooms')} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Bathrooms</label>
            <input className="input" type="number" placeholder="e.g. 3" value={form.bathrooms} onChange={set('bathrooms')} />
          </div>
        </div>

        {/* Project Inventory & Stock Availability Section */}
        <div className="rounded-xl border border-brand-200 bg-gradient-to-r from-brand-50/70 to-emerald-50/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-md bg-brand-600 text-xs text-white">📦</span>
              <h5 className="text-xs font-bold uppercase tracking-wider text-brand-900">
                Project Inventory: Number of Units Available in this Project
              </h5>
            </div>
            {form.status === 'SOLD' || (form.availableUnits !== '' && Number(form.availableUnits) <= 0) ? (
              <span className="rounded-full bg-rose-600 px-2.5 py-0.5 text-xs font-extrabold text-white shadow-xs">SOLD OUT</span>
            ) : (
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-extrabold text-emerald-800 ring-1 ring-emerald-300">
                {form.availableUnits || 1} of {form.totalUnits || 1} Available
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Available Units in Project *
              </label>
              <input
                className={`input bg-white font-bold ${
                  (form.availableUnits !== '' && Number(form.availableUnits) <= 0) || form.status === 'SOLD'
                    ? 'border-rose-300 text-rose-700 bg-rose-50/50'
                    : 'text-emerald-800'
                }`}
                type="number"
                min="0"
                required
                placeholder="e.g. 10"
                value={form.availableUnits}
                onChange={(e) => {
                  const raw = e.target.value;
                  const val = raw === '' ? '' : Math.max(0, parseInt(raw) || 0);
                  setForm((f) => ({
                    ...f,
                    availableUnits: val,
                    status: val !== '' && Number(val) <= 0 ? 'SOLD' : (f.status === 'SOLD' ? 'AVAILABLE' : f.status),
                  }));
                }}
              />
              <p className="mt-1 text-[11px] text-slate-500">Number of units currently ready &amp; available for sale.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Total Units of this Type *
              </label>
              <input
                className="input bg-white font-semibold"
                type="number"
                min="1"
                required
                placeholder="e.g. 10"
                value={form.totalUnits}
                onChange={(e) => {
                  const raw = e.target.value;
                  const val = raw === '' ? '' : Math.max(1, parseInt(raw) || 1);
                  setForm((f) => {
                    const shouldSync = f.availableUnits === '' || f.availableUnits === f.totalUnits || f.availableUnits === '1';
                    return {
                      ...f,
                      totalUnits: val,
                      availableUnits: shouldSync ? val : f.availableUnits,
                      status: (shouldSync && val === 0) ? 'SOLD' : (f.status === 'SOLD' && val > 0 ? 'AVAILABLE' : f.status),
                    };
                  });
                }}
              />
              <p className="mt-1 text-[11px] text-slate-500">Total units built or planned in the project.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Status
              </label>
              <select
                className={`input bg-white font-semibold ${
                  form.status === 'SOLD' ? 'border-rose-300 text-rose-700' : 'text-slate-800'
                }`}
                value={form.status}
                onChange={(e) => {
                  const s = e.target.value;
                  setForm((f) => ({
                    ...f,
                    status: s,
                    availableUnits: s === 'SOLD' ? 0 : (f.availableUnits === 0 || f.availableUnits === '0' ? (f.totalUnits || 1) : f.availableUnits),
                  }));
                }}
              >
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="SOLD">SOLD OUT (0 available)</option>
                <option value="ON_HOLD">ON HOLD</option>
              </select>
              <p className="mt-1 text-[11px] text-slate-500">When 0 units or SOLD OUT, displays Sold Out badge.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button type="button" onClick={() => setShowVideo((v) => !v)} className="text-xs font-medium text-brand-700 hover:underline">
            {showVideo ? '− Hide featured video' : '+ Add featured video for this unit'}
          </button>
          <button type="button" onClick={() => setShowComm((v) => !v)} className="text-xs font-medium text-brand-700 hover:underline">
            {showComm ? '− Hide commission' : '+ Set commission for this unit'}
          </button>
        </div>

        {showVideo && (
          <div className="max-w-lg space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-700">Featured video walkthrough</p>
            <VideoUpload
              value={form.videoUrl}
              folder="properties"
              onChange={(url) => setForm((f) => ({ ...f, videoUrl: url }))}
            />
            <p className="text-[11px] text-slate-400">Upload MP4, WebM or paste a YouTube / Vimeo link.</p>
          </div>
        )}
        {showComm && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <CommissionFields
              scheme={scheme}
              onChange={setScheme}
              sample={Number(form.price) || 10000000}
            />
          </div>
        )}

        <button className="btn-primary">
          Add Unit to Project ({form.availableUnits || 1} available)
        </button>
      </form>
    </fieldset>
  );
}
