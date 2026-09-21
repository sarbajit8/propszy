import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, unwrap, apiError } from '../../lib/api';
import { PageLoader } from '../../components/ui';
import ImageUpload from '../../components/ImageUpload';
import { citySkyline } from '../../lib/cityImages';

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
  'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Chandigarh', 'Puducherry', 'Jammu & Kashmir', 'Ladakh',
  'Andaman & Nicobar Islands', 'Dadra & Nagar Haveli and Daman & Diu', 'Lakshadweep',
];

const EMPTY = { name: '', state: '', imageUrl: '', isActive: true, isPopular: false, isFeatured: false };

export default function AdminCities() {
  const qc = useQueryClient();
  const { data: cities = [], isLoading } = useQuery({ queryKey: ['cities-admin'], queryFn: () => unwrap(api.get('/cities')) });
  const [form, setForm] = useState(EMPTY);
  const [filterState, setFilterState] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const refresh = () => qc.invalidateQueries({ queryKey: ['cities-admin'] });

  // group cities by state for the list
  const grouped = useMemo(() => {
    const rows = filterState ? cities.filter((c) => (c.state || 'Other') === filterState) : cities;
    const map = {};
    for (const c of rows) (map[c.state || 'Other'] ||= []).push(c);
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [cities, filterState]);

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
        The choices shown when adding a project and the hero chips. Cities marked <b>Featured</b> appear
        in the home page “Explore top cities” slider (with their image).
      </p>

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-slate-600">Filter by state</label>
        <select className="input max-w-xs" value={filterState} onChange={(e) => setFilterState(e.target.value)}>
          <option value="">All states</option>
          {[...new Set(cities.map((c) => c.state || 'Other'))].sort().map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="space-y-4">
        {grouped.map(([state, list]) => (
          <div key={state} className="card overflow-hidden">
            <p className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {state} <span className="text-slate-300">· {list.length}</span>
            </p>
            <div className="divide-y divide-slate-100">
              {list.map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-3 text-sm">
                  <img src={c.imageUrl || citySkyline(c.name)} alt="" className="h-10 w-16 rounded object-cover" />
                  <div className="flex-1">
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-slate-400">{c.projectCount} project{c.projectCount === 1 ? '' : 's'}</p>
                  </div>
                  <label className="flex items-center gap-1 text-xs">
                    <input type="checkbox" checked={c.isFeatured} onChange={(e) => patch(c.id, { isFeatured: e.target.checked })} /> Featured
                  </label>
                  <label className="flex items-center gap-1 text-xs">
                    <input type="checkbox" checked={c.isPopular} onChange={(e) => patch(c.id, { isPopular: e.target.checked })} /> Popular
                  </label>
                  <label className="flex items-center gap-1 text-xs">
                    <input type="checkbox" checked={c.isActive} onChange={(e) => patch(c.id, { isActive: e.target.checked })} /> Active
                  </label>
                  <button className="text-xs text-rose-600 hover:underline" onClick={() => del(c)}>Delete</button>
                </div>
              ))}
            </div>
          </div>
        ))}
        {!grouped.length && <p className="card p-6 text-center text-sm text-slate-400">No cities yet.</p>}
      </div>

      <form onSubmit={add} className="card grid gap-3 p-4 sm:grid-cols-2">
        <p className="sm:col-span-2 text-sm font-semibold">Add a city</p>
        <input className="input" placeholder="City name *" required value={form.name} onChange={set('name')} />
        <select className="input" value={form.state} onChange={set('state')} required>
          <option value="">Select state *</option>
          {STATES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <div className="sm:col-span-2">
          <label className="label">City image</label>
          <ImageUpload value={form.imageUrl} folder="cities" onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))} aspect="aspect-[4/3]" />
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isFeatured} onChange={set('isFeatured')} /> Featured (home page)</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isPopular} onChange={set('isPopular')} /> Popular (hero chips)</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={set('isActive')} /> Active</label>
        <button className="btn-primary sm:col-span-2">Add city</button>
      </form>
    </div>
  );
}
