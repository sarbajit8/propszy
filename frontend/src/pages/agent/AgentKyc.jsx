import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, unwrap, apiError } from '../../lib/api';
import { refreshMe } from '../../features/auth/authSlice';
import { PageLoader } from '../../components/ui';
import Stepper from '../../components/Stepper';

export const DOC_LABEL = {
  PAN: 'PAN card',
  PHOTO: 'Passport-size photo',
  ADDRESS_PROOF: 'Address proof (Aadhaar / utility bill)',
  BANK_PROOF: 'Bank proof (cancelled cheque / passbook)',
};
export const STATUS_STYLE = {
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-rose-100 text-rose-700',
  PENDING: 'bg-amber-100 text-amber-700',
  NOT_SUBMITTED: 'bg-slate-100 text-slate-600',
};
export const EMPTY_PROFILE = {
  legalName: '', dob: '', panNumber: '', aadhaarNumber: '',
  addressLine: '', city: '', state: '', pincode: '', agencyName: '', experienceYears: '',
};
export const EMPTY_BANK = { accountName: '', accountNumber: '', ifsc: '', bankName: '', branch: '', upiId: '' };

const STEPS = ['Your details', 'Documents', 'Bank account', 'Review'];

/* ── per-document uploader ───────────────────────────────── */
export function DocRow({ type, doc, onChange }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('docType', type);
      await api.post('/kyc/documents', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(`${DOC_LABEL[type]} uploaded`);
      onChange();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  };
  const remove = async () => {
    try { await api.delete(`/kyc/documents/${doc.id}`); onChange(); } catch (e) { toast.error(apiError(e)); }
  };

  const done = !!doc;
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-3 ${done ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200'}`}>
      <div className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm ${done ? 'bg-emerald-100' : 'bg-slate-100'}`}>
        {doc?.status === 'APPROVED' ? '✓' : done ? '📄' : '⬆'}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">{DOC_LABEL[type]}</p>
          {doc && <span className={`badge ${STATUS_STYLE[doc.status] || STATUS_STYLE.PENDING}`}>{doc.status}</span>}
        </div>
        {doc && (
          <div className="mt-0.5 flex items-center gap-3 text-xs">
            <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">View file</a>
            <button onClick={remove} className="text-slate-400 hover:text-rose-600">Remove</button>
          </div>
        )}
        {doc?.status === 'REJECTED' && doc.remarks && <p className="mt-1 text-xs text-rose-600">Reason: {doc.remarks}</p>}
      </div>
      <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
      <button onClick={() => inputRef.current?.click()} disabled={busy} className="btn-outline text-xs">
        {busy ? 'Uploading…' : done ? 'Replace' : 'Upload'}
      </button>
    </div>
  );
}

const Row = ({ k, v }) => (v ? <div className="flex justify-between gap-3 py-1"><dt className="text-slate-400">{k}</dt><dd className="text-right font-medium">{v}</dd></div> : null);

/* ── reusable KYC wizard component ───────────────────────── */
export function KycWizard({ initialReferralCode = '', onSubmitted, customTitle, showDashboardLinks = true }) {
  const qc = useQueryClient();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { data, isLoading } = useQuery({ queryKey: ['kyc-me'], queryFn: () => unwrap(api.get('/kyc/me')) });
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [bank, setBank] = useState(EMPTY_BANK);
  const [sponsorCode, setSponsorCode] = useState(initialReferralCode);
  const [saving, setSaving] = useState(false);

  // Every time this page loads, silently refresh the session so that if admin
  // has approved KYC, the store reflects role=AGENT & kycStatus=APPROVED and
  // the RequireKyc guard lets the associate through to the full dashboard.
  useEffect(() => {
    dispatch(refreshMe()).then((action) => {
      if (action.payload?.kycStatus === 'APPROVED' && action.payload?.role === 'AGENT') {
        navigate('/associate', { replace: true });
      }
    });
  }, [dispatch, navigate]);

  useEffect(() => {
    if (data?.profile) setProfile((p) => ({ ...EMPTY_PROFILE, ...data.profile }));
    if (data?.bankDetail) setBank((b) => ({ ...EMPTY_BANK, ...data.bankDetail }));
    if (initialReferralCode) setSponsorCode(initialReferralCode);
  }, [data, initialReferralCode]);

  const done = useMemo(() => {
    const c = data?.checklist || {};
    return [c.profile, c.docsDone, c.bank, c.canSubmit];
  }, [data]);

  if (isLoading || !data) return <PageLoader />;

  const { status, role, checklist, requiredDocs, documents, submittedAt } = data;
  const refresh = () => qc.invalidateQueries({ queryKey: ['kyc-me'] });
  const setP = (k) => (e) => setProfile((p) => ({ ...p, [k]: e.target.value }));
  const setB = (k) => (e) => setBank((b) => ({ ...b, [k]: e.target.value }));
  const docFor = (type) => documents.find((d) => d.docType === type);

  // ── locked states (already submitted / approved) ──────────
  if (status === 'PENDING' || status === 'APPROVED') {
    const ok = status === 'APPROVED';
    return (
      <div className="mx-auto max-w-xl space-y-5 pt-4">
        <div className={`rounded-2xl border p-8 text-center ${ok ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white text-2xl shadow-sm">{ok ? '🎉' : '⏳'}</div>
          <h1 className="mt-4 text-xl font-bold">{ok ? 'Associate KYC Approved' : 'KYC Under Admin Review'}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {ok
              ? 'Congratulations! Your agent account is approved. You can recruit sub-agents, earn commissions, and access both the Agent and Customer dashboards.'
              : `Submitted${submittedAt ? ` on ${new Date(submittedAt).toLocaleDateString()}` : ''}. Our admin team is reviewing your verification documents. Once approved, your agent workspace will unlock.`}
          </p>

          {showDashboardLinks && (
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {ok ? (
                <>
                  <Link to="/associate" className="btn-primary">Open Associate Dashboard</Link>
                  <Link to="/account" className="btn-outline">Open Customer Dashboard</Link>
                </>
              ) : (
                <>
                  <Link to="/account" className="btn-primary">Go to Customer Dashboard</Link>
                  <Link to="/properties" className="btn-outline">Browse Properties</Link>
                </>
              )}
            </div>
          )}
        </div>

        <div className="card p-5 text-sm">
          <p className="mb-2 font-semibold">Your submission details</p>
          <dl className="text-slate-600">
            <Row k="Account role" v={role === 'AGENT' ? 'Propszy Associate' : 'Customer (Upgrade requested)'} />
            <Row k="Legal name" v={profile.legalName} />
            <Row k="PAN" v={profile.panNumber} />
            <Row k="City" v={[profile.city, profile.state].filter(Boolean).join(', ')} />
            <Row k="Documents" v={`${documents.length} of ${requiredDocs.length} uploaded`} />
            <Row k="Bank A/C" v={bank.accountNumber ? `••••${String(bank.accountNumber).slice(-4)}` : ''} />
          </dl>
        </div>
      </div>
    );
  }

  // ── wizard ────────────────────────────────────────────────
  const next = async () => {
    setSaving(true);
    try {
      if (step === 0) {
        if (!profile.legalName?.trim()) return toast.error('Please enter your full legal name');
        if (!profile.panNumber?.trim() || profile.panNumber.length !== 10) return toast.error('Please enter a valid 10-character PAN');
        if (!profile.addressLine?.trim()) return toast.error('Please enter your address');
        if (!profile.city?.trim()) return toast.error('Please enter your city');
        if (!profile.pincode?.trim()) return toast.error('Please enter your pincode');
        await api.put('/kyc/profile', profile);
        await refresh();
      } else if (step === 1) {
        if (!requiredDocs.every((t) => docFor(t))) { toast.error('Upload all 4 documents to continue'); setSaving(false); return; }
      } else if (step === 2) {
        if (!bank.accountName?.trim()) return toast.error('Enter bank account holder name');
        if (!bank.accountNumber?.trim()) return toast.error('Enter bank account number');
        if (!bank.ifsc?.trim()) return toast.error('Enter IFSC code');
        await api.put('/kyc/bank', bank);
        await refresh();
      }
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    } catch (e) { toast.error(apiError(e)); } finally { setSaving(false); }
  };

  const submit = async () => {
    setSaving(true);
    try {
      await api.post('/kyc/submit', { referralCode: sponsorCode?.trim() || undefined });
      toast.success('KYC application submitted for admin review!');
      await refresh();
      onSubmitted?.();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-16">
      {location.state?.locked && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center text-sm text-amber-800">
          🔒 That part of the associate panel unlocks once your KYC is verified by Admin — finish the steps below to submit for review.
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">{customTitle || 'Associate KYC & Verification'}</h1>
        <span className={`badge ${STATUS_STYLE[status]}`}>{status.replace('_', ' ')}</span>
      </div>

      {status === 'REJECTED' && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Some documents or details were rejected by the admin. Please fix the flagged items below and re-submit.
        </div>
      )}

      <div className="card p-5">
        <Stepper steps={STEPS} step={step} done={done} onGo={setStep} />

        <div className="mt-6">
          {/* STEP 1 — details */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold">Your personal &amp; PAN details</h2>
                <p className="text-sm text-slate-500">As they appear on your government-issued PAN card.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="label">Full legal name <span className="text-rose-500">*</span></label>
                  <input className="input" placeholder="e.g. Ramesh Kumar" value={profile.legalName} onChange={setP('legalName')} />
                </div>
                <div>
                  <label className="label">Date of birth</label>
                  <input className="input" type="date" value={profile.dob?.slice(0, 10) || ''} onChange={setP('dob')} />
                </div>
                <div>
                  <label className="label">PAN number <span className="text-rose-500">*</span></label>
                  <input className="input uppercase" maxLength={10} value={profile.panNumber} onChange={setP('panNumber')} placeholder="ABCDE1234F" />
                </div>
                <div>
                  <label className="label">Aadhaar number (optional)</label>
                  <input className="input" maxLength={16} placeholder="12-digit number" value={profile.aadhaarNumber} onChange={setP('aadhaarNumber')} />
                </div>
                <div>
                  <label className="label">Agency / Firm name (optional)</label>
                  <input className="input" placeholder="Your agency or brokerage" value={profile.agencyName} onChange={setP('agencyName')} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Address line <span className="text-rose-500">*</span></label>
                  <input className="input" placeholder="House/Flat No., Street, Area" value={profile.addressLine} onChange={setP('addressLine')} />
                </div>
                <div>
                  <label className="label">City <span className="text-rose-500">*</span></label>
                  <input className="input" placeholder="City" value={profile.city} onChange={setP('city')} />
                </div>
                <div>
                  <label className="label">State</label>
                  <input className="input" placeholder="State" value={profile.state} onChange={setP('state')} />
                </div>
                <div>
                  <label className="label">Pincode <span className="text-rose-500">*</span></label>
                  <input className="input" maxLength={10} placeholder="6-digit PIN" value={profile.pincode} onChange={setP('pincode')} />
                </div>
                <div>
                  <label className="label">Real estate experience (years)</label>
                  <input className="input" type="number" min={0} placeholder="e.g. 3" value={profile.experienceYears} onChange={setP('experienceYears')} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Sponsor referral code <span className="text-slate-400">(optional)</span></label>
                  <input
                    className="input uppercase"
                    placeholder="Enter referral code if referred by an agent"
                    value={sponsorCode}
                    onChange={(e) => setSponsorCode(e.target.value.toUpperCase())}
                  />
                  <p className="mt-1 text-xs text-slate-400">If someone referred you to Propszy, enter their 8-digit referral code here.</p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 — documents */}
          {step === 1 && (
            <div className="space-y-3">
              <div>
                <h2 className="text-base font-semibold">Upload verification documents</h2>
                <p className="text-sm text-slate-500">JPG, PNG or PDF scans. All 4 documents are required for agent verification.</p>
              </div>
              {requiredDocs.map((type) => <DocRow key={type} type={type} doc={docFor(type)} onChange={refresh} />)}
            </div>
          )}

          {/* STEP 3 — bank */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold">Payout bank account details</h2>
                <p className="text-sm text-slate-500">Your level-wise commissions and payouts will be sent to this bank account.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">Account holder name <span className="text-rose-500">*</span></label>
                  <input className="input" placeholder="Name as in bank passbook" value={bank.accountName} onChange={setB('accountName')} />
                </div>
                <div>
                  <label className="label">Account number <span className="text-rose-500">*</span></label>
                  <input className="input" placeholder="Bank account number" value={bank.accountNumber} onChange={setB('accountNumber')} />
                </div>
                <div>
                  <label className="label">IFSC code <span className="text-rose-500">*</span></label>
                  <input className="input uppercase" placeholder="e.g. HDFC0001234" value={bank.ifsc} onChange={setB('ifsc')} />
                </div>
                <div>
                  <label className="label">Bank name</label>
                  <input className="input" placeholder="e.g. HDFC Bank" value={bank.bankName} onChange={setB('bankName')} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">UPI ID (optional)</label>
                  <input className="input" placeholder="e.g. yourname@okhdfcbank" value={bank.upiId} onChange={setB('upiId')} />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4 — review */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold">Review &amp; submit application</h2>
                <p className="text-sm text-slate-500">Verify your information before submitting for admin approval.</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4 text-sm">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="font-semibold">Personal details</p>
                    <button className="text-xs text-brand-700 hover:underline" onClick={() => setStep(0)}>Edit</button>
                  </div>
                  <dl className="text-slate-600">
                    <Row k="Name" v={profile.legalName} />
                    <Row k="PAN" v={profile.panNumber} />
                    <Row k="City" v={[profile.city, profile.state].filter(Boolean).join(', ')} />
                    <Row k="Pincode" v={profile.pincode} />
                    <Row k="Sponsor" v={sponsorCode || 'None'} />
                  </dl>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 text-sm">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="font-semibold">Payout bank</p>
                    <button className="text-xs text-brand-700 hover:underline" onClick={() => setStep(2)}>Edit</button>
                  </div>
                  <dl className="text-slate-600">
                    <Row k="Holder" v={bank.accountName} />
                    <Row k="A/C" v={bank.accountNumber ? `••••${String(bank.accountNumber).slice(-4)}` : ''} />
                    <Row k="IFSC" v={bank.ifsc} />
                    <Row k="Bank" v={bank.bankName} />
                  </dl>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 text-sm">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-semibold">Uploaded documents</p>
                  <button className="text-xs text-brand-700 hover:underline" onClick={() => setStep(1)}>Edit</button>
                </div>
                <ul className="space-y-1">
                  {requiredDocs.map((t) => {
                    const d = docFor(t);
                    return (
                      <li key={t} className={`flex items-center gap-2 ${d ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {d ? '✓' : '✗'} {DOC_LABEL[t]}
                      </li>
                    );
                  })}
                </ul>
              </div>

              {!checklist.allDone && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  ⚠️ Some required items are missing — please navigate back and complete all details, bank info, and 4 documents.
                </p>
              )}
            </div>
          )}
        </div>

        {/* nav */}
        <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-4">
          <button
            type="button"
            className="btn-ghost"
            disabled={step === 0 || saving}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            ← Back
          </button>

          {step < STEPS.length - 1 ? (
            <button type="button" className="btn-primary" disabled={saving} onClick={next}>
              {saving ? 'Saving…' : 'Save & continue'}
            </button>
          ) : (
            <button type="button" className="btn-primary" disabled={saving || !checklist.canSubmit} onClick={submit}>
              {saving ? 'Submitting…' : 'Submit for admin approval'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AgentKyc() {
  return <KycWizard />;
}
