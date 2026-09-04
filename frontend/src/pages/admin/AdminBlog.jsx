import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, apiError } from '../../lib/api';
import { PageLoader } from '../../components/ui';
import ImageUpload from '../../components/ImageUpload';
import { fromNow } from '../../lib/format';

const BLANK = { title: '', category: '', excerpt: '', coverUrl: '', body: '', tags: '', status: 'DRAFT' };

export default function AdminBlog() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-posts'],
    queryFn: () => api.get('/cms/posts').then((r) => r.data.data), // staff → all
  });
  const [editing, setEditing] = useState(null); // post id or 'new' or null
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  if (isLoading) return <PageLoader />;

  const openNew = () => { setForm(BLANK); setEditing('new'); };
  const openEdit = (p) => {
    setForm({
      title: p.title || '', category: p.category || '', excerpt: p.excerpt || '',
      coverUrl: p.coverUrl || '', body: p.body || '', status: p.status || 'DRAFT',
      tags: Array.isArray(p.tags) ? p.tags.join(', ') : '',
    });
    setEditing(p.id);
  };

  const save = async (status) => {
    setSaving(true);
    const payload = {
      ...form,
      status: status || form.status,
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    };
    try {
      if (editing === 'new') await api.post('/cms/posts', payload);
      else await api.patch(`/cms/posts/${editing}`, payload);
      toast.success('Saved');
      setEditing(null);
      qc.invalidateQueries({ queryKey: ['admin-posts'] });
      qc.invalidateQueries({ queryKey: ['home'] });
      qc.invalidateQueries({ queryKey: ['posts'] });
    } catch (e) { toast.error(apiError(e)); } finally { setSaving(false); }
  };

  const remove = async (p) => {
    if (!confirm(`Delete "${p.title}"?`)) return;
    try {
      await api.delete(`/cms/posts/${p.id}`);
      qc.invalidateQueries({ queryKey: ['admin-posts'] });
      qc.invalidateQueries({ queryKey: ['home'] });
    } catch (e) { toast.error(apiError(e)); }
  };

  if (editing) {
    return (
      <div className="max-w-3xl space-y-5 pb-16">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">{editing === 'new' ? 'New article' : 'Edit article'}</h1>
          <button className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
        </div>

        <div className="card space-y-4 p-5">
          <div>
            <label className="label">Title *</label>
            <input className="input" value={form.title} onChange={set('title')} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label">Category</label><input className="input" value={form.category} onChange={set('category')} placeholder="Buying Guide" /></div>
            <div><label className="label">Tags (comma-separated)</label><input className="input" value={form.tags} onChange={set('tags')} /></div>
          </div>
          <div>
            <label className="label">Excerpt</label>
            <textarea className="input min-h-[60px]" value={form.excerpt} onChange={set('excerpt')} placeholder="One or two sentences shown on cards and at the top of the article." />
          </div>
          <div>
            <label className="label">Cover image</label>
            <ImageUpload value={form.coverUrl} folder="blog" onChange={(url) => setForm((f) => ({ ...f, coverUrl: url }))} />
          </div>
          <div>
            <label className="label">Body (HTML)</label>
            <textarea className="input min-h-[300px] font-mono text-xs" value={form.body} onChange={set('body')}
              placeholder="<p class='lead'>Opening line…</p>&#10;<h2>Section</h2>&#10;<p>…</p>&#10;<ul><li>point</li></ul>&#10;<blockquote>pull quote</blockquote>" />
            <p className="mt-1 text-xs text-slate-400">Supports p, h2, h3, ul/ol, blockquote, a, img. First paragraph renders as the lead.</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button className="btn-primary" disabled={saving} onClick={() => save('PUBLISHED')}>{saving ? 'Saving…' : 'Publish'}</button>
          <button className="btn-outline" disabled={saving} onClick={() => save('DRAFT')}>Save draft</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Blog</h1>
        <button className="btn-primary" onClick={openNew}>New article</button>
      </div>

      <div className="card divide-y divide-slate-100">
        {(data || []).map((p) => (
          <div key={p.id} className="flex items-center gap-3 p-3 text-sm">
            <img src={p.coverUrl || `https://picsum.photos/seed/b-${p.id}/80/56`} alt="" className="h-12 w-16 rounded object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{p.title}</p>
              <p className="text-xs text-slate-400">
                {p.category || 'Uncategorised'} · {p.readMinutes || 1} min ·{' '}
                {p.publishedAt ? `published ${fromNow(p.publishedAt)}` : `created ${fromNow(p.createdAt)}`}
              </p>
            </div>
            <span className={`badge ${p.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{p.status}</span>
            <button className="text-xs text-brand-700 hover:underline" onClick={() => openEdit(p)}>Edit</button>
            <a className="text-xs text-slate-500 hover:underline" href={`/blog/${p.slug}`} target="_blank" rel="noreferrer">View</a>
            <button className="text-xs text-rose-600 hover:underline" onClick={() => remove(p)}>Delete</button>
          </div>
        ))}
        {!data?.length && <p className="p-6 text-center text-sm text-slate-400">No articles yet.</p>}
      </div>
    </div>
  );
}
