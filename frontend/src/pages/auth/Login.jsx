import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { login } from '../../features/auth/authSlice';
import { apiError } from '../../lib/api';
import { AuthShell } from './AuthShell';

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ emailOrPhone: '', password: '' });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const user = await dispatch(login(form)).unwrap();
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      const dest =
        location.state?.from?.pathname ||
        (['ADMIN', 'SUBADMIN'].includes(user.role) ? '/admin' : user.role === 'AGENT' ? '/agent' : '/account');
      navigate(dest, { replace: true });
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Sign in to Propszy" subtitle="Access your dashboard, favorites and enquiries.">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Email or phone</label>
          <input className="input" required value={form.emailOrPhone}
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
      <p className="mt-4 text-center text-sm text-slate-500">
        New here? <Link to="/register" className="font-medium text-brand-700 hover:underline">Create an account</Link>
      </p>
    </AuthShell>
  );
}
