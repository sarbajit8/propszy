import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, apiError } from '../../lib/api';

const ALL_KINDS = ['IMAGE', 'FLOOR_PLAN', 'MASTER_PLAN', 'VIDEO', 'BROCHURE', 'TOUR_360'];

// kinds where each upload represents a distinct, named document (a specific floor's
// plan, a master layout, …) rather than an interchangeable photo — so we prompt for a name
const NAMED_KINDS = ['FLOOR_PLAN', 'MASTER_PLAN'];

export default function MediaManager({ projectId, propertyId, media = [], kinds = ALL_KINDS, title = 'Media gallery' }) {
  const qc = useQueryClient();
  const [kind, setKind] = useState(kinds[0] || 'IMAGE');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState(media.filter((m) => kinds.includes(m.kind)));
  const [renamingId, setRenamingId] = useState(null);

  const refresh = () => qc.invalidateQueries();
  const showName = NAMED_KINDS.includes(kind);

  const onFiles = async (e) => {
    const files = [...e.target.files];
    if (!files.length) return;
    const fd = new FormData();
    files.forEach((f) => fd.append('files', f));
    if (projectId) fd.append('projectId', projectId);
    if (propertyId) fd.append('propertyId', propertyId);
    fd.append('kind', kind);
    if (showName && name.trim()) fd.append('title', name.trim());
    setBusy(true);
    try {
      const { data } = await api.post('/media/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setItems((prev) => [...prev, ...data.data]);
      toast.success(`${data.data.length} file(s) uploaded`);
      setName('');
      refresh();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  const remove = async (m) => {
    try {
      await api.delete(`/media/${m.id}`);
      setItems((prev) => prev.filter((x) => x.id !== m.id));
      refresh();
    } catch (err) { toast.error(apiError(err)); }
  };

  const rename = async (m, newTitle) => {
    setItems((prev) => prev.map((x) => (x.id === m.id ? { ...x, title: newTitle } : x)));
    setRenamingId(null);
    if (newTitle === m.title) return;
    try {
      await api.patch(`/media/${m.id}`, { title: newTitle });
      refresh();
    } catch (err) { toast.error(apiError(err)); }
  };

  // The first item (lowest sortOrder) is used everywhere as the cover/featured
  // image — "featuring" one just moves it to the front via the reorder endpoint.
  const makeFeatured = async (m) => {
    const reordered = [m, ...items.filter((x) => x.id !== m.id)];
    setItems(reordered);
    try {
      await api.patch('/media/reorder', { ids: reordered.map((x) => x.id) });
      toast.success('Featured image updated');
      refresh();
    } catch (err) {
      toast.error(apiError(err));
    }
  };

  return (
    <fieldset className="card space-y-4 p-5">
      <legend className="px-1 text-sm font-semibold">{title}</legend>
      <div className="flex flex-wrap items-center gap-3">
        <select className="input max-w-[180px]" value={kind} onChange={(e) => setKind(e.target.value)}>
          {kinds.map((k) => <option key={k} value={k}>{k.replace('_', ' ')}</option>)}
        </select>
        {showName && (
          <input
            className="input max-w-[220px]"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={kind === 'MASTER_PLAN' ? 'e.g. Master Layout Plan' : 'e.g. 2 BHK Floor Plan'}
          />
        )}
        <input type="file" multiple accept="image/*,video/*,application/pdf" onChange={onFiles} disabled={busy} />
        {busy && <span className="text-sm text-slate-400">Uploading…</span>}
      </div>
      {showName && (
        <p className="text-xs text-slate-400">Name this map/plan before choosing a file (e.g. its unit type or block) so buyers can tell them apart.</p>
      )}
      {items.some((m) => m.kind === 'IMAGE') && (
        <p className="text-xs text-slate-400">The featured image is shown first on listings and cards. Hover a photo to change it.</p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((m, i) => {
          const isFeatured = m.kind === 'IMAGE' && i === 0;
          const named = NAMED_KINDS.includes(m.kind);
          return (
            <div key={m.id} className="group relative">
              <div className="relative overflow-hidden rounded-lg border border-slate-200">
                {m.kind === 'VIDEO' ? (
                  <video src={m.url} className="aspect-square w-full object-cover" />
                ) : m.kind === 'BROCHURE' ? (
                  <div className="grid aspect-square place-items-center bg-slate-50 text-xs text-slate-500">PDF</div>
                ) : (
                  <img src={m.url} alt={m.title} className="aspect-square w-full object-cover" />
                )}
                <span className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[10px] text-white">{m.kind.replace('_', ' ')}</span>
                {isFeatured && (
                  <span className="absolute bottom-1 left-1 flex items-center gap-1 rounded bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    ★ Featured
                  </span>
                )}
                {m.kind === 'IMAGE' && !isFeatured && (
                  <button onClick={() => makeFeatured(m)}
                    className="absolute bottom-1 left-1 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 opacity-0 shadow-sm hover:bg-white group-hover:opacity-100">
                    ★ Set as featured
                  </button>
                )}
                <button onClick={() => remove(m)}
                  className="absolute right-1 top-1 rounded bg-rose-600 px-1.5 text-xs text-white opacity-0 group-hover:opacity-100">
                  ✕
                </button>
              </div>
              {named && (
                renamingId === m.id ? (
                  <input
                    autoFocus
                    defaultValue={m.title || ''}
                    onBlur={(e) => rename(m, e.target.value.trim())}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                    className="mt-1 w-full rounded border border-brand-300 px-1.5 py-1 text-xs"
                  />
                ) : (
                  <button
                    onClick={() => setRenamingId(m.id)}
                    className="mt-1 w-full truncate rounded px-1 text-left text-xs text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                    title="Click to rename"
                  >
                    {m.title || 'Untitled — click to name'}
                  </button>
                )
              )}
            </div>
          );
        })}
        {!items.length && <p className="col-span-full py-4 text-center text-sm text-slate-400">No media uploaded.</p>}
      </div>
    </fieldset>
  );
}
