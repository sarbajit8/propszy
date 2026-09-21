import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, unwrap, apiError } from '../../lib/api';
import { PageLoader } from '../../components/ui';

const TOGGLE_LABELS = {
  trustBar: 'Stats bar', browseByType: 'Browse by configuration', cities: 'Explore cities',
  budget: 'Shop by budget', builders: 'Developers strip', topAgents: 'Top associates',
  howItWorks: 'How it works', whyUs: 'Why choose us', testimonials: 'Testimonials',
  blog: 'Blog', agentCta: 'Associate CTA', faq: 'FAQ', finalCta: 'Final CTA',
};

const newSection = () => ({
  key: `section-${Math.random().toString(36).slice(2, 7)}`,
  title: 'New section', subtitle: '', kind: 'projects', source: 'featured',
  limit: 8, enabled: true, fill: false, ids: [],
});

export default function AdminHome() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['home-config'], queryFn: () => unwrap(api.get('/home/config')) });
  const { data: cities = [] } = useQuery({ queryKey: ['cities-admin'], queryFn: () => unwrap(api.get('/cities')) });
  const [toggles, setToggles] = useState({});
  const [sections, setSections] = useState([]);
  const [saving, setSaving] = useState(false);
  const [pickFor, setPickFor] = useState(null); // section index for manual picker

  useEffect(() => {
    if (data) {
      setToggles(data.config.toggles || {});
      setSections((data.config.sections || []).map((s) => ({ ...s, ids: s.ids || [] })));
    }
  }, [data]);

  if (isLoading || !data) return <PageLoader />;
  const sources = data.sources;

  const upd = (i, patch) => setSections((arr) => arr.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const move = (i, dir) => setSections((arr) => {
    const j = i + dir;
    if (j < 0 || j >= arr.length) return arr;
    const copy = [...arr];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    return copy;
  });
  const del = (i) => setSections((arr) => arr.filter((_, idx) => idx !== i));

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/home/config', { toggles, sections });
      toast.success('Home page updated');
      qc.invalidateQueries({ queryKey: ['home-config'] });
      qc.invalidateQueries({ queryKey: ['home'] });
    } catch (e) { toast.error(apiError(e)); } finally { setSaving(false); }
  };

  const resetDefaults = async () => {
    if (!confirm('Reset the home page to the default sections?')) return;
    try {
      const fresh = await unwrap(api.post('/home/config/reset'));
      setToggles(fresh.toggles); setSections(fresh.sections.map((s) => ({ ...s, ids: s.ids || [] })));
      toast.success('Reset to defaults');
      qc.invalidateQueries({ queryKey: ['home'] });
    } catch (e) { toast.error(apiError(e)); }
  };

  return (
    <div className="max-w-4xl space-y-8 pb-16">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Home page manager</h1>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={resetDefaults}>Reset defaults</button>
          <button className="btn-primary" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>

      {/* fixed blocks */}
      <section className="card p-5">
        <h2 className="text-base font-semibold">Standard blocks</h2>
        <p className="mt-1 text-sm text-slate-500">Turn the non-listing sections on or off.</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Object.entries(TOGGLE_LABELS).map(([k, label]) => (
            <label key={k} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={toggles[k] !== false}
                onChange={(e) => setToggles((t) => ({ ...t, [k]: e.target.checked }))} />
              {label}
            </label>
          ))}
        </div>
      </section>

      {/* listing sections */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Listing sections ({sections.length})</h2>
          <button className="btn-outline" onClick={() => setSections((a) => [...a, newSection()])}>+ Add section</button>
        </div>

        {sections.map((s, i) => {
          const srcOptions = sources[s.kind] || [];
          return (
            <div key={s.key} className={`card p-4 ${s.enabled ? '' : 'opacity-60'}`}>
              <div className="flex items-start gap-3">
                <div className="flex flex-col gap-1 pt-1">
                  <button onClick={() => move(i, -1)} className="text-slate-400 hover:text-slate-700" title="Move up">▲</button>
                  <button onClick={() => move(i, 1)} className="text-slate-400 hover:text-slate-700" title="Move down">▼</button>
                </div>
                <div className="flex-1 space-y-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input className="input" value={s.title} onChange={(e) => upd(i, { title: e.target.value })} placeholder="Section title" />
                    <input className="input" value={s.subtitle} onChange={(e) => upd(i, { subtitle: e.target.value })} placeholder="Subtitle (optional)" />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-4">
                    <select className="input" value={s.kind} onChange={(e) => upd(i, { kind: e.target.value, source: (sources[e.target.value] || ['featured'])[0] })}>
                      <option value="projects">Projects</option>
                      <option value="properties">Properties</option>
                    </select>
                    <select className="input" value={s.source} onChange={(e) => upd(i, { source: e.target.value })}>
                      {srcOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <input className="input" type="number" min={3} max={24} value={s.limit}
                      onChange={(e) => upd(i, { limit: Number(e.target.value) })} placeholder="Limit" />
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={!!s.fill} onChange={(e) => upd(i, { fill: e.target.checked })} />
                      Top up if sparse
                    </label>
                  </div>

                  {s.source === 'city' && (
                    <select className="input" value={s.city || ''} onChange={(e) => upd(i, { city: e.target.value })}>
                      <option value="">Choose a city…</option>
                      {cities.map((c) => <option key={c.id} value={c.name}>{c.name} ({c.projectCount})</option>)}
                    </select>
                  )}

                  {s.source === 'manual' && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-500">{s.ids?.length || 0} item(s) chosen</span>
                      <button className="btn-outline" onClick={() => setPickFor(i)}>Pick {s.kind}</button>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <label className="flex items-center gap-1 text-xs">
                    <input type="checkbox" checked={s.enabled} onChange={(e) => upd(i, { enabled: e.target.checked })} /> On
                  </label>
                  <button className="text-xs text-rose-600 hover:underline" onClick={() => del(i)}>Delete</button>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {pickFor != null && (
        <ManualPicker
          kind={sections[pickFor].kind}
          selected={sections[pickFor].ids || []}
          onClose={() => setPickFor(null)}
          onSave={(ids) => { upd(pickFor, { ids }); setPickFor(null); }}
        />
      )}
    </div>
  );
}

function ManualPicker({ kind, selected, onClose, onSave }) {
  const [q, setQ] = useState('');
  const [chosen, setChosen] = useState(selected);
  const { data } = useQuery({
    queryKey: ['manual-pick', kind, q],
    queryFn: () => api.get(`/${kind === 'properties' ? 'properties' : 'projects'}`, { params: { q, limit: 20 } }).then((r) => r.data.data),
  });

  const toggle = (id) => setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold">Pick {kind}</h3>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>
        <input className="input" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="my-3 flex-1 space-y-1 overflow-y-auto">
          {(data || []).map((it) => (
            <label key={it.id} className="flex items-center gap-2 rounded p-2 text-sm hover:bg-slate-50">
              <input type="checkbox" checked={chosen.includes(it.id)} onChange={() => toggle(it.id)} />
              <span className="flex-1">{it.name || it.unitType} {it.project?.name ? `· ${it.project.name}` : ''}</span>
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => onSave(chosen)}>Use {chosen.length}</button>
        </div>
      </div>
    </div>
  );
}
