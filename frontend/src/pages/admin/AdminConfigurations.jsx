import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, unwrap, apiError } from '../../lib/api';
import { PageLoader } from '../../components/ui';
import ImageUpload from '../../components/ImageUpload';

const FILTER_TYPES = [
  ['bedrooms', 'Bedrooms (BHK)', 'e.g. 2  or  4,5'],
  ['type', 'Project type', 'RESIDENTIAL | COMMERCIAL | PLOT | MIXED'],
  ['status', 'Possession status', 'UPCOMING | ONGOING | READY_TO_MOVE'],
  ['link', 'Custom link', '/properties?unitType=villa'],
];

const BLANK = { label: '', subtitle: '', imageUrl: '', icon: '', filterType: 'bedrooms', filterValue: '', isFeatured: true, isActive: true };

export default function AdminConfigurations() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-configs'], queryFn: () => unwrap(api.get('/configurations')) });
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(BLANK);
  const [editing, setEditing] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  useEffect(() => { if (data) setRows(data); }, [data]);
  if (isLoading) return <PageLoader />;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin-configs'] });
    qc.invalidateQueries({ queryKey: ['home'] });
    qc.invalidateQueries({ queryKey: ['configurations'] });
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editing) await api.patch(`/configurations/${editing}`, form);
      else await api.post('/configurations', form);
      toast.success(editing ? 'Updated' : 'Configuration added');
      setForm(BLANK); setEditing(null); refresh();
    } catch (err) { toast.error(apiError(err)); }
  };

  const edit = (c) => {
    setForm({
      label: c.label || '', subtitle: c.subtitle || '', imageUrl: c.imageUrl || '', icon: c.icon || '',
      filterType: c.filterType || 'bedrooms', filterValue: c.filterValue || '',
      isFeatured: c.isFeatured, isActive: c.isActive,
    });
    setEditing(c.id);
    window.scrollTo({ top: 9999, behavior: 'smooth' });
  };

  const patch = async (id, p) => { try { await api.patch(`/configurations/${id}`, p); refresh(); } catch (e) { toast.error(apiError(e)); } };
  const del = async (c) => {
    if (!confirm(`Delete "${c.label}"?`)) return;
    try { await api.delete(`/configurations/${c.id}`); refresh(); } catch (e) { toast.error(apiError(e)); }
  };
  const move = async (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const copy = [...rows];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    setRows(copy);
    try { await api.patch('/configurations', copy.map((c, idx) => ({ id: c.id, sortOrder: idx }))); refresh(); }
    catch (e) { toast.error(apiError(e)); }
  };

  const hint = FILTER_TYPES.find((f) => f[0] === form.filterType)?.[2];

  return (
    <div className="max-w-3xl space-y-6 pb-16">
      <div>
        <h1 className="text-xl font-bold">Configurations</h1>
        <p className="mt-1 text-sm text-slate-500">
          Tiles for the home page “Browse by configuration” section. Only <b>featured</b> ones appear there.
        </p>
      </div>

      <div className="card divide-y divide-slate-100">
        {rows.map((c, i) => (
          <div key={c.id} className="flex items-center gap-3 p-3 text-sm">
            <div className="flex flex-col text-slate-300">
              <button onClick={() => move(i, -1)} className="hover:text-slate-700">▲</button>
              <button onClick={() => move(i, 1)} className="hover:text-slate-700">▼</button>
            </div>
            {c.imageUrl
              ? <img src={c.imageUrl} alt="" className="h-12 w-16 rounded object-cover" />
              : <span className="grid h-12 w-16 place-items-center rounded bg-slate-100 text-lg">{c.icon || '🏠'}</span>}
            <div className="min-w-0 flex-1">
              <p className="font-medium">{c.label} {c.subtitle && <span className="text-slate-400">· {c.subtitle}</span>}</p>
              <p className="text-xs text-slate-400">{c.filterType}={c.filterValue || '—'} → {c.to}{c.count != null ? ` · ${c.count} matches` : ''}</p>
            </div>
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={c.isFeatured} onChange={(e) => patch(c.id, { isFeatured: e.target.checked })} /> Featured</label>
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={c.isActive} onChange={(e) => patch(c.id, { isActive: e.target.checked })} /> Active</label>
            <button className="text-xs text-brand-700 hover:underline" onClick={() => edit(c)}>Edit</button>
            <button className="text-xs text-rose-600 hover:underline" onClick={() => del(c)}>Delete</button>
          </div>
        ))}
        {!rows.length && <p className="p-6 text-center text-sm text-slate-400">No configurations yet.</p>}
      </div>

      <form onSubmit={submit} className="card space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{editing ? 'Edit configuration' : 'Add configuration'}</h2>
          {editing && <button type="button" className="btn-ghost" onClick={() => { setForm(BLANK); setEditing(null); }}>Cancel</button>}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label">Label *</label><input className="input" required value={form.label} onChange={set('label')} placeholder="2 BHK" /></div>
          <div><label className="label">Subtitle</label><input className="input" value={form.subtitle} onChange={set('subtitle')} placeholder="The everyday favourite" /></div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Links to</label>
            <select className="input" value={form.filterType} onChange={set('filterType')}>
              {FILTER_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div><label className="label">Value</label><input className="input" value={form.filterValue} onChange={set('filterValue')} placeholder={hint} /></div>
        </div>

        <div>
          <label className="label">Image</label>
          <ImageUpload value={form.imageUrl} folder="configurations" onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))} aspect="aspect-[4/3]" />
        </div>
        <div className="w-28"><label className="label">Emoji (fallback)</label><input className="input" value={form.icon} onChange={set('icon')} placeholder="🏠" /></div>

        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.isFeatured} onChange={set('isFeatured')} /> Featured (show on home)</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.isActive} onChange={set('isActive')} /> Active</label>
        </div>

        <button className="btn-primary">{editing ? 'Save changes' : 'Add configuration'}</button>
      </form>
    </div>
  );
}
