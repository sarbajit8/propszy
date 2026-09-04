import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, apiError } from '../../lib/api';
import { priceRange } from '../../lib/format';
import DataTable from '../../components/DataTable';

export default function AdminProjects() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['admin-projects', page, q],
    queryFn: () => api.get('/projects', { params: { page, q, limit: 15 } }).then((r) => r.data),
  });

  const togglePublish = async (p) => {
    try {
      await api.patch(`/projects/${p.id}`, { isPublished: !p.isPublished });
      toast.success(p.isPublished ? 'Unpublished' : 'Published');
      qc.invalidateQueries({ queryKey: ['admin-projects'] });
    } catch (e) { toast.error(apiError(e)); }
  };

  const remove = async (p) => {
    if (!confirm(`Delete "${p.name}"? This removes its units and media.`)) return;
    try {
      await api.delete(`/projects/${p.id}`);
      toast.success('Project deleted');
      qc.invalidateQueries({ queryKey: ['admin-projects'] });
    } catch (e) { toast.error(apiError(e)); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Projects</h1>
        <Link to="/admin/projects/new" className="btn-primary">New project</Link>
      </div>
      <input className="input max-w-xs" placeholder="Search projects…" value={q}
        onChange={(e) => { setQ(e.target.value); setPage(1); }} />

      <DataTable
        loading={isLoading}
        rows={data?.data}
        meta={data?.meta}
        onPage={setPage}
        empty="No projects yet"
        columns={[
          { key: 'name', header: 'Name', render: (r) => (
            <div>
              <Link to={`/admin/projects/${r.id}`} className="font-medium hover:text-brand-700">{r.name}</Link>
              <p className="text-xs text-slate-400">{r.city || '—'} · {r.builder || '—'}</p>
            </div>
          )},
          { key: 'type', header: 'Type' },
          { key: 'price', header: 'Price', render: (r) => priceRange(r.priceMin, r.priceMax) },
          { key: 'units', header: 'Units', render: (r) => r.counts?.properties ?? 0 },
          { key: 'commission', header: 'Commission', render: (r) => `${r.commissionBaseValue}${r.commissionBaseType === 'PERCENT' ? '%' : ' flat'}` },
          { key: 'published', header: 'Published', render: (r) => (
            <button onClick={() => togglePublish(r)}
              className={`badge ${r.isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
              {r.isPublished ? 'Live' : 'Draft'}
            </button>
          )},
          { key: 'actions', header: '', render: (r) => (
            <div className="flex gap-2 text-xs">
              <Link to={`/admin/projects/${r.id}`} className="text-brand-700 hover:underline">Edit</Link>
              <button onClick={() => remove(r)} className="text-rose-600 hover:underline">Delete</button>
            </div>
          )},
        ]}
      />
    </div>
  );
}
