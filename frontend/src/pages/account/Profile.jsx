import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, apiError } from '../../lib/api';
import { selectUser, setUser } from '../../features/auth/authSlice';
import { avatarPlaceholder } from '../../lib/placeholder';

const GLASS = 'rounded-2xl border border-white/60 bg-white/70 shadow-sm shadow-slate-200/40 backdrop-blur-xl';

export default function Profile() {
  const user = useSelector(selectUser);
  const dispatch = useDispatch();
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email?.includes('@phone.propszy.local') ? '' : (user?.email || ''),
  });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [busy, setBusy] = useState(false);

  const isAgent = user?.role === 'AGENT';
  const isPendingUpgrade = user?.role === 'CUSTOMER' && user?.kycStatus === 'PENDING';
  const isRejectedUpgrade = user?.role === 'CUSTOMER' && user?.kycStatus === 'REJECTED';

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
    if (!pw.currentPassword) return toast.error('Enter your current password');
    if (pw.newPassword.length < 8) return toast.error('New password must be at least 8 characters');
    try {
      await api.post('/users/me/change-password', pw);
      toast.success('Password changed successfully');
      setPw({ currentPassword: '', newPassword: '' });
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
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {isAgent ? (
              <>
                <span className="inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">Associate</span>
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">Customer</span>
              </>
            ) : (
              <span className="inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">Customer</span>
            )}
            {isPendingUpgrade && (
              <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">⏳ Associate upgrade: pending review</span>
            )}
            {isRejectedUpgrade && (
              <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">✗ Associate upgrade: rejected</span>
            )}
          </div>
        </div>
      </div>

      {/* Agent upgrade status / CTA */}
      {isAgent && (
        <div className={`p-5 ${GLASS}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Associate &amp; Customer Account</p>
              <p className="mt-0.5 text-xs text-slate-500">You have full access to both the Associate Dashboard and Customer Dashboard.</p>
            </div>
            <Link to="/associate" className="shrink-0 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700">
              Open Associate Dashboard
            </Link>
          </div>
          {user?.referralCode && (
            <p className="mt-3 text-xs text-slate-500">Your referral code: <span className="font-mono font-bold text-slate-800">{user.referralCode}</span></p>
          )}
        </div>
      )}
      {isPendingUpgrade && (
        <div className={`p-5 ${GLASS}`}>
          <p className="text-sm font-semibold text-amber-800">⏳ Associate Upgrade Under Review</p>
          <p className="mt-1 text-xs text-slate-500">Your KYC application is being reviewed by the Propszy admin team. You will be notified once it's approved.</p>
        </div>
      )}
      {isRejectedUpgrade && (
        <div className={`p-5 ${GLASS}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-rose-700">Associate Upgrade Rejected</p>
              <p className="mt-0.5 text-xs text-slate-500">Your KYC application was rejected. You can update your details and resubmit.</p>
            </div>
            <Link to="/become-associate" className="shrink-0 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700">
              Resubmit KYC
            </Link>
          </div>
        </div>
      )}
      {!isAgent && !isPendingUpgrade && !isRejectedUpgrade && (
        <div className={`p-5 ${GLASS}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Become a Propszy Associate</p>
              <p className="mt-0.5 text-xs text-slate-500">Earn level-wise commissions, build a network, and get dual dashboard access.</p>
            </div>
            <Link to="/become-associate" className="shrink-0 rounded-lg border border-brand-300 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100">
              Apply Now
            </Link>
          </div>
        </div>
      )}

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
            <label className="label">Email / Login ID</label>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="you@domain.com"
            />
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

