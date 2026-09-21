import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, unwrap, apiError } from '../../lib/api';
import { PageLoader } from '../../components/ui';
import MediaManager from './MediaManager';
import LocationPicker from '../../components/LocationPicker';
import ImageUpload from '../../components/ImageUpload';
import VideoUpload from '../../components/VideoUpload';
import { Pills, Chips, WizardSidebar } from '../../components/WizardKit';
import { CommissionFields, DEFAULT_SCHEME } from './CommissionEditor';
import { inr, videoEmbed } from '../../lib/format';

// the Commission step is staff-only — a customer self-listing a property never
// sets commission, only an admin approving/managing a listing does
const ALL_STEPS = [
  { key: 'basic', label: 'Basic Details' },
  { key: 'location', label: 'Location Details' },
  { key: 'profile', label: 'Property Profile' },
  { key: 'media', label: 'Photos, Plans & Media' },
  { key: 'pricing', label: 'Pricing & Others' },
  { key: 'commission', label: 'Commission', staffOnly: true },
  { key: 'amenities', label: 'Amenities section' },
];

const INTENTS = [['SALE', 'Sell'], ['RENT', 'Rent / Lease'], ['PG', 'PG']];
const BEDS = ['1', '2', '3', '4', '5+'];
const OPEN_SIDES = ['1', '2', '3', '3+'];
const FACINGS = ['North', 'South', 'East', 'West', 'North-East', 'North-West', 'South-East', 'South-West'];
const CONSTRUCTION_TYPES = ['Shed', 'Room(s)', 'Washroom', 'Other'];
const OWNERSHIP = ['Freehold', 'Leasehold', 'Power of Attorney'];
const INDUSTRY_TYPES = ['IT / ITES', 'Manufacturing', 'Warehousing', 'Retail', 'Hospitality', 'Healthcare', 'Other'];
const LOCATION_ADV = ['Close to Metro Station', 'Close to School', 'Close to Hospital', 'Close to Market', 'Close to Railway Station', 'Close to Highway'];
const AMENITIES = ['Service / Goods Lift', 'Water Storage', 'Waste Disposal', 'Rain Water Harvesting', 'Vaastu Compliant', 'Lift(s)', 'Fire Sprinklers', 'Intercom'];
const PROPERTY_FEATURES = ['Private Garden', 'Covered Parking', 'Open Parking', 'Security / Fire Alarm', 'Piped Gas', 'Water Purifier', 'False Ceiling', 'Wi-Fi Ready'];
const BUILDING_FEATURES = ['Maintenance Staff', 'Roof Rights', 'Gated Society', 'DG Availability', 'Visitor Parking', 'CCTV Surveillance'];
const OTHER_FEATURES = ['Corner Property'];

const EMPTY = {
  projectId: '', listingIntent: 'SALE', parentCategory: '', categoryId: '', name: '', unitType: '',
  coverImageUrl: '',
  subLocality: '', city: '', state: '', lat: '', lng: '', isPublished: false,
  carpetArea: '', builtUpArea: '', areaUnit: 'sqft',
  plotLength: '', plotBreadth: '', openSides: '',
  bedrooms: '', bathrooms: '', floor: '', facing: '',
  isConstructed: '', constructionTypes: [],
  price: '', pricePerSqft: '', priceNegotiable: false, taxExcluded: false,
  isPreLeased: '', preLeasedRent: '', preLeasedTenureYears: '', expectedReturnsPercent: '',
  description: '', videoUrl: '', status: 'AVAILABLE',
  totalUnits: '1', availableUnits: '1',
  ownership: '', roadWidthFt: '', approvedIndustryType: '', locationAdvantages: [],
  amenities: [], propertyFeatures: [], buildingFeatures: [], otherFeatures: [],
  commissionScheme: null,
};

/* ── page ────────────────────────────────────────────────── */

export default function AdminPropertyForm() {
  const { id } = useParams();
  const location = useLocation();
  const customerMode = location.pathname.startsWith('/account');
  const listPath = customerMode ? '/account/properties' : '/admin/properties';
  const STEPS = customerMode ? ALL_STEPS.filter((s) => !s.staffOnly) : ALL_STEPS;
  const editing = id && id !== 'new';
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-for-property'],
    queryFn: () => unwrap(api.get('/projects', { params: { limit: 200, published: undefined } })),
    enabled: !customerMode,
  });
  const { data: catData } = useQuery({ queryKey: ['unit-categories'], queryFn: () => unwrap(api.get('/unit-categories')) });
  const catTree = catData?.tree || [];

  const { data: existing, isLoading, refetch } = useQuery({
    queryKey: ['admin-property', id],
    queryFn: () => unwrap(api.get(`/properties/${id}`)),
    enabled: !!editing,
  });

  useEffect(() => {
    if (existing) {
      const d = existing.details || {};
      const primaryImage = existing.media?.find((m) => m.kind === 'IMAGE')?.url || '';
      setForm({
        ...EMPTY,
        coverImageUrl: primaryImage,
        projectId: existing.projectId || '',
        listingIntent: existing.listingIntent || 'SALE',
        // find whichever parent's children list contains this category — don't rely on
        // existing.category.parentId being fetched, just search the taxonomy tree directly
        parentCategory: existing.categoryId
          ? catTree.find((p) => p.children?.some((c) => c.id === existing.categoryId))?.id || ''
          : '',
        categoryId: existing.categoryId || '',
        name: existing.name || '',
        unitType: existing.unitType || '',
        carpetArea: existing.carpetArea ?? '', builtUpArea: existing.builtUpArea ?? '', areaUnit: existing.areaUnit || 'sqft',
        bedrooms: existing.bedrooms != null ? String(existing.bedrooms) : '', bathrooms: existing.bathrooms ?? '', floor: existing.floor || '', facing: existing.facing || '',
        price: existing.price ?? '', description: existing.description || '', videoUrl: existing.videoUrl || '',
        status: existing.status || 'AVAILABLE',
        totalUnits: existing.totalUnits ?? 1,
        availableUnits: existing.availableUnits ?? (existing.status === 'SOLD' ? 0 : 1),
        city: existing.city || '', state: existing.state || '', isPublished: !!existing.isPublished,
        lat: existing.latOverride ?? '', lng: existing.lngOverride ?? '',
        subLocality: d.subLocality || '', plotLength: d.plotLength ?? '', plotBreadth: d.plotBreadth ?? '', openSides: d.openSides || '',
        isConstructed: d.isConstructed === true ? 'yes' : d.isConstructed === false ? 'no' : '',
        constructionTypes: d.constructionTypes || [],
        pricePerSqft: d.pricePerSqft ?? '', priceNegotiable: !!d.priceNegotiable, taxExcluded: !!d.taxExcluded,
        isPreLeased: d.isPreLeased === true ? 'yes' : d.isPreLeased === false ? 'no' : '',
        preLeasedRent: d.preLeasedRent ?? '', preLeasedTenureYears: d.preLeasedTenureYears ?? '', expectedReturnsPercent: d.expectedReturnsPercent ?? '',
        ownership: d.ownership || '', roadWidthFt: d.roadWidthFt ?? '', approvedIndustryType: d.approvedIndustryType || '',
        locationAdvantages: d.locationAdvantages || [],
        amenities: d.amenityTags?.amenities || [], propertyFeatures: d.amenityTags?.propertyFeatures || [],
        buildingFeatures: d.amenityTags?.buildingFeatures || [], otherFeatures: d.amenityTags?.otherFeatures || [],
        commissionScheme: existing.commissionScheme || null,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing, catTree.length]);

  // derived state — computed unconditionally, before any early return, so every
  // hook below (useMemo included) always runs on every render (rules of hooks).
  const parentOptions = catTree; // Residential / Plot-Land / Commercial
  const childOptions = catTree.find((p) => p.id === form.parentCategory)?.children || [];
  const isPlot = parentOptions.find((p) => p.id === form.parentCategory)?.slug === 'plot-land';
  const media = existing?.media || [];

  const score = useMemo(() => {
    const checklist = [
      form.projectId || form.city, form.categoryId, form.unitType, form.carpetArea || form.plotLength,
      isPlot ? form.openSides : form.bedrooms, form.price, form.description,
      form.coverImageUrl || media.length > 0, form.videoUrl,
      form.amenities.length || form.propertyFeatures.length, form.ownership,
    ];
    return Math.round((checklist.filter(Boolean).length / checklist.length) * 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, media.length, isPlot]);

  if (editing && isLoading) return <PageLoader />;

  const set = (k) => (e) => {
    const v = e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e;
    setForm((f) => ({ ...f, [k]: v }));
  };

  const selectedProject = projects.find((p) => p.id === form.projectId);
  const isCommercial = parentOptions.find((p) => p.id === form.parentCategory)?.slug === 'commercial';

  const toNum = (v) => (v === '' || v == null ? undefined : Number(v));
  const toUrl = (v) => (!v ? undefined : /^https?:\/\/|^\/uploads\//i.test(v) ? v : `https://${v}`);

  const buildPayload = () => {
    const details = {
      subLocality: form.subLocality || undefined,
      plotLength: toNum(form.plotLength), plotBreadth: toNum(form.plotBreadth),
      openSides: form.openSides || undefined,
      isConstructed: form.isConstructed === 'yes' ? true : form.isConstructed === 'no' ? false : undefined,
      constructionTypes: form.constructionTypes.length ? form.constructionTypes : undefined,
      pricePerSqft: toNum(form.pricePerSqft), priceNegotiable: form.priceNegotiable, taxExcluded: form.taxExcluded,
      isPreLeased: form.isPreLeased === 'yes' ? true : form.isPreLeased === 'no' ? false : undefined,
      preLeasedRent: toNum(form.preLeasedRent), preLeasedTenureYears: toNum(form.preLeasedTenureYears),
      expectedReturnsPercent: toNum(form.expectedReturnsPercent),
      ownership: form.ownership || undefined, roadWidthFt: toNum(form.roadWidthFt),
      approvedIndustryType: form.approvedIndustryType || undefined,
      locationAdvantages: form.locationAdvantages.length ? form.locationAdvantages : undefined,
      amenityTags: {
        amenities: form.amenities, propertyFeatures: form.propertyFeatures,
        buildingFeatures: form.buildingFeatures, otherFeatures: form.otherFeatures,
      },
    };
    const payload = {
      coverImageUrl: form.coverImageUrl || undefined,
      projectId: form.projectId || null, listingIntent: form.listingIntent,
      categoryId: form.categoryId || null, name: form.name.trim() || undefined, unitType: form.unitType,
      carpetArea: toNum(form.carpetArea), builtUpArea: toNum(form.builtUpArea), areaUnit: form.areaUnit,
      bedrooms: isPlot ? undefined : toNum(String(form.bedrooms).replace('+', '')), bathrooms: isPlot ? undefined : toNum(form.bathrooms),
      floor: form.floor || undefined, facing: form.facing || undefined,
      price: toNum(form.price), description: form.description || undefined, videoUrl: toUrl(form.videoUrl.trim()),
      status: form.status, details,
      totalUnits: toNum(form.totalUnits) != null ? Math.max(1, toNum(form.totalUnits)) : 1,
      availableUnits: toNum(form.availableUnits) != null ? Math.max(0, toNum(form.availableUnits)) : (form.status === 'SOLD' ? 0 : 1),
      // only meaningful without a project, but harmless to send either way (act as overrides)
      city: form.projectId ? undefined : form.city || undefined,
      state: form.projectId ? undefined : form.state || undefined,
      isPublished: form.projectId ? undefined : form.isPublished,
      latOverride: toNum(form.lat), lngOverride: toNum(form.lng),
    };
    // commission is a staff-only concern — never sent from the customer self-listing form
    if (!customerMode) payload.commissionScheme = form.commissionScheme;
    const keep = new Set(['categoryId', 'projectId']);
    Object.keys(payload).forEach((k) => (payload[k] === '' || payload[k] == null) && !keep.has(k) && delete payload[k]);
    return payload;
  };

  const save = async ({ advance = false, finish = false } = {}) => {
    if (!form.unitType.trim()) { toast.error('Please give this listing a label (e.g. 3 BHK)'); setStep(0); return; }
    const hasImage = !!(form.coverImageUrl?.trim() || media.some((m) => m.kind === 'IMAGE'));
    if (!hasImage) {
      toast.error('Cover image is mandatory. Please upload a cover photo.');
      if (step !== 0 && step !== 3) setStep(0);
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/properties/${id}`, buildPayload());
        if (finish) {
          toast.success('Property saved successfully');
          navigate(listPath);
          return;
        }
        await refetch();
        toast.success('Saved');
      } else {
        const { data } = await api.post('/properties', buildPayload());
        toast.success('Property created — continue below');
        navigate(`${listPath}/${data.data.id}`, { replace: true });
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

  const needsProperty = !editing;

  const summaryFor = (i) => {
    const key = STEPS[i]?.key;
    if (key === 'basic') return form.name || form.unitType || (form.parentCategory ? parentOptions.find((p) => p.id === form.parentCategory)?.name : '');
    if (key === 'location') return form.subLocality || selectedProject?.city || form.city || '';
    if (key === 'profile') return form.carpetArea ? `${form.carpetArea} ${form.areaUnit}` : '';
    if (key === 'media') return media.length ? `${media.length} photo${media.length === 1 ? '' : 's'}` : '';
    if (key === 'pricing') return form.price ? `${inr(form.price)} • ${form.availableUnits || 1} avail` : '';
    if (key === 'commission') return form.commissionScheme?.enabled ? `${form.commissionScheme.poolValue}${form.commissionScheme.poolType === 'PERCENT' ? '%' : ' flat'}` : 'Not set';
    return '';
  };

  return (
    <div className="grid gap-6 pb-16 lg:grid-cols-[260px_1fr]">
      <WizardSidebar
        steps={STEPS} step={step} onGo={setStep} summaryFor={summaryFor}
        canGo={(i) => editing || i === 0}
        score={score} scoreLabel="Property Score" scoreHint="Better your property score, greater its visibility"
      />

      {/* content */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">
            {editing ? `Edit: ${form.name || form.unitType || 'property'}` : customerMode ? 'List your property' : 'Add a property'}
          </h1>
          <button type="button" className="text-sm text-slate-500 hover:underline" onClick={() => navigate(listPath)}>Close</button>
        </div>

        <div className="card space-y-5 p-6">
          {/* Step 0 · Basic Details */}
          {step === 0 && (
            <>
              <div>
                <label className="label">Property name</label>
                <input className="input" value={form.name} onChange={set('name')}
                  placeholder="e.g. Sunshine Residency 3BHK, Green Valley Villa" />
                <p className="mt-1 text-xs text-slate-400">
                  Shown as the listing's title everywhere. Leave blank to just use the listing label below.
                </p>
              </div>

              {customerMode ? (
                <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-800">
                  You're listing an independent property (not tied to any builder project). Our team will review it before it goes live.
                </p>
              ) : (
                <div>
                  <p className="label">Project (optional)</p>
                  <select className="input" value={form.projectId} onChange={set('projectId')}>
                    <option value="">Not part of a project — standalone listing</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.city}</option>)}
                  </select>
                  <p className="mt-1 text-xs text-slate-400">
                    Adding it <b>project-wise</b> inherits the project's location, media and RERA details.
                    Leave it blank for a standalone listing (e.g. a resale flat, independent house or plot). Don't see the project?{' '}
                    <Link to="/admin/projects/new" className="text-brand-700 underline">Create it first</Link>.
                  </p>
                </div>
              )}

              {/* When adding project-wise, expose Available Units in this Project immediately */}
              {form.projectId && (
                <div className="rounded-xl border border-brand-200 bg-gradient-to-r from-brand-50/70 to-emerald-50/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="grid h-6 w-6 place-items-center rounded-md bg-brand-600 text-xs text-white">📦</span>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-brand-900">
                        Project Inventory: Available Units in this Project
                      </h4>
                    </div>
                    {form.status === 'SOLD' || (form.availableUnits !== '' && Number(form.availableUnits) <= 0) ? (
                      <span className="rounded-full bg-rose-600 px-2.5 py-0.5 text-xs font-extrabold text-white shadow-xs">SOLD OUT</span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-extrabold text-emerald-800 ring-1 ring-emerald-300">
                        {form.availableUnits || 1} of {form.totalUnits || 1} Available
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600">
                    Specify the number of <strong>{form.unitType || 'this property type'}</strong> available for booking in <strong>{selectedProject?.name || 'this project'}</strong>.
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">Available Stock in Project *</label>
                      <input
                        className={`input bg-white font-bold ${
                          (form.availableUnits !== '' && Number(form.availableUnits) <= 0) || form.status === 'SOLD'
                            ? 'border-rose-300 text-rose-700 bg-rose-50/50'
                            : 'text-emerald-800'
                        }`}
                        type="number"
                        min="0"
                        placeholder="e.g. 10"
                        value={form.availableUnits}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const val = raw === '' ? '' : Math.max(0, parseInt(raw) || 0);
                          setForm((f) => ({
                            ...f,
                            availableUnits: val,
                            status: val !== '' && Number(val) <= 0 ? 'SOLD' : (f.status === 'SOLD' ? 'AVAILABLE' : f.status),
                          }));
                        }}
                      />
                      <p className="mt-1 text-[11px] text-slate-500">Units currently available for buyers to purchase.</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">Total Units of this Type *</label>
                      <input
                        className="input bg-white font-semibold"
                        type="number"
                        min="1"
                        placeholder="e.g. 10"
                        value={form.totalUnits}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const val = raw === '' ? '' : Math.max(1, parseInt(raw) || 1);
                          setForm((f) => {
                            const shouldSync = f.availableUnits === '' || f.availableUnits === f.totalUnits || f.availableUnits === '1';
                            return {
                              ...f,
                              totalUnits: val,
                              availableUnits: shouldSync ? val : f.availableUnits,
                              status: (shouldSync && val === 0) ? 'SOLD' : (f.status === 'SOLD' && val > 0 ? 'AVAILABLE' : f.status),
                            };
                          });
                        }}
                      />
                      <p className="mt-1 text-[11px] text-slate-500">Total planned units of this typology in the project.</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">Status</label>
                      <select
                        className={`input bg-white font-semibold ${
                          form.status === 'SOLD' ? 'border-rose-300 text-rose-700' : 'text-slate-800'
                        }`}
                        value={form.status}
                        onChange={(e) => {
                          const s = e.target.value;
                          setForm((f) => ({
                            ...f,
                            status: s,
                            availableUnits: s === 'SOLD' ? 0 : (f.availableUnits === 0 || f.availableUnits === '0' ? (f.totalUnits || 1) : f.availableUnits),
                          }));
                        }}
                      >
                        <option value="AVAILABLE">AVAILABLE</option>
                        <option value="SOLD">SOLD OUT (0 available)</option>
                        <option value="ON_HOLD">ON HOLD</option>
                      </select>
                      <p className="mt-1 text-[11px] text-slate-500">Setting SOLD OUT marks stock as 0.</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <p className="label">You're looking to…</p>
                <Pills options={INTENTS} value={form.listingIntent} onChange={(v) => v && set('listingIntent')(v)}
                  labelOf={([, l]) => l} valueOf={([v]) => v} />
              </div>

              <div>
                <p className="label">And it's a…</p>
                <Pills options={parentOptions} value={form.parentCategory}
                  onChange={(v) => setForm((f) => ({ ...f, parentCategory: v, categoryId: '' }))}
                  labelOf={(o) => o.name} valueOf={(o) => o.id} />
              </div>

              {childOptions.length > 0 && (
                <div>
                  <p className="label">Property type</p>
                  <Pills options={childOptions} value={form.categoryId} onChange={(v) => v && set('categoryId')(v)}
                    labelOf={(o) => o.name} valueOf={(o) => o.id} />
                </div>
              )}

              <div>
                <label className="label">Listing label *</label>
                <input className="input" value={form.unitType} onChange={set('unitType')}
                  placeholder={isPlot ? 'e.g. Plot 1200 sqft' : isCommercial ? 'e.g. Shop No. 4' : 'e.g. 3 BHK'} />
              </div>

              <div>
                <label className="label">Cover photo *</label>
                <ImageUpload
                  value={form.coverImageUrl}
                  folder="properties"
                  onChange={(url) => setForm((f) => ({ ...f, coverImageUrl: url }))}
                  aspect="aspect-[16/9]"
                />
                <p className="mt-1 text-xs text-slate-400">Mandatory cover photo for the listing. Shown as the primary image on cards and details.</p>
              </div>

              <div>
                <label className="label">Featured video (optional)</label>
                <VideoUpload
                  value={form.videoUrl}
                  folder="properties"
                  onChange={(url) => setForm((f) => ({ ...f, videoUrl: url }))}
                />
                <p className="mt-1 text-xs text-slate-400">Upload a normal video walkthrough (MP4, WebM, MOV) or paste a YouTube / Vimeo link. Shown on the property page and in the project's configurations & video tours.</p>
              </div>
            </>
          )}

          {/* Step 1 · Location Details */}
          {step === 1 && (
            <>
              <p className="text-sm text-slate-500">An accurate location helps you connect with the right buyers.</p>

              <div>
                <label className="label">Pick on the map</label>
                <LocationPicker
                  value={{ lat: form.lat, lng: form.lng }}
                  fallbackCenter={selectedProject?.lat && selectedProject?.lng ? { lat: selectedProject.lat, lng: selectedProject.lng } : undefined}
                  onPick={(loc) => setForm((f) => ({
                    ...f,
                    lat: loc.lat ?? f.lat,
                    lng: loc.lng ?? f.lng,
                    city: loc.city || f.city,
                    state: loc.state || f.state,
                  }))}
                />
                <p className="mt-1 text-xs text-slate-400">
                  {form.projectId
                    ? 'Optional — set an exact pin for this unit (e.g. a specific tower or block); otherwise it uses the project\'s location.'
                    : 'Search, or click the map / drag the pin, to set the exact spot.'}
                </p>
              </div>

              {form.projectId ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><label className="label">City</label><input className="input bg-slate-50" value={selectedProject?.city || ''} disabled /></div>
                  <div><label className="label">Project</label><input className="input bg-slate-50" value={selectedProject?.name || ''} disabled /></div>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><label className="label">City *</label><input className="input" value={form.city} onChange={set('city')} placeholder="e.g. Kolkata" /></div>
                  <div><label className="label">State</label><input className="input" value={form.state} onChange={set('state')} placeholder="e.g. West Bengal" /></div>
                </div>
              )}
              <div><label className="label">Sub locality (optional)</label><input className="input" value={form.subLocality} onChange={set('subLocality')} placeholder="e.g. Near City Centre Mall" /></div>

              {!form.projectId && !customerMode && (
                <label className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm font-medium">
                  <input type="checkbox" checked={form.isPublished} onChange={set('isPublished')} />
                  Publish this standalone listing (visible on the public site)
                </label>
              )}
              {customerMode && (
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  {existing?.isPublished
                    ? 'This listing is live on the public site.'
                    : 'This listing is saved as a draft — it goes live once our team reviews and approves it.'}
                </p>
              )}
            </>
          )}

          {/* Step 2 · Property Profile */}
          {step === 2 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Carpet area</label><input className="input" type="number" value={form.carpetArea} onChange={set('carpetArea')} /></div>
                <div>
                  <label className="label">Unit</label>
                  <select className="input" value={form.areaUnit} onChange={set('areaUnit')}>
                    {['sqft', 'sqm', 'acres', 'gunta'].map((u) => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div><label className="label">Built-up area</label><input className="input" type="number" value={form.builtUpArea} onChange={set('builtUpArea')} /></div>
              </div>

              {isPlot ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="label">Length of plot (ft)</label><input className="input" type="number" value={form.plotLength} onChange={set('plotLength')} /></div>
                    <div><label className="label">Breadth of plot (ft)</label><input className="input" type="number" value={form.plotBreadth} onChange={set('plotBreadth')} /></div>
                  </div>
                  <div>
                    <p className="label">No. of open sides</p>
                    <Pills options={OPEN_SIDES} value={form.openSides} onChange={(v) => v && set('openSides')(v)} />
                  </div>
                  <div>
                    <p className="label">Any construction done on this property?</p>
                    <Pills options={['yes', 'no']} value={form.isConstructed} onChange={(v) => v && set('isConstructed')(v)}
                      labelOf={(o) => (o === 'yes' ? 'Yes' : 'No')} />
                  </div>
                  {form.isConstructed === 'yes' && (
                    <div>
                      <p className="label">What type of construction?</p>
                      <Chips options={CONSTRUCTION_TYPES} value={form.constructionTypes} onChange={(v) => setForm((f) => ({ ...f, constructionTypes: v }))} />
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <p className="label">Bedrooms</p>
                    <Pills options={BEDS} value={form.bedrooms} onChange={(v) => v && set('bedrooms')(v)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="label">Bathrooms</label><input className="input" type="number" value={form.bathrooms} onChange={set('bathrooms')} /></div>
                    <div><label className="label">Floor</label><input className="input" value={form.floor} onChange={set('floor')} placeholder="e.g. 5 of 12" /></div>
                  </div>
                  <div>
                    <p className="label">Facing</p>
                    <Pills options={FACINGS} value={form.facing} onChange={(v) => v && set('facing')(v)} />
                  </div>
                </>
              )}
            </>
          )}

          {/* Step 3 · Photos, Video & Media */}
          {step === 3 && (needsProperty ? (
            <SaveFirst onSave={() => save()} label="photos & video" />
          ) : (
            <>
              <div>
                <label className="label">Cover photo *</label>
                <ImageUpload
                  value={form.coverImageUrl || media.find((m) => m.kind === 'IMAGE')?.url || ''}
                  folder="properties"
                  onChange={(url) => setForm((f) => ({ ...f, coverImageUrl: url }))}
                  aspect="aspect-[16/9]"
                />
                <p className="mt-1 text-xs text-slate-400">Primary cover photo for this property.</p>
              </div>
              <div>
                <label className="label">Featured video</label>
                <VideoUpload
                  value={form.videoUrl}
                  folder="properties"
                  onChange={(url) => setForm((f) => ({ ...f, videoUrl: url }))}
                />
                <p className="mt-1 text-xs text-slate-400">Upload a normal video walkthrough (MP4, WebM, MOV) or paste a YouTube / Vimeo link. Shown on the property page and in the project's configurations & video tours.</p>
              </div>
              <MediaManager key={`ph-${media.length}`} propertyId={id} media={media} kinds={['IMAGE']} title="Property photos" />
              {!media.length && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Without photos your listing gets far fewer responses — add at least 4–5 for best results.
                </p>
              )}
              <MediaManager key={`pl-${media.length}`} propertyId={id} media={media}
                kinds={['FLOOR_PLAN', 'MASTER_PLAN']} title="Floor plan & layout maps" />
            </>
          ))}

          {/* Step 4 · Pricing & Others */}
          {step === 4 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Expected price (₹)</label><input className="input" type="number" value={form.price} onChange={set('price')} /></div>
                <div><label className="label">Price per {form.areaUnit} (₹, optional)</label><input className="input" type="number" value={form.pricePerSqft} onChange={set('pricePerSqft')} /></div>
              </div>
              <div className="flex flex-wrap gap-5">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.taxExcluded} onChange={set('taxExcluded')} /> Tax & govt. charges excluded</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.priceNegotiable} onChange={set('priceNegotiable')} /> Price negotiable</label>
              </div>

              <div>
                <p className="label">Is it Pre-leased / Pre-rented?</p>
                <Pills options={['yes', 'no']} value={form.isPreLeased} onChange={(v) => v && set('isPreLeased')(v)} labelOf={(o) => (o === 'yes' ? 'Yes' : 'No')} />
              </div>
              {form.isPreLeased === 'yes' && (
                <div className="grid grid-cols-3 gap-3 rounded-lg bg-slate-50 p-3">
                  <div><label className="label">Current rent (₹/mo)</label><input className="input" type="number" value={form.preLeasedRent} onChange={set('preLeasedRent')} /></div>
                  <div><label className="label">Lease tenure (yrs)</label><input className="input" type="number" value={form.preLeasedTenureYears} onChange={set('preLeasedTenureYears')} /></div>
                  <div><label className="label">Expected returns (%)</label><input className="input" type="number" value={form.expectedReturnsPercent} onChange={set('expectedReturnsPercent')} /></div>
                </div>
              )}

              <div>
                <label className="label">What makes this property unique</label>
                <textarea className="input min-h-[100px]" maxLength={5000} value={form.description} onChange={set('description')}
                  placeholder="Share details like spacious rooms, well-maintained facilities…" />
                <p className="mt-1 text-right text-xs text-slate-400">{form.description.length}/5000</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Inventory &amp; Stock Management</h4>
                  {form.status === 'SOLD' || (form.availableUnits !== '' && Number(form.availableUnits) <= 0) ? (
                    <span className="rounded-full bg-rose-600 px-2.5 py-0.5 text-xs font-extrabold text-white">SOLD OUT</span>
                  ) : (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-extrabold text-emerald-800">
                      {form.availableUnits || 1} Available
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="label">Total Units</label>
                    <input
                      className="input bg-white"
                      type="number"
                      min="1"
                      placeholder="1"
                      value={form.totalUnits}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const val = raw === '' ? '' : Math.max(1, parseInt(raw) || 1);
                        setForm((f) => {
                          const shouldSync = f.availableUnits === '' || f.availableUnits === f.totalUnits || f.availableUnits === '1';
                          return {
                            ...f,
                            totalUnits: val,
                            availableUnits: shouldSync ? val : f.availableUnits,
                            status: (shouldSync && val === 0) ? 'SOLD' : (f.status === 'SOLD' && val > 0 ? 'AVAILABLE' : f.status),
                          };
                        });
                      }}
                    />
                    <p className="mt-1 text-[11px] text-slate-400">Total physical units built or planned.</p>
                  </div>

                  <div>
                    <label className="label">Available Stock</label>
                    <input
                      className={`input bg-white font-semibold ${
                        (form.availableUnits !== '' && Number(form.availableUnits) <= 0) || form.status === 'SOLD'
                          ? 'border-rose-300 text-rose-700 bg-rose-50/50'
                          : 'text-emerald-800'
                      }`}
                      type="number"
                      min="0"
                      placeholder="1"
                      value={form.availableUnits}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const val = raw === '' ? '' : Math.max(0, parseInt(raw) || 0);
                        setForm((f) => ({
                          ...f,
                          availableUnits: val,
                          status: val !== '' && Number(val) <= 0 ? 'SOLD' : (f.status === 'SOLD' ? 'AVAILABLE' : f.status),
                        }));
                      }}
                    />
                    <p className="mt-1 text-[11px] text-slate-400">When 0, automatically marked SOLD OUT.</p>
                  </div>

                  <div>
                    <label className="label">Status</label>
                    <select
                      className={`input bg-white font-semibold ${
                        form.status === 'SOLD' ? 'border-rose-300 text-rose-700' : 'text-slate-800'
                      }`}
                      value={form.status}
                      onChange={(e) => {
                        const s = e.target.value;
                        setForm((f) => {
                          const patch = { status: s };
                          if (s === 'SOLD') patch.availableUnits = 0;
                          else if (s === 'AVAILABLE' && (f.availableUnits === '' || Number(f.availableUnits) <= 0)) {
                            patch.availableUnits = f.totalUnits || 1;
                          }
                          return { ...f, ...patch };
                        });
                      }}
                    >
                      <option value="AVAILABLE">AVAILABLE</option>
                      <option value="SOLD">SOLD OUT</option>
                      <option value="ON_HOLD">ON HOLD</option>
                    </select>
                    <p className="mt-1 text-[11px] text-slate-400">Current availability status.</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Commission (staff only) */}
          {STEPS[step]?.key === 'commission' && (
            <>
              <p className="text-sm text-slate-500">
                Set how much commission this sale generates and how it's split down the MLM sponsor chain.
                This never appears on the customer's own listing form — only staff set it.
              </p>
              <CommissionFields
                scheme={form.commissionScheme || { ...DEFAULT_SCHEME, enabled: false }}
                onChange={(scheme) => setForm((f) => ({ ...f, commissionScheme: scheme }))}
                sample={Number(form.price) || 10000000}
              />
            </>
          )}

          {/* Amenities */}
          {STEPS[step]?.key === 'amenities' && (
            <>
              <div><p className="label">Amenities</p><Chips options={AMENITIES} value={form.amenities} onChange={(v) => setForm((f) => ({ ...f, amenities: v }))} /></div>
              <div><p className="label">Property features</p><Chips options={PROPERTY_FEATURES} value={form.propertyFeatures} onChange={(v) => setForm((f) => ({ ...f, propertyFeatures: v }))} /></div>
              <div><p className="label">Building feature</p><Chips options={BUILDING_FEATURES} value={form.buildingFeatures} onChange={(v) => setForm((f) => ({ ...f, buildingFeatures: v }))} /></div>
              <div><p className="label">Other features</p><Chips options={OTHER_FEATURES} value={form.otherFeatures} onChange={(v) => setForm((f) => ({ ...f, otherFeatures: v }))} limit={4} /></div>

              <div><p className="label">Ownership</p><Pills options={OWNERSHIP} value={form.ownership} onChange={(v) => v && set('ownership')(v)} /></div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Width of facing road (ft)</label><input className="input" type="number" value={form.roadWidthFt} onChange={set('roadWidthFt')} /></div>
                {isCommercial && (
                  <div>
                    <label className="label">Approved for industry type</label>
                    <select className="input" value={form.approvedIndustryType} onChange={set('approvedIndustryType')}>
                      <option value="">Select…</option>
                      {INDUSTRY_TYPES.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <p className="label">Location advantages</p>
                <Chips options={LOCATION_ADV} value={form.locationAdvantages} onChange={(v) => setForm((f) => ({ ...f, locationAdvantages: v }))} />
              </div>
            </>
          )}
        </div>

        {/* footer nav */}
        <div className="sticky bottom-0 flex items-center gap-2 border-t border-slate-200 bg-slate-50 py-3">
          <button type="button" className="btn-outline" disabled={step === 0 || saving} onClick={() => setStep((s) => Math.max(0, s - 1))}>Back</button>
          <div className="flex-1" />
          {step < STEPS.length - 1 ? (
            <button type="button" className="btn-primary" disabled={saving} onClick={() => save({ advance: true })}>
              {saving ? 'Saving…' : needsProperty && step === 0 ? 'Create & continue' : 'Save & continue'}
            </button>
          ) : (
            <button type="button" className="btn-primary" disabled={saving} onClick={() => save({ finish: true })}>{saving ? 'Saving…' : 'Save property'}</button>
          )}
        </div>
      </div>
    </div>
  );
}

function SaveFirst({ onSave, label }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center">
      <p className="text-sm text-slate-500">Save the first steps to start adding {label}.</p>
      <button type="button" className="btn-primary mt-3" onClick={onSave}>Create property now</button>
    </div>
  );
}
