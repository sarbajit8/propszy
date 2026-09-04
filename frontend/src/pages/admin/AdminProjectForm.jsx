import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, unwrap, apiError } from '../../lib/api';
import { useAmenities } from '../../lib/queries';
import { PageLoader } from '../../components/ui';
import Stepper from '../../components/Stepper';
import ImageUpload from '../../components/ImageUpload';
import LocationPicker from '../../components/LocationPicker';
import MediaManager from './MediaManager';
import UnitsManager from './UnitsManager';
import { priceRange, TYPE_LABEL } from '../../lib/format';

const STEPS = ['Basics', 'Location', 'Plans & media', 'Inventory', 'Commission', 'Review'];

const EMPTY = {
  name: '', description: '', builder: '', developerId: '', reraNo: '',
  type: 'RESIDENTIAL', status: 'UPCOMING', possessionDate: '',
  priceMin: '', priceMax: '',
  lat: '', lng: '', address: '', city: '', state: '', pincode: '',
  coverImageUrl: '', masterPlanUrl: '', brochureUrl: '', virtualTourUrl: '', featuredVideoUrl: '',
  metaTitle: '', metaDescription: '',
  commissionBaseType: 'FLAT', commissionBaseValue: '0',
  isPublished: false, isFeatured: false, isTrending: false, isBestSeller: false,
  amenityIds: [],
};

export default function AdminProjectForm() {
  const { id } = useParams();
  const editing = id && id !== 'new';
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: amenities = [] } = useAmenities();
  const [newAmenity, setNewAmenity] = useState('');

  const addAmenity = async () => {
    const name = newAmenity.trim();
    if (!name) return;
    const existing = amenities.find((a) => a.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      setForm((f) => ({ ...f, amenityIds: [...new Set([...f.amenityIds, existing.id])] }));
      setNewAmenity('');
      return;
    }
    try {
      const { data } = await api.post('/amenities', { name });
      await qc.invalidateQueries({ queryKey: ['amenities'] });
      setForm((f) => ({ ...f, amenityIds: [...f.amenityIds, data.data.id] }));
      setNewAmenity('');
      toast.success(`Added “${name}”`);
    } catch (err) {
      // already exists (created elsewhere) — pull the fresh list and select it
      const fresh = await qc.fetchQuery({ queryKey: ['amenities'], queryFn: () => unwrap(api.get('/amenities')) }).catch(() => []);
      const match = fresh.find((a) => a.name.toLowerCase() === name.toLowerCase());
      if (match) {
        setForm((f) => ({ ...f, amenityIds: [...new Set([...f.amenityIds, match.id])] }));
        setNewAmenity('');
      } else {
        toast.error(apiError(err));
      }
    }
  };
  const { data: cities = [] } = useQuery({ queryKey: ['cities'], queryFn: () => unwrap(api.get('/cities')) });
  const { data: developers = [] } = useQuery({ queryKey: ['developers'], queryFn: () => unwrap(api.get('/developers')) });

  const [form, setForm] = useState(EMPTY);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const { data: existing, isLoading, refetch } = useQuery({
    queryKey: ['admin-project', id],
    queryFn: () => unwrap(api.get(`/projects/${id}`)),
    enabled: !!editing,
  });

  useEffect(() => {
    if (existing) {
      const loaded = Object.fromEntries(
        Object.entries(existing)
          .filter(([k]) => k in EMPTY)
          .map(([k, v]) => [k, v == null ? (typeof EMPTY[k] === 'boolean' ? false : '') : v]),
      );
      setForm({ ...EMPTY, ...loaded, amenityIds: (existing.amenities || []).map((a) => a.id) });
    }
  }, [existing]);

  if (editing && isLoading) return <PageLoader />;

  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
  };
  const toNum = (v) => (v === '' || v == null ? undefined : Number(v));

  const buildPayload = () => {
    const payload = {
      ...form,
      priceMin: toNum(form.priceMin), priceMax: toNum(form.priceMax),
      lat: toNum(form.lat), lng: toNum(form.lng),
      commissionBaseValue: toNum(form.commissionBaseValue) ?? 0,
    };
    Object.keys(payload).forEach((k) => (payload[k] === '' || payload[k] == null) && delete payload[k]);
    payload.developerId = form.developerId || null;
    return payload;
  };

  // Save current fields; create the project on first save of a new one.
  const save = async ({ advance = false } = {}) => {
    if (!form.name || form.name.trim().length < 2) {
      toast.error('Project name is required');
      setStep(0);
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/projects/${id}`, buildPayload());
        await refetch();
        toast.success('Saved');
      } else {
        const { data } = await api.post('/projects', buildPayload());
        toast.success('Project created — continue below');
        navigate(`/admin/projects/${data.data.id}`, { replace: true });
        setStep(1);
        setSaving(false);
        return;
      }
      if (advance) setStep((s) => Math.min(s + 1, STEPS.length - 1));
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  const needsProject = !editing;
  const units = existing?.properties || [];
  const media = existing?.media || [];
  const cityRow = cities.find((c) => c.name === form.city);
  const pickerCenter = cityRow?.lat && cityRow?.lng ? { lat: cityRow.lat, lng: cityRow.lng } : undefined;

  return (
    <div className="max-w-3xl space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{editing ? `Edit: ${form.name}` : 'New project'}</h1>
        <button type="button" className="text-sm text-slate-500 hover:underline" onClick={() => navigate('/admin/projects')}>
          Close
        </button>
      </div>

      <Stepper steps={STEPS} step={step} onGo={(i) => (editing || i === 0 ? setStep(i) : null)} />

      <div className="card space-y-5 p-5">
        {/* ── Step 0 · Basics ─────────────────────────── */}
        {step === 0 && (
          <>
            <div><label className="label">Name *</label><input className="input" required value={form.name} onChange={set('name')} /></div>
            <div><label className="label">Description</label><textarea className="input min-h-[100px]" value={form.description} onChange={set('description')} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Developer</label>
                <select className="input" value={form.developerId || ''} onChange={set('developerId')}>
                  <option value="">— none / use free text —</option>
                  {developers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <p className="mt-1 text-xs text-slate-400">
                  Add logos in <Link to="/admin/developers" className="text-brand-700 underline">Developers</Link>.
                </p>
              </div>
              <div>
                <label className="label">Builder (free text)</label>
                <input className="input" disabled={!!form.developerId}
                  value={form.developerId ? (developers.find((d) => d.id === form.developerId)?.name || '') : form.builder}
                  onChange={set('builder')} placeholder={form.developerId ? 'Set by the developer' : 'e.g. Prestige Group'} />
              </div>
              <div><label className="label">RERA number</label><input className="input" value={form.reraNo} onChange={set('reraNo')} /></div>
              <div>
                <label className="label">Type</label>
                <select className="input" value={form.type} onChange={set('type')}>
                  {['RESIDENTIAL', 'COMMERCIAL', 'PLOT', 'MIXED'].map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.status} onChange={set('status')}>
                  {['UPCOMING', 'ONGOING', 'READY_TO_MOVE'].map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Possession date</label>
                <input className="input" type="month" value={(form.possessionDate || '').slice(0, 7)} onChange={set('possessionDate')} />
              </div>
              <div><label className="label">Price min (₹)</label><input className="input" type="number" value={form.priceMin} onChange={set('priceMin')} /></div>
              <div><label className="label">Price max (₹)</label><input className="input" type="number" value={form.priceMax} onChange={set('priceMax')} /></div>
            </div>

            <fieldset className="rounded-lg border border-slate-200 p-3">
              <legend className="px-1 text-xs font-semibold text-slate-500">Amenities</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {amenities.map((a) => {
                  const checked = form.amenityIds.includes(a.id);
                  return (
                    <label key={a.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={checked}
                        onChange={() => setForm((f) => ({
                          ...f,
                          amenityIds: checked ? f.amenityIds.filter((x) => x !== a.id) : [...f.amenityIds, a.id],
                        }))} />
                      {a.name}
                    </label>
                  );
                })}
              </div>
              <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
                <input
                  className="input h-9 py-1 text-sm"
                  placeholder="Add another amenity…"
                  value={newAmenity}
                  onChange={(e) => setNewAmenity(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAmenity(); } }}
                />
                <button type="button" className="btn-outline h-9 shrink-0 px-3 py-1 text-xs" onClick={addAmenity}>
                  Add
                </button>
              </div>
            </fieldset>

            <fieldset className="rounded-lg border border-slate-200 p-3">
              <legend className="px-1 text-xs font-semibold text-slate-500">Visibility &amp; homepage</legend>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={form.isPublished} onChange={set('isPublished')} /> Published (visible on the public site)
              </label>
              <div className="mt-1 flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.isFeatured} onChange={set('isFeatured')} /> Featured</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.isTrending} onChange={set('isTrending')} /> Trending</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.isBestSeller} onChange={set('isBestSeller')} /> Best seller</label>
              </div>
            </fieldset>
          </>
        )}

        {/* ── Step 1 · Location ───────────────────────── */}
        {step === 1 && (
          <>
            <div>
              <label className="label">Pick on the map</label>
              <LocationPicker
                value={{ lat: form.lat, lng: form.lng }}
                fallbackCenter={pickerCenter}
                onPick={(loc) => setForm((f) => ({
                  ...f,
                  lat: loc.lat ?? f.lat,
                  lng: loc.lng ?? f.lng,
                  address: loc.address || f.address,
                  city: loc.city || f.city,
                  state: loc.state || f.state,
                  pincode: loc.pincode || f.pincode,
                }))}
              />
            </div>
            <div><label className="label">Address</label><input className="input" value={form.address} onChange={set('address')} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">City</label>
                <select className="input" value={form.city || ''}
                  onChange={(e) => {
                    const c = cities.find((x) => x.name === e.target.value);
                    setForm((f) => ({ ...f, city: e.target.value, state: c?.state || f.state, lat: f.lat || c?.lat || '', lng: f.lng || c?.lng || '' }));
                  }}>
                  <option value="">Select a city…</option>
                  {cities.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                  {form.city && !cities.some((c) => c.name === form.city) && <option value={form.city}>{form.city} (unlisted)</option>}
                </select>
              </div>
              <div><label className="label">State</label><input className="input" value={form.state} onChange={set('state')} /></div>
              <div><label className="label">Pincode</label><input className="input" value={form.pincode} onChange={set('pincode')} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Latitude</label><input className="input" value={form.lat} onChange={set('lat')} placeholder="12.9716" /></div>
              <div><label className="label">Longitude</label><input className="input" value={form.lng} onChange={set('lng')} placeholder="77.5946" /></div>
            </div>
            <p className="text-xs text-slate-400">Latitude / longitude fill in from the map above — edit here only to fine-tune.</p>
          </>
        )}

        {/* ── Step 2 · Plans & media ──────────────────── */}
        {step === 2 && (needsProject ? (
          <SaveFirst onSave={() => save()} label="media & plans" />
        ) : (
          <>
            <div>
              <label className="label">Cover image</label>
              <ImageUpload value={form.coverImageUrl} folder="projects"
                onChange={(url) => setForm((f) => ({ ...f, coverImageUrl: url }))} aspect="aspect-[16/9]" />
            </div>
            <div>
              <label className="label">Featured video URL</label>
              <input className="input" value={form.featuredVideoUrl} onChange={set('featuredVideoUrl')}
                placeholder="https://www.youtube.com/watch?v=… or an mp4 URL" />
              <p className="mt-1 text-xs text-slate-400">Shown as the highlight video on the project page.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label">Brochure URL (PDF)</label><input className="input" value={form.brochureUrl} onChange={set('brochureUrl')} /></div>
              <div><label className="label">Virtual tour URL</label><input className="input" value={form.virtualTourUrl} onChange={set('virtualTourUrl')} /></div>
            </div>
            <MediaManager key={`ph-${media.length}`} projectId={id} media={media}
              kinds={['IMAGE', 'VIDEO', 'TOUR_360']} title="Photo & video gallery" />
            <MediaManager key={`pl-${media.length}`} projectId={id} media={media}
              kinds={['MASTER_PLAN', 'FLOOR_PLAN', 'BROCHURE']} title="Master plan & floor plans" />
          </>
        ))}

        {/* ── Step 3 · Inventory ──────────────────────── */}
        {step === 3 && (needsProject ? (
          <SaveFirst onSave={() => save()} label="units" />
        ) : (
          <>
            <p className="text-sm text-slate-500">
              Add every unit / configuration. Tag each with a category — the project page shows a
              live count per category (e.g. “Villas 4 · 3 BHK 12”). Manage the list in{' '}
              <Link to="/admin/categories" className="text-brand-700 underline">Unit categories</Link>.
            </p>
            <UnitsManager key={units.length} projectId={id} units={units} />
          </>
        ))}

        {/* ── Step 4 · Commission ─────────────────────── */}
        {step === 4 && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Base type</label>
                <select className="input" value={form.commissionBaseType} onChange={set('commissionBaseType')}>
                  <option value="FLAT">Flat amount per conversion</option>
                  <option value="PERCENT">Percent of sale value</option>
                </select>
              </div>
              <div>
                <label className="label">{form.commissionBaseType === 'PERCENT' ? 'Percent (%)' : 'Amount (₹)'}</label>
                <input className="input" type="number" step="0.01" value={form.commissionBaseValue} onChange={set('commissionBaseValue')} />
              </div>
            </div>
            <p className="text-xs text-slate-400">
              This is the fallback base the MLM level rates apply against. Per-unit schemes set in the
              Inventory step override it.
            </p>
          </>
        )}

        {/* ── Step 5 · Review ─────────────────────────── */}
        {step === 5 && (
          <div className="space-y-4 text-sm">
            <Review label="Name" value={form.name} onEdit={() => setStep(0)} />
            <Review label="Developer" value={developers.find((d) => d.id === form.developerId)?.name || form.builder || '—'} onEdit={() => setStep(0)} />
            <Review label="Type / status" value={`${TYPE_LABEL[form.type] || form.type} · ${form.status}`} onEdit={() => setStep(0)} />
            <Review label="Price" value={priceRange(form.priceMin, form.priceMax)} onEdit={() => setStep(0)} />
            <Review label="Location" value={[form.address, form.city, form.state].filter(Boolean).join(', ') || '—'} onEdit={() => setStep(1)} />
            <Review label="Media" value={`${media.filter((m) => ['IMAGE', 'VIDEO'].includes(m.kind)).length} photos/videos · ${media.filter((m) => ['MASTER_PLAN', 'FLOOR_PLAN'].includes(m.kind)).length} plans${form.featuredVideoUrl ? ' · featured video' : ''}`} onEdit={() => setStep(2)} />
            <Review label="Inventory" value={units.length ? `${units.length} units` : 'No units yet'} onEdit={() => setStep(3)} />
            <label className="mt-2 flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm font-medium">
              <input type="checkbox" checked={form.isPublished} onChange={set('isPublished')} />
              Publish this project (visible on the public site)
            </label>
          </div>
        )}
      </div>

      {/* ── footer nav ─────────────────────────────── */}
      <div className="sticky bottom-0 flex items-center gap-2 border-t border-slate-200 bg-slate-50 py-3">
        <button type="button" className="btn-outline" disabled={step === 0 || saving}
          onClick={() => setStep((s) => Math.max(0, s - 1))}>
          Back
        </button>
        <div className="flex-1" />
        {step < STEPS.length - 1 ? (
          <button type="button" className="btn-primary" disabled={saving} onClick={() => save({ advance: true })}>
            {saving ? 'Saving…' : needsProject && step === 0 ? 'Create & continue' : 'Save & continue'}
          </button>
        ) : (
          <button type="button" className="btn-primary" disabled={saving} onClick={() => save()}>
            {saving ? 'Saving…' : form.isPublished ? 'Publish project' : 'Save project'}
          </button>
        )}
      </div>
    </div>
  );
}

function SaveFirst({ onSave, label }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center">
      <p className="text-sm text-slate-500">Save the first steps to start adding {label}.</p>
      <button type="button" className="btn-primary mt-3" onClick={onSave}>Create project now</button>
    </div>
  );
}

function Review({ label, value, onEdit }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2">
      <div>
        <p className="text-xs uppercase text-slate-400">{label}</p>
        <p className="font-medium text-slate-800">{value}</p>
      </div>
      <button type="button" className="shrink-0 text-xs text-brand-700 hover:underline" onClick={onEdit}>Edit</button>
    </div>
  );
}
