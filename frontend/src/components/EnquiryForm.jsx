import { useState } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { api, apiError } from '../lib/api';
import { selectUser } from '../features/auth/authSlice';
import { Field } from './ui';

export default function EnquiryForm({ projectId, propertyId, compact }) {
  const user = useSelector(selectUser);
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const ref = new URLSearchParams(window.location.search).get('ref') || undefined;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/leads', { projectId, propertyId, referralCode: ref, ...form });
      setDone(true);
      toast.success('Enquiry sent! Our team will contact you shortly.');
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="card p-6 text-center">
        <p className="text-2xl">✅</p>
        <p className="mt-2 font-medium">Thanks, {form.name || 'there'}!</p>
        <p className="mt-1 text-sm text-slate-500">We&apos;ve logged your enquiry and an advisor will reach out soon.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={compact ? 'space-y-3' : 'card space-y-4 p-5'}>
      {!compact && <h3 className="text-base font-semibold">Enquire about this {propertyId ? 'unit' : 'project'}</h3>}
      <Field label="Name">
        <input className="input" required value={form.name} onChange={set('name')} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Phone">
          <input className="input" required value={form.phone} onChange={set('phone')} />
        </Field>
        <Field label="Email">
          <input className="input" type="email" value={form.email} onChange={set('email')} />
        </Field>
      </div>
      <Field label="Message">
        <textarea className="input min-h-[80px]" value={form.message} onChange={set('message')}
          placeholder="I'd like to know more about pricing and availability…" />
      </Field>
      <button className="btn-primary w-full" disabled={submitting}>
        {submitting ? 'Sending…' : 'Send enquiry'}
      </button>
      {ref && <p className="text-center text-xs text-slate-400">Referred by agent code: {ref}</p>}
    </form>
  );
}
