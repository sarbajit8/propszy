import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { requestStaffOtp, verifyStaffOtp, selectUser } from '../../features/auth/authSlice';
import { Spinner, OtpBoxes } from '../../components/OtpInput';
import Logo from '../../components/Logo';

const HERO_IMG = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?auto=format&fit=crop&w=1200&q=75';

const Icon = {
  network: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="12" cy="18" r="2.5" /><path d="M7.7 7.7L11 16M16.3 7.7L13 16" strokeLinecap="round" /></svg>,
  growth: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="M3 17l6-6 4 4 8-8" strokeLinecap="round" strokeLinejoin="round" /><path d="M15 7h6v6" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  ledger: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="M6 3h9l3 3v15H6z" strokeLinejoin="round" /><path d="M9 10h6M9 14h6M9 18h3" strokeLinecap="round" /></svg>,
  shieldCheck: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="M12 3l7 3v6c0 4.4-3 7.9-7 9-4-1.1-7-4.6-7-9V6l7-3z" strokeLinejoin="round" /><path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  handshake: (p) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M2 12l4-4 4 2 3-3 3 3 4-2 4 4" strokeLinecap="round" strokeLinejoin="round" /><path d="M6 12l3 3 3-3 3 3 3-3" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  send: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" /></svg>,
};

const FEATURES = [
  [Icon.growth, 'violet', 'Level-wise', 'commission'],
  [Icon.network, 'blue', 'Your', 'network'],
  [Icon.ledger, 'emerald', 'Transparent', 'ledger'],
];

const TINT = {
  violet: 'bg-brand-100 text-brand-600',
  blue: 'bg-sky-100 text-sky-600',
  emerald: 'bg-emerald-100 text-emerald-600',
};

const dashboardPath = (role) =>
  role === 'ADMIN' || role === 'SUBADMIN' ? '/admin' : role === 'AGENT' ? '/associate' : '/account';

// Associates (agents) sign in with mobile OTP only — no password. Admins use the
// separate password-only /admin/login page (AdminLogin.jsx).
export default function AgentLogin() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector(selectUser);

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [stage, setStage] = useState('phone'); // phone | otp
  const [isNewUser, setIsNewUser] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!user) return;
    if (['AGENT', 'ADMIN', 'SUBADMIN'].includes(user.role)) {
      navigate(location.state?.from?.pathname || dashboardPath(user.role), { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, [user, navigate, location]);

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
      const signedIn = await dispatch(verifyStaffOtp({
        phone: phoneDigits,
        otp: code || otp,
        name: name.trim() || undefined,
        email: email.trim() || undefined,
      })).unwrap();
      if (isNewUser) {
        toast.success('Associate account created — complete your KYC to start earning.');
        navigate('/associate/kyc', { replace: true });
      } else {
        toast.success(`Welcome back, ${signedIn.name.split(' ')[0]}!`);
        navigate(location.state?.from?.pathname || dashboardPath(signedIn.role), { replace: true });
      }
    } catch (err) {
      toast.error(err || 'Verification failed');
    } finally {
      setBusy(false);
    }
  };

  if (user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-brand-50">
      <div className="grid lg:min-h-screen lg:grid-cols-2">
        {/* ── marketing panel ─────────────────────────────── */}
        <div className="relative hidden flex-col overflow-hidden p-10 xl:p-14 lg:flex">
          <div className="pointer-events-none absolute -left-20 top-10 h-64 w-64 rounded-full bg-brand-200/40 blur-3xl" />
          <div className="pointer-events-none absolute right-0 top-1/3 h-72 w-72 rounded-full bg-pink-200/30 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/4 h-56 w-56 rounded-full bg-sky-200/30 blur-3xl" />

          <Link to="/" className="relative z-10 inline-flex w-fit items-center"><Logo imgClassName="h-8" /></Link>

          <div className="relative z-10 mt-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
              <Icon.network /> Associate Partner Portal
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.1] text-slate-900 xl:text-[44px]">
              Welcome back,<br /><span className="text-brand-600">Propszy Associate.</span>
            </h1>
            <p className="mt-4 max-w-md text-slate-500">
              Sign in with your mobile number — no password needed. New here? The same number gets you started.
            </p>

            <div className="mt-7 flex flex-wrap gap-5">
              {FEATURES.map(([IconFn, tint, l1, l2]) => (
                <div key={l2} className="flex items-center gap-2.5">
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${TINT[tint]}`}><IconFn /></span>
                  <span className="text-sm font-semibold leading-tight text-slate-700">{l1}<br />{l2}</span>
                </div>
              ))}
            </div>

            <div className="mt-7">
              <div className="relative overflow-hidden rounded-2xl shadow-2xl">
                <img src={HERO_IMG} alt="" className="h-56 w-full object-cover xl:h-64" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-transparent" />
              </div>
              <div className="relative z-10 -mt-8 ml-4 flex max-w-xs items-center gap-3 rounded-xl bg-white p-3 shadow-xl">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600"><Icon.handshake /></span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">Every sale, rewarded</p>
                  <p className="truncate text-xs text-slate-500">Track pending &amp; paid commission live</p>
                </div>
              </div>
            </div>
          </div>

          <p className="relative z-10 mt-auto pt-8 text-sm text-slate-400">© {new Date().getFullYear()} Propszy</p>
        </div>

        {/* ── form panel ──────────────────────────────────── */}
        <div className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-sm">
            <Link to="/" className="mb-6 flex items-center justify-center lg:hidden"><Logo /></Link>

            <div className="relative overflow-hidden rounded-2xl bg-white p-7 shadow-xl shadow-slate-200/60 sm:p-8">
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand-100/60 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-12 -right-6 h-32 w-32 rounded-full bg-indigo-100/60 blur-2xl" />

              <div className="relative">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-100 text-brand-600">
                  {stage === 'phone' ? <Icon.network width="22" height="22" /> : <Icon.shieldCheck width="22" height="22" />}
                </span>
                <h1 className="mt-4 text-2xl font-extrabold text-slate-900">
                  {stage === 'phone' ? 'Associate sign in' : 'Verify your mobile'}
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  {stage === 'phone'
                    ? 'Enter your mobile number — no password needed.'
                    : "We've sent a 6-digit code to your mobile number"}
                </p>
                {stage === 'otp' && <p className="text-sm font-semibold text-slate-700">+91 {phoneDigits}</p>}

                {stage === 'phone' ? (
                  <form onSubmit={sendOtp} className="mt-6 space-y-4">
                    <div>
                      <label className="label">Mobile number</label>
                      <div className={`flex items-stretch overflow-hidden rounded-lg border bg-white transition ${phone ? 'border-slate-300' : 'border-slate-200'} focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100`}>
                        <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap border-r border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-500">
                          <span className="rounded-[2px] bg-orange-500 px-1 text-[9px] font-bold leading-[14px] text-white">IN</span> +91
                        </span>
                        <input className="w-full border-0 bg-transparent px-3 py-2.5 text-base tracking-wide outline-none"
                          type="tel" inputMode="numeric" required autoFocus maxLength={10} placeholder="98765 43210"
                          value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} />
                      </div>
                      <p className="mt-1.5 text-xs text-slate-400">Already an associate, or new here — either way, this gets you in.</p>
                    </div>
                    <button className="btn-primary flex w-full items-center justify-center gap-2" disabled={busy || !phoneValid}>
                      {busy ? <Spinner /> : <Icon.send />} {busy ? 'Sending…' : 'Send OTP'}
                    </button>
                  </form>
                ) : (
                  <div className="mt-6 space-y-4">
                    <OtpBoxes value={otp} onChange={setOtp} onComplete={verify} />

                    {isNewUser && (
                      <>
                        <div>
                          <label className="label">Full name</label>
                          <input className="input" placeholder="Enter your full name" value={name} onChange={(e) => setName(e.target.value)} />
                        </div>
                        <div>
                          <label className="label">Email <span className="text-slate-400">(optional)</span></label>
                          <input className="input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                        </div>
                      </>
                    )}

                    <button className="btn-primary flex w-full items-center justify-center gap-2"
                      disabled={busy || otp.length !== 6 || !nameOk} onClick={() => verify()}>
                      {busy && <Spinner />} {busy ? 'Verifying…' : isNewUser ? 'Create associate account' : 'Verify & sign in'}
                    </button>

                    <div className="flex items-center justify-between text-sm">
                      <button type="button" className="font-medium text-slate-500 hover:text-slate-700" onClick={() => { setStage('phone'); setOtp(''); }}>
                        ← Change number
                      </button>
                      {cooldown > 0 ? (
                        <span className="text-slate-400">Resend in {mm}:{ss}</span>
                      ) : (
                        <button type="button" disabled={busy} onClick={(e) => sendOtp(e, true)} className="font-semibold text-brand-700 hover:underline">
                          Resend OTP
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <p className="mt-5 text-center text-sm text-slate-500">
                  Looking to buy, browse or list a property?{' '}
                  <Link to="/login" className="font-medium text-brand-700 hover:underline">Go to customer sign-in →</Link>
                </p>
                <div className="mt-4 border-t border-slate-100 pt-4 text-center text-xs text-slate-400">
                  Are you an admin?{' '}
                  <Link to="/admin/login" className="font-medium text-slate-500 hover:text-brand-700 hover:underline">
                    Admin sign in
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
