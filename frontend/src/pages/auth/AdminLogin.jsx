import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { login, logout, selectUser } from '../../features/auth/authSlice';
import { apiError } from '../../lib/api';
import Logo from '../../components/Logo';

const HERO_IMG = 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=75';

const Icon = {
  shield: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M12 3l7 3v6c0 4.4-3 7.9-7 9-4-1.1-7-4.6-7-9V6l7-3z" strokeLinejoin="round" /></svg>,
  tools: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.3 2.3-2-2z" strokeLinejoin="round" /></svg>,
  layers: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="M12 3l9 5-9 5-9-5 9-5z" strokeLinejoin="round" /><path d="M3 13l9 5 9-5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  shieldLock: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="M12 3l7 3v6c0 4.4-3 7.9-7 9-4-1.1-7-4.6-7-9V6l7-3z" strokeLinejoin="round" /><rect x="9.5" y="11" width="5" height="4" rx="1" /><path d="M10.5 11V9.5a1.5 1.5 0 0 1 3 0V11" strokeLinecap="round" /></svg>,
  gauge: (p) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M4 14a8 8 0 1 1 16 0" strokeLinecap="round" /><path d="M12 14l4-5" strokeLinecap="round" /><path d="M4 14h16" strokeLinecap="round" /></svg>,
};

const FEATURES = [
  [Icon.tools, 'violet', 'Manage', 'projects & leads'],
  [Icon.layers, 'blue', 'Configure', 'the whole platform'],
  [Icon.shieldLock, 'emerald', 'Review KYC', '& approvals'],
];

const TINT = {
  violet: 'bg-brand-100 text-brand-600',
  blue: 'bg-sky-100 text-sky-600',
  emerald: 'bg-emerald-100 text-emerald-600',
};

// Admin/sub-admin sign-in only — password-based, no OTP. Associates sign in
// separately at /associate/login with mobile OTP (see AgentLogin.jsx).
export default function AdminLogin() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector(selectUser);
  const [form, setForm] = useState({ emailOrPhone: '', password: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (['ADMIN', 'SUBADMIN'].includes(user.role)) {
      navigate(location.state?.from?.pathname || '/admin', { replace: true });
    } else if (user.role === 'AGENT') {
      navigate('/associate', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, [user, navigate, location]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const signedIn = await dispatch(login(form)).unwrap();
      if (!['ADMIN', 'SUBADMIN'].includes(signedIn.role)) {
        await dispatch(logout());
        toast.error(
          signedIn.role === 'AGENT'
            ? 'Associates sign in with mobile OTP — please use the associate sign-in page.'
            : 'This is the admin console. Please sign in from the main site.'
        );
        return;
      }
      toast.success(`Welcome back, ${signedIn.name.split(' ')[0]}!`);
      navigate(location.state?.from?.pathname || '/admin', { replace: true });
    } catch (err) {
      toast.error(apiError(err));
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
          <div className="pointer-events-none absolute right-0 top-1/3 h-72 w-72 rounded-full bg-sky-200/30 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/4 h-56 w-56 rounded-full bg-emerald-200/20 blur-3xl" />

          <Link to="/" className="relative z-10 inline-flex w-fit items-center"><Logo imgClassName="h-8" /></Link>

          <div className="relative z-10 mt-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
              <Icon.shield /> Admin Console
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.1] text-slate-900 xl:text-[44px]">
              Manage the platform<br /><span className="text-brand-600">with full control.</span>
            </h1>
            <p className="mt-4 max-w-md text-slate-500">
              Projects, properties, associates, KYC, MLM commissions and site content — everything in one console.
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
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600"><Icon.gauge /></span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">One console, full control</p>
                  <p className="truncate text-xs text-slate-500">Leads, listings & payouts in real time</p>
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
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-100 text-brand-600"><Icon.shieldLock width="22" height="22" /></span>
                <h1 className="mt-4 text-2xl font-extrabold text-slate-900">Admin sign in</h1>
                <p className="mt-1 text-sm text-slate-500">For Propszy admins &amp; sub-admins only.</p>

                <form onSubmit={submit} className="mt-6 space-y-4">
                  <div>
                    <label className="label">Email or phone</label>
                    <input className="input" required autoFocus value={form.emailOrPhone}
                      onChange={(e) => setForm((f) => ({ ...f, emailOrPhone: e.target.value }))} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="label">Password</label>
                      <Link to="/forgot-password" className="text-xs text-brand-700 hover:underline">Forgot?</Link>
                    </div>
                    <input className="input" type="password" required value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
                  </div>
                  <button className="btn-primary w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
                </form>

                <p className="mt-5 text-center text-sm text-slate-500">
                  Looking to buy, browse or list a property?{' '}
                  <Link to="/login" className="font-medium text-brand-700 hover:underline">Go to customer sign-in →</Link>
                </p>
                <div className="mt-4 border-t border-slate-100 pt-4 text-center text-xs text-slate-400">
                  Are you an associate?{' '}
                  <Link to="/associate/login" className="font-medium text-slate-500 hover:text-brand-700 hover:underline">
                    Sign in with mobile OTP
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
