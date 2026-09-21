import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { requestOtp, verifyOtp } from '../../features/auth/authSlice';
import { usePublicConfig } from '../../lib/publicConfig';
import Logo from '../../components/Logo';
import { Spinner, OtpBoxes } from '../../components/OtpInput';

// admin-editable defaults (Admin → Settings → "Customer sign-in page")
const DEFAULT_CONTENT = {
  heroImage: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=75',
  badge: 'Trusted Real Estate Platform',
  heading1: 'Better Homes',
  heading2: 'Brighter Futures',
  blurb: 'Discover, buy or rent your dream property with ease — simple, transparent and stress-free.',
  cardTitle: 'Find Your Dream Home',
  cardSubtitle: 'Apartments · Villas · Plots · Commercial',
};

const Icon = {
  home: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M3 11l9-8 9 8M5 10v10h14V10" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  lock: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" /></svg>,
  headset: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M4 13v-1a8 8 0 0 1 16 0v1" strokeLinecap="round" /><rect x="3" y="13" width="4" height="6" rx="1.5" /><rect x="17" y="13" width="4" height="6" rx="1.5" /><path d="M19 19v1a3 3 0 0 1-3 3h-2" strokeLinecap="round" /></svg>,
  personPlus: (p) => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><circle cx="10" cy="8" r="4" /><path d="M2 20c0-3.9 3.6-7 8-7s8 3.1 8 7" strokeLinecap="round" /><path d="M19 8v6M16 11h6" strokeLinecap="round" /></svg>,
  shieldLock: (p) => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="M12 3l7 3v6c0 4.4-3 7.9-7 9-4-1.1-7-4.6-7-9V6l7-3z" strokeLinejoin="round" /><rect x="9.5" y="11" width="5" height="4" rx="1" /><path d="M10.5 11V9.5a1.5 1.5 0 0 1 3 0V11" strokeLinecap="round" /></svg>,
  send: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  shieldCheck: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M12 3l7 3v6c0 4.4-3 7.9-7 9-4-1.1-7-4.6-7-9V6l7-3z" strokeLinejoin="round" /><path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  chevron: (p) => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" {...p}><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>,
};

const FEATURES = [
  [Icon.home, 'Verified', 'Properties'],
  [Icon.shieldLock, 'Secure', 'OTP sign-in'],
  [Icon.personPlus, 'Expert', 'Support'],
  [Icon.shieldCheck, 'Transparent', 'Process'],
];

// subtle decorative skyline — same spirit as the reference mockup's corner illustration
function Skyline(p) {
  return (
    <svg viewBox="0 0 220 70" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}>
      <path d="M2 68V30h14v38M22 68V44h12v24M40 68V18h16v50M62 68V38h10v30M78 68V50h8v18M92 68V26h14v42M112 68V10h18v58M136 68V42h12v26M154 68V54h8v14M168 68V22h16v46M190 68V34h10v34M206 68V48h12v20" strokeLinejoin="round" />
      <path d="M2 68h214" strokeLinecap="round" />
    </svg>
  );
}

function destFor(user, location) {
  return (
    location.state?.from?.pathname ||
    (['ADMIN', 'SUBADMIN'].includes(user.role) ? '/admin' : user.role === 'AGENT' ? '/associate' : '/account')
  );
}


export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: cfg } = usePublicConfig();
  const content = { ...DEFAULT_CONTENT, ...Object.fromEntries(Object.entries(cfg?.customerAuth || {}).filter(([, v]) => v)) };
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [stage, setStage] = useState('phone'); // phone | otp
  const [isNewUser, setIsNewUser] = useState(false);
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

  const sendOtp = async (e, resend = false) => {
    e?.preventDefault?.();
    if (!phoneValid || busy || cooldown > 0) return;
    setBusy(true);
    try {
      const res = await dispatch(requestOtp(phoneDigits)).unwrap();
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

  const nameOk = !isNewUser || name.trim().length >= 2;

  const verify = async (code) => {
    if ((code || otp).length !== 6 || busy) return;
    if (!nameOk) { toast.error('Please enter your name to continue'); return; }
    setBusy(true);
    try {
      const user = await dispatch(verifyOtp({
        phone: phoneDigits,
        otp: code || otp,
        name: name.trim() || undefined,
        email: email.trim() || undefined,
      })).unwrap();
      toast.success(`Welcome${isNewUser ? '' : ' back'}, ${user.name.split(' ')[0]}!`);
      navigate(destFor(user, location), { replace: true });
    } catch (err) {
      toast.error(err || 'Verification failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-brand-50">
      <div className="pointer-events-none fixed -right-16 -top-16 h-80 w-80 rounded-full bg-brand-200/40 blur-3xl" />
      <div className="pointer-events-none fixed right-1/4 top-1/2 h-64 w-64 rounded-full bg-pink-200/30 blur-3xl" />
      <div className="pointer-events-none fixed -bottom-20 -right-10 h-72 w-72 rounded-full bg-sky-200/30 blur-3xl" />

      <div className="relative grid lg:min-h-screen lg:grid-cols-2">
        {/* ── marketing panel ─────────────────────────────── */}
        <div className="relative hidden flex-col justify-between overflow-hidden p-10 lg:flex xl:p-14">
          <Link to="/" className="relative z-10 inline-flex w-fit items-center"><Logo imgClassName="h-8" /></Link>

          <div className="relative z-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
              <Icon.home width="14" height="14" /> {content.badge}
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.1] text-slate-900 xl:text-[42px]">
              {content.heading1}<br />
              <span className="text-brand-600">{content.heading2}</span>
            </h1>
            <p className="mt-4 max-w-sm text-slate-500">{content.blurb}</p>
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-4 divide-x divide-slate-200">
              {FEATURES.map(([IconFn, a, b], i) => (
                <div key={b} className={`flex items-center gap-2.5 ${i > 0 ? 'pl-5' : ''}`}>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-600"><IconFn /></span>
                  <span className="text-xs font-medium leading-tight text-slate-600">{a}<br />{b}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 mt-8">
            <div className="relative overflow-hidden rounded-2xl shadow-2xl">
              <img src={content.heroImage} alt="" className="h-56 w-full object-cover xl:h-64" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
            </div>
            <div className="relative z-10 -mt-8 ml-4 flex max-w-xs items-center gap-3 rounded-xl bg-white p-3 shadow-xl">
              <img src={content.heroImage} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{content.cardTitle}</p>
                <p className="truncate text-xs text-slate-400">{content.cardSubtitle}</p>
              </div>
              <Link to="/properties" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-600 text-white hover:bg-brand-700">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </Link>
            </div>
            <Skyline className="mt-3 h-10 w-full text-brand-200/70" />
            <p className="mt-3 text-sm text-slate-400">© {new Date().getFullYear()} Propszy</p>
          </div>
        </div>

        {/* ── form panel ──────────────────────────────────── */}
        <div className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-sm">
            <Link to="/" className="mb-6 flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-brand-700 lg:hidden">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Back to Home
            </Link>

            <div className="rounded-2xl bg-white p-7 shadow-xl shadow-slate-200/60 sm:p-8">
              <Link to="/" className="mb-5 hidden items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-brand-700 lg:flex">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Back to Home
              </Link>

              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-700">
                {stage === 'phone' ? <Icon.personPlus /> : <Icon.shieldLock />}
              </span>

              <h1 className="mt-4 text-2xl font-extrabold text-slate-900">
                {stage === 'phone' ? 'Create Your Account' : 'Enter OTP'}
              </h1>
              <p className="mt-1.5 text-sm text-slate-500">
                {stage === 'phone'
                  ? "Enter your mobile number to get an OTP and start your real estate journey."
                  : "We've sent a 6-digit code to your mobile number"}
              </p>
              {stage === 'otp' && <p className="text-sm font-semibold text-slate-700">+91 {phoneDigits}</p>}

              {stage === 'phone' ? (
                <form onSubmit={sendOtp} className="mt-6 space-y-4">
                  <div>
                    <label className="label">Mobile Number <span className="text-rose-500">*</span></label>
                    <div className={`flex items-stretch overflow-hidden rounded-lg border bg-white transition ${phone ? 'border-slate-300' : 'border-slate-200'} focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100`}>
                      <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap border-r border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-500">
                        <span className="rounded-[2px] bg-orange-500 px-1 text-[9px] font-bold leading-[14px] text-white">IN</span>
                        +91 <Icon.chevron className="text-slate-400" />
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

                  <button className="btn-primary flex w-full items-center justify-center gap-2 shadow-lg shadow-brand-600/20" disabled={busy || !phoneValid}>
                    {busy ? <Spinner /> : <Icon.send />} {busy ? 'Sending…' : 'Send OTP'}
                  </button>
                </form>
              ) : (
                <div className="mt-6 space-y-4">
                  <OtpBoxes value={otp} onChange={setOtp} onComplete={verify} />

                  {isNewUser && (
                    <>
                      <div>
                        <label className="label">Your name *</label>
                        <input className="input" required placeholder="e.g. Priya Sharma" value={name} onChange={(e) => setName(e.target.value)} />
                      </div>
                      <div>
                        <label className="label">Email <span className="text-slate-400">(optional)</span></label>
                        <input className="input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                      </div>
                    </>
                  )}

                  <button className="btn-primary flex w-full items-center justify-center gap-2 shadow-lg shadow-brand-600/20"
                    disabled={busy || otp.length !== 6 || !nameOk} onClick={() => verify()}>
                    {busy && <Spinner />} {busy ? 'Verifying…' : isNewUser ? 'Create account & continue' : 'Verify & sign in'}
                  </button>

                  <div className="flex items-center justify-between text-sm">
                    <button type="button" className="font-medium text-slate-500 hover:text-slate-700" onClick={() => { setStage('phone'); setOtp(''); }}>
                      ← Change number
                    </button>
                    {cooldown > 0 ? (
                      <span className="flex items-center gap-1.5 text-slate-400">
                        Resend OTP in {mm}:{ss}
                      </span>
                    ) : (
                      <button type="button" disabled={busy} onClick={(e) => sendOtp(e, true)}
                        className="flex items-center gap-1.5 font-semibold text-brand-700 hover:underline">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-3-6.7M21 4v5h-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        Resend OTP
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-6 flex items-center gap-2.5 rounded-xl bg-slate-50 p-3.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-600"><Icon.shieldCheck /></span>
                <p className="text-xs leading-snug text-slate-500">
                  Your information is safe with us.<br />We never share your details.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
