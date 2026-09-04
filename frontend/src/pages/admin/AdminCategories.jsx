import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, unwrap, apiError } from '../../lib/api';
import { PageLoader } from '../../components/ui';

export default function AdminCategories() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['unit-categories-admin'],
    queryFn: () => unwrap(api.get('/unit-categories')),
  });
  const [parentName, setParentName] = useState('');
  const [child, setChild] = useState({}); // { [parentId]: name }
  const refresh = () => qc.invalidateQueries({ queryKey: ['unit-categories-admin'] });

  if (isLoading) return <PageLoader />;
  const tree = data?.tree || [];

  const create = async (payload) => {
    try {
      await api.post('/unit-categories', payload);
      refresh();
    } catch (err) { toast.error(apiError(err)); }
  };
  const patch = async (id, p) => {
    try { await api.patch(`/unit-categories/${id}`, p); refresh(); }
    catch (err) { toast.error(apiError(err)); }
  };
  const del = async (c) => {
    if (!confirm(`Delete "${c.name}"${c.children?.length ? ' and its sub-categories' : ''}? Units keep their data but lose the tag.`)) return;
    try { await api.delete(`/unit-categories/${c.id}`); refresh(); }
    catch (err) { toast.error(apiError(err)); }
  };

  const Row = ({ c, sub }) => (
    <div className={`flex items-center gap-3 py-2 text-sm ${sub ? 'pl-8' : 'font-medium'}`}>
      {sub && <span className="text-slate-300">└</span>}
      <span className="flex-1">
        {c.icon && <span className="mr-1.5">{c.icon}</span>}
        {c.name}
        <span className="ml-2 text-xs font-normal text-slate-400">{c.unitCount} unit{c.unitCount === 1 ? '' : 's'}</span>
      </span>
      <label className="flex items-center gap-1 text-xs font-normal">
        <input type="checkbox" checked={c.isActive} onChange={(e) => patch(c.id, { isActive: e.target.checked })} /> Active
      </label>
      <button className="text-xs text-rose-600 hover:underline" onClick={() => del(c)}>Delete</button>
    </div>
  );

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-bold">Unit categories</h1>
      <p className="text-sm text-slate-500">
        The Category → Sub-category taxonomy you assign to units. Project pages group inventory by
        these, with counts auto-calculated from the units you add.
      </p>

      <div className="card divide-y divide-slate-100 p-4">
        {tree.map((p) => (
          <div key={p.id} className="py-2 first:pt-0 last:pb-0">
            <Row c={p} />
            <div className="divide-y divide-slate-50">
              {(p.children || []).map((ch) => <Row key={ch.id} c={ch} sub />)}
            </div>
            <form
              className="mt-1.5 flex gap-2 pl-8"
              onSubmit={(e) => { e.preventDefault(); const name = (child[p.id] || '').trim(); if (name) { create({ name, parentId: p.id }); setChild((s) => ({ ...s, [p.id]: '' })); } }}
            >
              <input
                className="input h-8 py-1 text-sm"
                placeholder="Add sub-category…"
                value={child[p.id] || ''}
                onChange={(e) => setChild((s) => ({ ...s, [p.id]: e.target.value }))}
              />
              <button className="btn-outline h-8 px-3 py-1 text-xs">Add</button>
            </form>
          </div>
        ))}
        {!tree.length && <p className="py-6 text-center text-sm text-slate-400">No categories yet.</p>}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); if (parentName.trim()) { create({ name: parentName.trim() }); setParentName(''); } }}
        className="card flex gap-2 p-4"
      >
        <input className="input" placeholder="New top-level category (e.g. Residential)" value={parentName} onChange={(e) => setParentName(e.target.value)} />
        <button className="btn-primary shrink-0">Add category</button>
      </form>
    </div>
  );
}
