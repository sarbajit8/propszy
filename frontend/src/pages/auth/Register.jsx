import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { requestStaffOtp, verifyStaffOtp } from '../../features/auth/authSlice';
import { usePublicConfig } from '../../lib/publicConfig';
import { Spinner, OtpBoxes } from '../../components/OtpInput';
import Logo from '../../components/Logo';

// admin-editable defaults (Admin → Settings → "Associate registration page")
const DEFAULT_CONTENT = {
  heroImage: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?auto=format&fit=crop&w=1200&q=75',
  badge: 'Partner Programme',
  heading1: 'Earn as a',
  heading2: 'Propszy Associate.',
  blurb: 'Refer buyers, build a downline and earn level-wise commission on every conversion — with a transparent ledger and one-time KYC.',
  cardTitle: 'Every sale, rewarded',
  cardSubtitle: 'Track pending & paid commission live',
};

const Icon = {
  people: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20c0-3.3 2.9-6 6.5-6s6.5 2.7 6.5 6" strokeLinecap="round" /><path d="M15.5 3.5a3.2 3.2 0 0 1 0 6.2M21.5 20c0-2.9-2.2-5.3-5-5.9" strokeLinecap="round" /></svg>,
  growth: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M3 17l6-6 4 4 8-8" strokeLinecap="round" strokeLinejoin="round" /><path d="M15 7h6v6" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  network: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="12" cy="18" r="2.5" /><path d="M7.7 7.7L11 16M16.3 7.7L13 16" strokeLinecap="round" /></svg>,
  shieldCheck: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M12 3l7 3v6c0 4.4-3 7.9-7 9-4-1.1-7-4.6-7-9V6l7-3z" strokeLinejoin="round" /><path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  ledger: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M6 3h9l3 3v15H6z" strokeLinejoin="round" /><path d="M9 10h6M9 14h6M9 18h3" strokeLinecap="round" /></svg>,
  handshake: (p) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M2 12l4-4 4 2 3-3 3 3 4-2 4 4" strokeLinecap="round" strokeLinejoin="round" /><path d="M6 12l3 3 3-3 3 3 3-3" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  personPlus: (p) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><circle cx="10" cy="8" r="4" /><path d="M2 20c0-3.9 3.6-7 8-7s8 3.1 8 7" strokeLinecap="round" /><path d="M19 8v6M16 11h6" strokeLinecap="round" /></svg>,
  person: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><circle cx="12" cy="8" r="3.5" /><path d="M4.5 20c0-4.1 3.4-7 7.5-7s7.5 2.9 7.5 7" strokeLinecap="round" /></svg>,
  mail: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M4 7l8 6 8-6" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  gift: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><rect x="3" y="9" width="18" height="12" rx="1" /><path d="M3 9h18M12 9v12M12 9C10 4 5 5 5 7.5S8 9 12 9zM12 9c2-5 7-4 7-1.5S16 9 12 9z" strokeLinejoin="round" /></svg>,
  chevron: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" {...p}><path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>,
};

const FEATURES = [
  [Icon.growth, 'violet', 'Level-wise', 'commission'],
  [Icon.network, 'blue', 'Build a', 'network'],
  [Icon.shieldCheck, 'emerald', 'Verified &', 'trusted'],
];

const HIGHLIGHTS = [
  [Icon.growth, 'violet', 'Level-wise commission', 'Earn on every conversion, yours and your downline’s'],
  [Icon.network, 'blue', 'Build a network', 'Recruit sub-associates with your referral code'],
  [Icon.ledger, 'emerald', 'Transparent ledger', 'Track pending vs. paid commission any time'],
  [Icon.shieldCheck, 'rose', 'Verified & trusted', 'One-time KYC, then a public profile'],
];

const TINT = {
  violet: 'bg-brand-100 text-brand-600',
  blue: 'bg-sky-100 text-sky-600',
  emerald: 'bg-emerald-100 text-emerald-600',
  rose: 'bg-rose-100 text-rose-600',
};

function InputField({ icon: IconFn, label, required, optional, error, right, ...rest }) {
  return (
    <div>
      <label className="label">
        {label} {required && <span className="text-rose-500">*</span>} {optional && <span className="text-slate-400">(optional)</span>}
      </label>
      <div className={`flex items-center overflow-hidden rounded-lg border bg-white transition ${error ? 'border-rose-300' : 'border-slate-200'} focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100`}>
        <span className="pl-3.5 text-slate-400"><IconFn /></span>
        <input className="w-full border-0 bg-transparent px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none" {...rest} />
        {right}
      </div>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

// Associate (agent) sign-up is mobile-OTP-only (mirrors the customer flow in
// Login.jsx) — mobile is mandatory, email is optional. Existing associates sign
// back in the same way at /associate/login (AgentLogin.jsx); admins have their
// own /admin/login.
export default function Register() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const wantsAgent = sp.get('role') === 'associate';
  const { data: cfg } = usePublicConfig();
  const content = { ...DEFAULT_CONTENT, ...Object.fromEntries(Object.entries(cfg?.agentAuth || {}).filter(([, v]) => v)) };

  useEffect(() => {
    if (!wantsAgent) navigate('/login', { replace: true });
  }, [wantsAgent, navigate]);

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [referralCode, setReferralCode] = useState(sp.get('ref') || '');
  const [stage, setStage] = useState('phone'); // phone | otp
  const [isNewUser, setIsNewUser] = useState(true);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!cooldown) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const phoneDigits = phone.replace(/\D/g, '');
  const phoneValid = phoneDigits.length === 10;
  const mm = String(Math.floor(cooldown / 60)).padStart(2, '0');
  const ss = String(cooldown % 60).padStart(2, '0');
  const nameOk = !isNewUser || name.trim().length >= 2;

  const sendOtp = async (e, resend = false) => {
    e?.preventDefault?.();
    if (!phoneValid || busy || cooldown > 0) return;
    setBusy(true);
    try {
      const res = await dispatch(requestStaffOtp(phoneDigits)).unwrap();
      setIsNewUser(!!res.isNewUser);
      setStage('otp');
      setOtp('');
      setCooldown(45);
      toast.success(resend ? 'New code sent' : 'OTP sent to your mobile');
    } catch (err) {
      toast.error(err || 'Could not send OTP');
    } finally {
      setBusy(false);
    }
  };

  const verify = async (code) => {
    if ((code || otp).length !== 6 || busy) return;
    if (!nameOk) { toast.error('Please enter your name to continue'); return; }
    setBusy(true);
    try {
      const user = await dispatch(verifyStaffOtp({
        phone: phoneDigits,
        otp: code || otp,
        name: name.trim() || undefined,
        email: email.trim() || undefined,
        referralCode: referralCode.trim() || undefined,
      })).unwrap();
      if (isNewUser) {
        toast.success('Associate account created — complete your KYC to start earning.');
        navigate('/associate/kyc');
      } else {
        toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
        navigate('/associate');
      }
    } catch (err) {
      toast.error(err || 'Verification failed');
    } finally {
      setBusy(false);
    }
  };

  if (!wantsAgent) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-brand-50">
      <div className="grid lg:min-h-screen lg:grid-cols-2">
        {/* ── marketing panel ─────────────────────────────── */}
        <div className="relative hidden flex-col overflow-hidden p-10 xl:p-14 lg:flex">
          <div className="pointer-events-none absolute -left-20 top-10 h-64 w-64 rounded-full bg-brand-200/40 blur-3xl" />
          <div className="pointer-events-none absolute right-0 top-1/3 h-72 w-72 rounded-full bg-pink-200/30 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/4 h-56 w-56 rounded-full bg-sky-200/30 blur-3xl" />

          <div className="relative z-10 flex items-center justify-between">
            <Link to="/"><Logo imgClassName="h-8" /></Link>
            <span className="hidden text-lg text-brand-600 underline decoration-brand-300 decoration-2 underline-offset-4 xl:inline" style={{ fontFamily: "'Caveat', cursive" }}>
              Grow Together
            </span>
          </div>

          <div className="relative z-10 mt-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
              <Icon.people /> {content.badge}
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.1] text-slate-900 xl:text-[44px]">
              {content.heading1}<br /><span className="text-brand-600">{content.heading2}</span>
            </h1>
            <p className="mt-4 max-w-md text-slate-500">{content.blurb}</p>

            <div className="mt-7 flex flex-wrap gap-5">
              {FEATURES.map(([IconFn, tint, l1, l2]) => (
                <div key={l2} className="flex items-center gap-2.5">
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${TINT[tint]}`}><IconFn /></span>
                  <span className="text-sm font-semibold leading-tight text-slate-700">{l1}<br />{l2}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 rounded-2xl border border-white/80 bg-white/70 p-4 shadow-sm backdrop-blur-xl sm:grid-cols-4">
              {HIGHLIGHTS.map(([IconFn, tint, title, desc]) => (
                <div key={title} className="min-w-0">
                  <span className={`grid h-8 w-8 place-items-center rounded-lg ${TINT[tint]}`}><IconFn width="15" height="15" /></span>
                  <p className="mt-2 text-xs font-bold leading-tight text-slate-900">{title}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-7">
              <div className="relative overflow-hidden rounded-2xl shadow-2xl">
                <img src={content.heroImage} alt="" className="h-40 w-full object-cover xl:h-48" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-transparent" />
              </div>
              <div className="relative z-10 -mt-7 ml-4 flex max-w-xs items-center gap-3 rounded-xl bg-white p-3 shadow-xl">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600"><Icon.handshake /></span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{content.cardTitle}</p>
                  <p className="truncate text-xs text-slate-500">{content.cardSubtitle}</p>
                </div>
              </div>
            </div>
          </div>

          <p className="relative z-10 mt-auto pt-8 text-sm text-slate-400">© {new Date().getFullYear()} Propszy</p>
        </div>

        {/* ── form panel ──────────────────────────────────── */}
        <div className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            <Link to="/" className="mb-6 flex items-center justify-center lg:hidden"><Logo /></Link>

            <div className="relative overflow-hidden rounded-2xl bg-white p-7 shadow-xl shadow-slate-200/60 sm:p-8">
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand-100/60 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-12 -right-6 h-32 w-32 rounded-full bg-indigo-100/60 blur-2xl" />

              <div className="relative">
                <div className="flex items-start gap-3.5">
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-100 text-brand-600">
                    {stage === 'phone' ? <Icon.personPlus /> : <Icon.shieldCheck />}
                  </span>
                  <div>
                    <h1 className="text-2xl font-extrabold text-slate-900">
                      {stage === 'phone' ? 'Become a Propszy Associate' : 'Verify your mobile'}
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                      {stage === 'phone'
                        ? 'Enter your mobile number to get an OTP and register as an associate.'
                        : "We've sent a 6-digit code to your mobile number"}
                    </p>
                    {stage === 'otp' && <p className="text-sm font-semibold text-slate-700">+91 {phoneDigits}</p>}
                  </div>
                </div>

                {stage === 'phone' ? (
                  <form onSubmit={sendOtp} className="mt-6 space-y-4">
                    <div>
                      <label className="label">Mobile number <span className="text-rose-500">*</span></label>
                      <div className={`flex items-stretch overflow-hidden rounded-lg border bg-white transition ${phone ? 'border-slate-300' : 'border-slate-200'} focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100`}>
                        <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap border-r border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-500">
                          <span className="rounded-[2px] bg-orange-500 px-1 text-[9px] font-bold leading-[14px] text-white">IN</span> +91
                        </span>
                        <input
                          className="w-full border-0 bg-transparent px-3 py-2.5 text-base tracking-wide outline-none"
                          type="tel" inputMode="numeric" required autoFocus maxLength={10}
                          placeholder="98765 43210"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        />
                      </div>
                    </div>

                    <InputField icon={Icon.people} label="Sponsor referral code" optional placeholder="Enter associate code"
                      value={referralCode} onChange={(e) => setReferralCode(e.target.value)} />

                    <button className="flex w-full items-center justify-center gap-1.5 rounded-full bg-brand-600 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700 disabled:opacity-50" disabled={busy || !phoneValid}>
                      {busy ? <Spinner /> : <Icon.personPlus width="18" height="18" />} {busy ? 'Sending…' : 'Send OTP'}
                    </button>
                  </form>
                ) : (
                  <div className="mt-6 space-y-4">
                    <OtpBoxes value={otp} onChange={setOtp} onComplete={verify} />

                    {isNewUser && (
                      <>
                        <InputField icon={Icon.person} label="Full name" required placeholder="Enter your full name"
                          autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
                        <InputField icon={Icon.mail} label="Email" optional type="email" placeholder="you@example.com"
                          autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                      </>
                    )}

                    <button className="flex w-full items-center justify-center gap-1.5 rounded-full bg-brand-600 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700 disabled:opacity-50"
                      disabled={busy || otp.length !== 6 || !nameOk} onClick={() => verify()}>
                      {busy ? <Spinner /> : <Icon.personPlus width="18" height="18" />} {busy ? 'Verifying…' : isNewUser ? 'Create associate account' : 'Verify & sign in'} <Icon.chevron />
                    </button>

                    <div className="flex items-center justify-between text-sm">
                      <button type="button" className="font-medium text-slate-500 hover:text-slate-700" onClick={() => { setStage('phone'); setOtp(''); }}>
                        ← Change number
                      </button>
                      {cooldown > 0 ? (
                        <span className="text-slate-400">Resend OTP in {mm}:{ss}</span>
                      ) : (
                        <button type="button" disabled={busy} onClick={(e) => sendOtp(e, true)} className="font-semibold text-brand-700 hover:underline">
                          Resend OTP
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {isNewUser && (
                  <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-brand-50 p-3.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-600"><Icon.gift /></span>
                    <p className="text-xs leading-relaxed text-brand-800">
                      After verifying you’ll be taken to KYC: personal &amp; PAN details, 4 documents and payout bank —
                      then submit for admin review.
                    </p>
                  </div>
                )}

                <p className="mt-5 text-center text-sm text-slate-500">
                  Already an associate?{' '}
                  <Link to="/associate/login" className="font-semibold text-brand-700 hover:underline">Sign in</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
