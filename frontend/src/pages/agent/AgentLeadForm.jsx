import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, unwrap, apiError } from '../../lib/api';
import { useCities } from '../../lib/queries';
import { inr } from '../../lib/format';
import Stepper from '../../components/Stepper';

const STEPS = ['Customer', 'Requirement', 'Interest', 'Review'];
const PURPOSES = [['', 'Not sure yet'], ['BUY', 'Buy'], ['RENT', 'Rent'], ['INVEST', 'Investment']];

const EMPTY = {
  name: '', phone: '', email: '', aadhaar: '', pan: '',
  purpose: '', preferredCity: '', preferredArea: '', requirement: '', bedroomsWanted: '',
  budgetMin: '', budgetMax: '',
  projectId: '', propertyId: '',
  message: '',
};

/* project typeahead */
function ProjectPicker({ value, onPick }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const { data } = useQuery({
    queryKey: ['lead-proj-search', q],
    queryFn: () => api.get('/projects', { params: { q, limit: 8 } }).then((r) => r.data.data),
    enabled: open,
  });

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
        <span className="truncate font-medium">{value.name}<span className="ml-1 text-slate-400">· {value.city}</span></span>
        <button type="button" onClick={() => onPick(null)} className="text-xs text-rose-600 hover:underline">Change</button>
      </div>
    );
  }
  return (
    <div className="relative">
      <input className="input" placeholder="Search a project…" value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} />
      {open && (data?.length || q.length > 1) && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {(data || []).map((p) => (
            <button key={p.id} type="button"
              onClick={() => { onPick(p); setOpen(false); setQ(''); }}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50">
              <span className="font-medium">{p.name}</span>
              <span className="ml-1 text-xs text-slate-400">{p.city} · {p.type}</span>
            </button>
          ))}
          {!data?.length && <p className="px-3 py-2 text-sm text-slate-400">No matches</p>}
        </div>
      )}
    </div>
  );
}

const Row = ({ k, v }) => (v ? <div className="flex justify-between gap-3 py-1"><dt className="text-slate-400">{k}</dt><dd className="text-right font-medium">{v}</dd></div> : null);

export default function AgentLeadForm() {
  const navigate = useNavigate();
  const { data: cities = [] } = useCities();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(EMPTY);
  const [project, setProject] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const { data: units = [] } = useQuery({
    queryKey: ['lead-proj-units', project?.id],
    queryFn: () => unwrap(api.get('/properties', { params: { projectId: project.id, limit: 50 } })),
    enabled: !!project?.id,
  });
  useEffect(() => { setForm((f) => ({ ...f, projectId: project?.id || '', propertyId: '' })); }, [project]);

  const done = [
    !!form.name.trim() && !!form.phone.trim(),
    step > 1,
    step > 2,
    false,
  ];

  const next = () => {
    if (step === 0) {
      if (!form.name.trim()) return toast.error('Enter the customer’s name');
      if (!form.phone.trim()) return toast.error('Enter the customer’s mobile number');
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const submit = async () => {
    setBusy(true);
    const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== '' && v != null));
    try {
      const lead = await unwrap(api.post('/leads', payload));
      toast.success(`Lead ${lead.code} added`);
      navigate('/associate/leads');
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  const unit = units.find((u) => u.id === form.propertyId);
  const budgetLabel = (form.budgetMin || form.budgetMax)
    ? `${form.budgetMin ? inr(form.budgetMin) : '₹0'} – ${form.budgetMax ? inr(form.budgetMax) : 'any'}`
    : '';

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-16">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Add a lead</h1>
        <Link to="/associate/leads" className="btn-ghost">Cancel</Link>
      </div>

      <div className="card p-5">
        <Stepper steps={STEPS} step={step} done={done} onGo={setStep} />

        <div className="mt-6">
          {/* STEP 1 — customer */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold">Customer details</h2>
                <p className="text-sm text-slate-500">Name and a mobile number are required.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><label className="label">Full name *</label><input className="input" value={form.name} onChange={set('name')} /></div>
                <div><label className="label">Mobile number *</label><input className="input" type="tel" value={form.phone} onChange={set('phone')} placeholder="10-digit mobile" /></div>
                <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={set('email')} /></div>
                <div><label className="label">Aadhaar number</label><input className="input" value={form.aadhaar} onChange={set('aadhaar')} placeholder="XXXX XXXX XXXX" /></div>
                <div className="sm:col-span-2"><label className="label">PAN number</label><input className="input uppercase sm:max-w-[220px]" value={form.pan} onChange={set('pan')} placeholder="ABCDE1234F" /></div>
              </div>
              <p className="text-xs text-slate-400">ID details are optional and stored securely for verification.</p>
            </div>
          )}

          {/* STEP 2 — requirement */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold">What are they looking for?</h2>
                <p className="text-sm text-slate-500">Where they want to buy and the budget.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">Purpose</label>
                  <select className="input" value={form.purpose} onChange={set('purpose')}>
                    {PURPOSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Preferred city</label>
                  <select className="input" value={form.preferredCity} onChange={set('preferredCity')}>
                    <option value="">Any city</option>
                    {cities.map((c) => <option key={c.id || c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2"><label className="label">Preferred locality / area</label>
                  <input className="input" value={form.preferredArea} onChange={set('preferredArea')} placeholder="e.g. Sarjapur Road, Whitefield" /></div>
                <div><label className="label">Configuration</label>
                  <input className="input" value={form.requirement} onChange={set('requirement')} placeholder="2 BHK / Plot / Shop…" /></div>
                <div><label className="label">Bedrooms wanted</label>
                  <input className="input" type="number" min={0} value={form.bedroomsWanted} onChange={set('bedroomsWanted')} /></div>
                <div><label className="label">Budget min (₹)</label><input className="input" type="number" value={form.budgetMin} onChange={set('budgetMin')} /></div>
                <div><label className="label">Budget max (₹)</label><input className="input" type="number" value={form.budgetMax} onChange={set('budgetMax')} /></div>
              </div>
              {budgetLabel && <p className="text-xs text-slate-500">Budget: {budgetLabel}</p>}
            </div>
          )}

          {/* STEP 3 — interest */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold">Interested in a specific project?</h2>
                <p className="text-sm text-slate-500">Optional — skip if it’s a general requirement.</p>
              </div>
              <ProjectPicker value={project} onPick={setProject} />
              {project && units.length > 0 && (
                <div>
                  <label className="label">Specific unit</label>
                  <select className="input" value={form.propertyId} onChange={set('propertyId')}>
                    <option value="">Any unit in this project</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>{u.unitType} · {inr(u.price)}{u.carpetArea ? ` · ${u.carpetArea} sqft` : ''}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="label">Notes for the sales team</label>
                <textarea className="input min-h-[80px]" value={form.message} onChange={set('message')}
                  placeholder="Timeline, urgency, site-visit preference…" />
              </div>
            </div>
          )}

          {/* STEP 4 — review */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold">Review &amp; add</h2>
                <p className="text-sm text-slate-500">Confirm the details before saving the lead.</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4 text-sm">
                  <div className="mb-1 flex items-center justify-between"><p className="font-semibold">Customer</p>
                    <button className="text-xs text-brand-700 hover:underline" onClick={() => setStep(0)}>Edit</button></div>
                  <dl className="text-slate-600">
                    <Row k="Name" v={form.name} />
                    <Row k="Mobile" v={form.phone} />
                    <Row k="Email" v={form.email} />
                    <Row k="Aadhaar" v={form.aadhaar} />
                    <Row k="PAN" v={form.pan} />
                  </dl>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 text-sm">
                  <div className="mb-1 flex items-center justify-between"><p className="font-semibold">Requirement</p>
                    <button className="text-xs text-brand-700 hover:underline" onClick={() => setStep(1)}>Edit</button></div>
                  <dl className="text-slate-600">
                    <Row k="Purpose" v={PURPOSES.find((p) => p[0] === form.purpose)?.[1] !== 'Not sure yet' ? PURPOSES.find((p) => p[0] === form.purpose)?.[1] : ''} />
                    <Row k="Location" v={[form.preferredArea, form.preferredCity].filter(Boolean).join(', ')} />
                    <Row k="Config" v={form.requirement} />
                    <Row k="Bedrooms" v={form.bedroomsWanted} />
                    <Row k="Budget" v={budgetLabel} />
                  </dl>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 text-sm">
                <div className="mb-1 flex items-center justify-between"><p className="font-semibold">Interest</p>
                  <button className="text-xs text-brand-700 hover:underline" onClick={() => setStep(2)}>Edit</button></div>
                <p className="text-slate-600">
                  {project ? `${project.name}${unit ? ` · ${unit.unitType}` : ''}` : 'General requirement — no specific project'}
                </p>
                {form.message && <p className="mt-1 text-slate-500">“{form.message}”</p>}
              </div>
            </div>
          )}
        </div>

        {/* nav */}
        <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-4">
          <button type="button" className="btn-ghost" disabled={step === 0 || busy}
            onClick={() => setStep((s) => Math.max(0, s - 1))}>← Back</button>
          {step < STEPS.length - 1 ? (
            <button type="button" className="btn-primary" onClick={next}>Continue</button>
          ) : (
            <button type="button" className="btn-primary" disabled={busy} onClick={submit}>
              {busy ? 'Saving…' : 'Add lead'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
