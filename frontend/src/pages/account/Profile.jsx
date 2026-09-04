import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { api, apiError } from '../../lib/api';
import { selectUser, setUser } from '../../features/auth/authSlice';

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
    <div className="max-w-lg space-y-8">
      <div>
        <h1 className="text-xl font-bold">Profile</h1>
        <form onSubmit={saveProfile} className="card mt-3 space-y-4 p-5">
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
            <input className="input bg-slate-50" value={user?.email} disabled />
          </div>
          <button className="btn-primary" disabled={busy}>Save changes</button>
        </form>
      </div>

      <div>
        <h2 className="font-semibold">Change password</h2>
        <form onSubmit={changePw} className="card mt-3 space-y-4 p-5">
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
