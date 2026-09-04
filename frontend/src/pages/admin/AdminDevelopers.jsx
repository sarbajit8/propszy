import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, unwrap, apiError } from '../../lib/api';
import { PageLoader } from '../../components/ui';
import ImageUpload from '../../components/ImageUpload';

const EMPTY = { name: '', website: '', description: '', logoUrl: '', foundedYear: '', totalProjects: '', isActive: true, isFeatured: false };
const clean = (f) => ({
  ...f,
  website: f.website || undefined,
  description: f.description || undefined,
  logoUrl: f.logoUrl || undefined,
  foundedYear: f.foundedYear === '' ? null : Number(f.foundedYear),
  totalProjects: f.totalProjects === '' ? null : Number(f.totalProjects),
});

function DeveloperRow({ d, onPatch, onDelete }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(d);
  useEffect(() => setF(d), [d]);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  return (
    <div className="p-3 text-sm">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-16 shrink-0 place-items-center overflow-hidden rounded bg-slate-100">
          {d.logoUrl ? <img src={d.logoUrl} alt="" className="h-full w-full object-contain" />
            : <span className="text-xs font-semibold text-slate-400">{d.name.slice(0, 2).toUpperCase()}</span>}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{d.name}</p>
          <p className="truncate text-xs text-slate-400">
            {d.foundedYear ? `est. ${d.foundedYear} · ` : ''}{d.projectCount} projects{d.website ? ` · ${d.website}` : ''}
          </p>
        </div>
        <label className="flex items-center gap-1 text-xs">
          <input type="checkbox" checked={d.isFeatured} onChange={(e) => onPatch(d.id, { isFeatured: e.target.checked })} /> Featured
        </label>
        <label className="flex items-center gap-1 text-xs">
          <input type="checkbox" checked={d.isActive} onChange={(e) => onPatch(d.id, { isActive: e.target.checked })} /> Active
        </label>
        <button className="text-xs text-brand-700 hover:underline" onClick={() => setOpen((v) => !v)}>{open ? 'Close' : 'Edit'}</button>
        <button className="text-xs text-rose-600 hover:underline" onClick={() => onDelete(d)}>Delete</button>
      </div>

      {open && (
        <div className="mt-3 grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-2">
          <input className="input" placeholder="Name" value={f.name || ''} onChange={set('name')} />
          <input className="input" placeholder="Website" value={f.website || ''} onChange={set('website')} />
          <input className="input" type="number" placeholder="Year established (e.g. 2005)" value={f.foundedYear ?? ''} onChange={set('foundedYear')} />
          <input className="input" type="number" placeholder="Total projects (blank = live count)" value={f.totalProjects ?? ''} onChange={set('totalProjects')} />
          <textarea className="input sm:col-span-2" rows={3} placeholder="About this developer" value={f.description || ''} onChange={set('description')} />
          <div className="sm:col-span-2">
            <label className="label">Logo</label>
            <ImageUpload value={f.logoUrl} folder="developers" onChange={(url) => setF((s) => ({ ...s, logoUrl: url }))} aspect="aspect-[3/2]" />
          </div>
          <button className="btn-primary sm:col-span-2"
            onClick={() => onPatch(d.id, {
              name: f.name, website: f.website || '', description: f.description || '', logoUrl: f.logoUrl || '',
              foundedYear: f.foundedYear === '' || f.foundedYear == null ? null : Number(f.foundedYear),
              totalProjects: f.totalProjects === '' || f.totalProjects == null ? null : Number(f.totalProjects),
            }, () => setOpen(false))}>
            Save changes
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminDevelopers() {
  const qc = useQueryClient();
  const { data: developers = [], isLoading } = useQuery({
    queryKey: ['developers-admin'],
    queryFn: () => unwrap(api.get('/developers')),
  });
  const [form, setForm] = useState(EMPTY);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const refresh = () => qc.invalidateQueries({ queryKey: ['developers-admin'] });

  if (isLoading) return <PageLoader />;

  const add = async (e) => {
    e.preventDefault();
    try {
      await api.post('/developers', clean(form));
      toast.success('Developer added');
      setForm(EMPTY);
      refresh();
    } catch (err) { toast.error(apiError(err)); }
  };
  const patch = async (id, p, after) => {
    try { await api.patch(`/developers/${id}`, p); refresh(); after?.(); }
    catch (err) { toast.error(apiError(err)); }
  };
  const del = async (d) => {
    if (!confirm(`Delete ${d.name}? Projects keep their builder text but lose the linked logo.`)) return;
    try { await api.delete(`/developers/${d.id}`); refresh(); }
    catch (err) { toast.error(apiError(err)); }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-bold">Developers</h1>
      <p className="text-sm text-slate-500">
        The builders you can pick when adding a project. Featured ones show in the home page
        “Prominent builders” carousel with their year established, project count and about text.
      </p>

      <div className="card divide-y divide-slate-100">
        {developers.map((d) => <DeveloperRow key={d.id} d={d} onPatch={patch} onDelete={del} />)}
        {!developers.length && <p className="p-6 text-center text-sm text-slate-400">No developers yet.</p>}
      </div>

      <form onSubmit={add} className="card grid gap-3 p-4 sm:grid-cols-2">
        <input className="input" placeholder="Developer name *" required value={form.name} onChange={set('name')} />
        <input className="input" placeholder="Website (https://…)" value={form.website} onChange={set('website')} />
        <input className="input" type="number" placeholder="Year established" value={form.foundedYear} onChange={set('foundedYear')} />
        <input className="input" type="number" placeholder="Total projects (optional)" value={form.totalProjects} onChange={set('totalProjects')} />
        <textarea className="input sm:col-span-2" placeholder="About this developer" value={form.description} onChange={set('description')} />
        <div className="sm:col-span-2">
          <label className="label">Logo</label>
          <ImageUpload value={form.logoUrl} folder="developers" onChange={(url) => setForm((f) => ({ ...f, logoUrl: url }))} aspect="aspect-[3/2]" />
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isFeatured} onChange={set('isFeatured')} /> Featured (home page)</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={set('isActive')} /> Active</label>
        <button className="btn-primary sm:col-span-2">Add developer</button>
      </form>
    </div>
  );
}
