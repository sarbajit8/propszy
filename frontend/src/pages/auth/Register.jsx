import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { register } from '../../features/auth/authSlice';
import { api, apiError } from '../../lib/api';
import { AuthShell } from './AuthShell';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Register() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const wantsAgent = sp.get('role') === 'agent';
  const ref = sp.get('ref') || '';

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', referralCode: ref });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((x) => ({ ...x, [k]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (form.name.trim().length < 2) e.name = 'Please enter your full name';
    if (!EMAIL_RE.test(form.email.trim())) e.email = 'Enter a valid email address';
    if (form.phone.trim() && form.phone.replace(/\D/g, '').length < 7) e.phone = 'Enter a valid phone number';
    if (form.password.length < 8) e.password = 'At least 8 characters';
    if (form.referralCode.trim() && form.referralCode.trim().length < 4) e.referralCode = 'Referral code looks wrong';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setBusy(true);

    // only send fields that have a value
    const payload = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
      ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
      ...(form.referralCode.trim() ? { referralCode: form.referralCode.trim() } : {}),
    };

    try {
      await dispatch(register(payload)).unwrap();

      if (wantsAgent) {
        try {
          await api.post('/agents/apply', payload.referralCode ? { referralCode: payload.referralCode } : {});
        } catch (e) {
          // account exists; just send them to the KYC page to continue
          toast(apiError(e));
        }
        toast.success('Agent account created — complete your KYC to start earning.');
        navigate('/agent/kyc');
      } else {
        toast.success('Welcome to Propszy!');
        navigate('/account');
      }
    } catch (err) {
      const msg = apiError(err);
      // map a "field: message" server error onto the field
      const m = /^(\w+):\s*(.+)$/.exec(msg);
      if (m && form[m[1]] !== undefined) setErrors((x) => ({ ...x, [m[1]]: m[2] }));
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const field = (k, label, { type = 'text', optional = false, ...rest } = {}) => (
    <div>
      <label className="label">
        {label} {optional && <span className="text-slate-400">(optional)</span>}
      </label>
      <input
        className={`input ${errors[k] ? 'border-rose-400 focus:ring-rose-200' : ''}`}
        type={type}
        value={form[k]}
        onChange={set(k)}
        {...rest}
      />
      {errors[k] && <p className="mt-1 text-xs text-rose-600">{errors[k]}</p>}
    </div>
  );

  return (
    <AuthShell
      title={wantsAgent ? 'Become a Propszy agent' : 'Create your account'}
      subtitle={
        wantsAgent
          ? 'Register, complete a one-time KYC, then start earning level-wise commission.'
          : 'Save favourites and track your enquiries.'
      }
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        {field('name', 'Full name', { autoComplete: 'name' })}
        <div className="grid gap-3 sm:grid-cols-2">
          {field('email', 'Email', { type: 'email', autoComplete: 'email' })}
          {field('phone', 'Phone', { type: 'tel', autoComplete: 'tel', optional: true })}
        </div>
        {field('password', 'Password', { type: 'password', autoComplete: 'new-password', placeholder: 'At least 8 characters' })}
        {field('referralCode', wantsAgent ? 'Sponsor referral code' : 'Referral code', { optional: true, placeholder: 'Agent code' })}

        {wantsAgent && (
          <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-800">
            After signing up you’ll be taken to KYC: personal &amp; PAN details, 4 documents and payout bank —
            then submit for admin review.
          </p>
        )}

        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Creating…' : wantsAgent ? 'Create agent account' : 'Create account'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-brand-700 hover:underline">Sign in</Link>
      </p>
      {!wantsAgent && (
        <p className="mt-2 text-center text-sm">
          <Link to="/register?role=agent" className="text-brand-700 hover:underline">Register as an agent instead →</Link>
        </p>
      )}
    </AuthShell>
  );
}
