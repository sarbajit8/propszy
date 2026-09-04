import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, unwrap, apiError } from '../../lib/api';
import { PageLoader } from '../../components/ui';
import { citySkyline } from '../../lib/cityImages';

const EMPTY = { name: '', state: '', imageUrl: '', isActive: true, isPopular: false };

export default function AdminCities() {
  const qc = useQueryClient();
  const { data: cities = [], isLoading } = useQuery({ queryKey: ['cities-admin'], queryFn: () => unwrap(api.get('/cities')) });
  const [form, setForm] = useState(EMPTY);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const refresh = () => qc.invalidateQueries({ queryKey: ['cities-admin'] });

  if (isLoading) return <PageLoader />;

  const add = async (e) => {
    e.preventDefault();
    try {
      await api.post('/cities', { ...form, imageUrl: form.imageUrl || undefined });
      toast.success('City added');
      setForm(EMPTY);
      refresh();
    } catch (err) { toast.error(apiError(err)); }
  };

  const patch = async (id, p) => {
    try { await api.patch(`/cities/${id}`, p); refresh(); }
    catch (err) { toast.error(apiError(err)); }
  };

  const del = async (c) => {
    if (!confirm(`Delete ${c.name}? Projects keep their city text but it won't be a managed option.`)) return;
    try { await api.delete(`/cities/${c.id}`); refresh(); }
    catch (err) { toast.error(apiError(err)); }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-bold">Cities</h1>
      <p className="text-sm text-slate-500">
        These are the choices shown when adding a project, the hero chips, and the “Explore cities” section.
      </p>

      <div className="card divide-y divide-slate-100">
        {cities.map((c) => (
          <div key={c.id} className="flex items-center gap-3 p-3 text-sm">
            <img src={c.imageUrl || citySkyline(c.name)} alt="" className="h-10 w-16 rounded object-cover" />
            <div className="flex-1">
              <p className="font-medium">{c.name}</p>
              <p className="text-xs text-slate-400">{c.state || '—'} · {c.projectCount} projects</p>
            </div>
            <label className="flex items-center gap-1 text-xs">
              <input type="checkbox" checked={c.isPopular} onChange={(e) => patch(c.id, { isPopular: e.target.checked })} /> Popular
            </label>
            <label className="flex items-center gap-1 text-xs">
              <input type="checkbox" checked={c.isActive} onChange={(e) => patch(c.id, { isActive: e.target.checked })} /> Active
            </label>
            <button className="text-xs text-rose-600 hover:underline" onClick={() => del(c)}>Delete</button>
          </div>
        ))}
        {!cities.length && <p className="p-6 text-center text-sm text-slate-400">No cities yet.</p>}
      </div>

      <form onSubmit={add} className="card grid gap-3 p-4 sm:grid-cols-2">
        <input className="input" placeholder="City name *" required value={form.name} onChange={set('name')} />
        <input className="input" placeholder="State" value={form.state} onChange={set('state')} />
        <input className="input sm:col-span-2" placeholder="Image URL (optional)" value={form.imageUrl} onChange={set('imageUrl')} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isPopular} onChange={set('isPopular')} /> Popular (hero + top cities)</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={set('isActive')} /> Active</label>
        <button className="btn-primary sm:col-span-2">Add city</button>
      </form>
    </div>
  );
}
