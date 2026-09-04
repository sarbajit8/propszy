import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, unwrap, apiError } from '../../lib/api';
import ImageUpload from '../../components/ImageUpload';

export default function AdminHeroSlider() {
  const qc = useQueryClient();
  const { data: fetched = [], isLoading } = useQuery({
    queryKey: ['hero-banners'],
    queryFn: () => unwrap(api.get('/cms/banners', { params: { placement: 'home_hero' } })),
  });
  const [slides, setSlides] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setSlides(fetched); setDirty(false); }, [fetched]);

  const upd = (i, patch) => { setSlides((a) => a.map((s, idx) => (idx === i ? { ...s, ...patch } : s))); setDirty(true); };
  const move = (i, dir) => {
    setSlides((a) => {
      const j = i + dir;
      if (j < 0 || j >= a.length) return a;
      const c = [...a]; [c[i], c[j]] = [c[j], c[i]]; return c;
    });
    setDirty(true);
  };

  const addSlide = async () => {
    try {
      const created = await unwrap(api.post('/cms/banners', {
        placement: 'home_hero', imageUrl: `https://picsum.photos/seed/hero-${Date.now()}/1920/900`,
        title: 'New slide', sortOrder: slides.length,
      }));
      setSlides((a) => [...a, created]);
      qc.invalidateQueries({ queryKey: ['home'] });
    } catch (e) { toast.error(apiError(e)); }
  };

  const removeSlide = async (s) => {
    if (!confirm('Delete this slide?')) return;
    try {
      await api.delete(`/cms/banners/${s.id}`);
      setSlides((a) => a.filter((x) => x.id !== s.id));
      qc.invalidateQueries({ queryKey: ['home'] });
    } catch (e) { toast.error(apiError(e)); }
  };

  const save = async () => {
    setSaving(true);
    try {
      // persist each slide's fields + the new order
      await Promise.all(slides.map((s, i) =>
        api.patch(`/cms/banners/${s.id}`, {
          title: s.title || '', subtitle: s.subtitle || '',
          imageUrl: s.imageUrl, linkUrl: s.linkUrl || '', ctaLabel: s.ctaLabel || '',
          isActive: s.isActive !== false, sortOrder: i,
        })
      ));
      toast.success('Hero slider saved');
      setDirty(false);
      qc.invalidateQueries({ queryKey: ['hero-banners'] });
      qc.invalidateQueries({ queryKey: ['home'] });
    } catch (e) { toast.error(apiError(e)); } finally { setSaving(false); }
  };

  if (isLoading) return <p className="text-sm text-slate-400">Loading slider…</p>;

  return (
    <section>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Hero slider</h2>
          <p className="text-sm text-slate-500">Images rotate behind the search bar on the home page.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-outline" onClick={addSlide}>+ Add slide</button>
          <button className="btn-primary" disabled={saving || !dirty} onClick={save}>{saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}</button>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {slides.map((s, i) => (
          <div key={s.id} className={`card p-4 ${s.isActive === false ? 'opacity-60' : ''}`}>
            <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
              <ImageUpload value={s.imageUrl} folder="hero" onChange={(url) => upd(i, { imageUrl: url })} />
              <div className="space-y-2">
                <input className="input" placeholder="Headline" value={s.title || ''} onChange={(e) => upd(i, { title: e.target.value })} />
                <input className="input" placeholder="Sub-headline" value={s.subtitle || ''} onChange={(e) => upd(i, { subtitle: e.target.value })} />
                <div className="grid gap-2 sm:grid-cols-2">
                  <input className="input" placeholder="Button link (e.g. /projects?status=UPCOMING)" value={s.linkUrl || ''} onChange={(e) => upd(i, { linkUrl: e.target.value })} />
                  <input className="input" placeholder="Button label" value={s.ctaLabel || ''} onChange={(e) => upd(i, { ctaLabel: e.target.value })} />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={s.isActive !== false} onChange={(e) => upd(i, { isActive: e.target.checked })} />
                    Active
                  </label>
                  <div className="flex items-center gap-3 text-sm">
                    <button className="text-slate-400 hover:text-slate-700" onClick={() => move(i, -1)}>▲</button>
                    <button className="text-slate-400 hover:text-slate-700" onClick={() => move(i, 1)}>▼</button>
                    <button className="text-rose-600 hover:underline" onClick={() => removeSlide(s)}>Delete</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        {!slides.length && <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">No slides — the home page shows the gradient hero.</p>}
      </div>
    </section>
  );
}
