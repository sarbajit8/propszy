import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, apiError } from '../../lib/api';
import { AuthShell } from './AuthShell';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell variant="staff" title="Reset your password" subtitle="Admin &amp; sub-admin accounts only — we'll email you a secure reset link.">
      {sent ? (
        <div className="card p-6 text-center text-sm text-slate-600">
          If an account exists for <b>{email}</b>, a reset link is on its way.
          <div className="mt-4"><Link to="/admin/login" className="btn-outline">Back to sign in</Link></div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
        </form>
      )}
    </AuthShell>
  );
}

export function ResetPassword() {
  const params = new URLSearchParams(window.location.search);
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/auth/reset-password', {
        email: params.get('email'),
        token: params.get('token'),
        password,
      });
      setDone(true);
      toast.success('Password updated — sign in with your new password.');
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell variant="staff" title="Choose a new password">
      {done ? (
        <Link to="/admin/login" className="btn-primary w-full">Go to sign in</Link>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">New password</label>
            <input className="input" type="password" required minLength={8} value={password}
              onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Saving…' : 'Update password'}</button>
        </form>
      )}
    </AuthShell>
  );
}
