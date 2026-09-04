import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, apiError } from '../../lib/api';

const ALL_KINDS = ['IMAGE', 'FLOOR_PLAN', 'MASTER_PLAN', 'VIDEO', 'BROCHURE', 'TOUR_360'];

export default function MediaManager({ projectId, propertyId, media = [], kinds = ALL_KINDS, title = 'Media gallery' }) {
  const qc = useQueryClient();
  const [kind, setKind] = useState(kinds[0] || 'IMAGE');
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState(media.filter((m) => kinds.includes(m.kind)));

  const refresh = () => qc.invalidateQueries();

  const onFiles = async (e) => {
    const files = [...e.target.files];
    if (!files.length) return;
    const fd = new FormData();
    files.forEach((f) => fd.append('files', f));
    if (projectId) fd.append('projectId', projectId);
    if (propertyId) fd.append('propertyId', propertyId);
    fd.append('kind', kind);
    setBusy(true);
    try {
      const { data } = await api.post('/media/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setItems((prev) => [...prev, ...data.data]);
      toast.success(`${data.data.length} file(s) uploaded`);
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

  return (
    <fieldset className="card space-y-4 p-5">
      <legend className="px-1 text-sm font-semibold">{title}</legend>
      <div className="flex flex-wrap items-center gap-3">
        <select className="input max-w-[180px]" value={kind} onChange={(e) => setKind(e.target.value)}>
          {kinds.map((k) => <option key={k} value={k}>{k.replace('_', ' ')}</option>)}
        </select>
        <input type="file" multiple accept="image/*,video/*,application/pdf" onChange={onFiles} disabled={busy} />
        {busy && <span className="text-sm text-slate-400">Uploading…</span>}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((m) => (
          <div key={m.id} className="group relative overflow-hidden rounded-lg border border-slate-200">
            {m.kind === 'VIDEO' ? (
              <video src={m.url} className="aspect-square w-full object-cover" />
            ) : m.kind === 'BROCHURE' ? (
              <div className="grid aspect-square place-items-center bg-slate-50 text-xs text-slate-500">PDF</div>
            ) : (
              <img src={m.url} alt={m.title} className="aspect-square w-full object-cover" />
            )}
            <span className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[10px] text-white">{m.kind}</span>
            <button onClick={() => remove(m)}
              className="absolute right-1 top-1 rounded bg-rose-600 px-1.5 text-xs text-white opacity-0 group-hover:opacity-100">
              ✕
            </button>
          </div>
        ))}
        {!items.length && <p className="col-span-full py-4 text-center text-sm text-slate-400">No media uploaded.</p>}
      </div>
    </fieldset>
  );
}
