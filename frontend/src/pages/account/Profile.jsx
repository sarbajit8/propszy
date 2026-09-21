import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { api, apiError } from '../../lib/api';
import { selectUser, setUser } from '../../features/auth/authSlice';
import { avatarPlaceholder } from '../../lib/placeholder';

const GLASS = 'rounded-2xl border border-white/60 bg-white/70 shadow-sm shadow-slate-200/40 backdrop-blur-xl';

export default function Profile() {
  const user = useSelector(selectUser);
  const dispatch = useDispatch();
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [busy, setBusy] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.patch('/users/me', form);
      dispatch(setUser(data.data.user));
      toast.success('Profile updated');
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  const changePw = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users/me/change-password', pw);
      toast.success('Password changed — please sign in again');
    } catch (err) {
      toast.error(apiError(err));
    }
  };

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Profile</h1>
        <p className="text-sm text-slate-500">Manage your personal details.</p>
      </div>

      <div className={`flex items-center gap-4 p-5 ${GLASS}`}>
        <img src={user?.avatarUrl || avatarPlaceholder(user?.name)} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover ring-4 ring-brand-50" />
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-slate-900">{user?.name}</p>
          <p className="truncate text-sm text-slate-500">{user?.phone ? `+91 ${user.phone}` : user?.email}</p>
          <span className="mt-1 inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">Customer</span>
        </div>
      </div>

      <div className={`p-5 ${GLASS}`}>
        <h2 className="text-sm font-semibold text-slate-900">Personal details</h2>
        <form onSubmit={saveProfile} className="mt-4 space-y-4">
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input bg-slate-50" value={user?.email?.includes('@phone.propszy.local') ? 'Not set' : user?.email} disabled />
          </div>
          <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
        </form>
      </div>

      <div className={`p-5 ${GLASS}`}>
        <h2 className="text-sm font-semibold text-slate-900">Change password</h2>
        <p className="mt-0.5 text-xs text-slate-400">Only applies if your account also has a password set.</p>
        <form onSubmit={changePw} className="mt-4 space-y-4">
          <div>
            <label className="label">Current password</label>
            <input className="input" type="password" value={pw.currentPassword}
              onChange={(e) => setPw((p) => ({ ...p, currentPassword: e.target.value }))} />
          </div>
          <div>
            <label className="label">New password</label>
            <input className="input" type="password" minLength={8} value={pw.newPassword}
              onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))} />
          </div>
          <button className="btn-outline">Update password</button>
        </form>
      </div>
    </div>
  );
}
