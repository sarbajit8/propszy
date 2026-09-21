import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { api, apiError } from '../lib/api';
import { selectUser, requestOtp, verifyOtp } from '../features/auth/authSlice';
import { Field } from './ui';

export default function EnquiryForm({ projectId, propertyId, compact }) {
  const user = useSelector(selectUser);
  const dispatch = useDispatch();
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  // form -> otp -> done (only for a guest; a signed-in user skips straight to done)
  const [step, setStep] = useState('form');
  const [leadId, setLeadId] = useState(null);
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  const ref = new URLSearchParams(window.location.search).get('ref') || undefined;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await api.post('/leads', { projectId, propertyId, referralCode: ref, ...form });
      // the enquiry is captured right away, before any OTP step — so it reaches
      // admin even if the visitor never finishes (or fails) verification below
      if (user) {
        setDone(true);
        toast.success('Enquiry sent! Our team will contact you shortly.');
      } else {
        setLeadId(data.data.id);
        await dispatch(requestOtp(form.phone)).unwrap();
        setStep('otp');
        toast.success('Enquiry received — verify your number to finish.');
      }
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const verify = async (e) => {
    e.preventDefault();
    if (otp.trim().length !== 6) { toast.error('Enter the 6-digit code'); return; }
    setVerifying(true);
    try {
      await dispatch(verifyOtp({ phone: form.phone, otp: otp.trim(), name: form.name, email: form.email || undefined, referralCode: ref, leadId })).unwrap();
      setDone(true);
      toast.success('Number verified — you’re all set!');
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Incorrect or expired code');
    } finally {
      setVerifying(false);
    }
  };

  const resend = async () => {
    setResending(true);
    try {
      await dispatch(requestOtp(form.phone)).unwrap();
      toast.success('Code resent');
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Could not resend code');
    } finally {
      setResending(false);
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

  if (step === 'otp') {
    return (
      <form onSubmit={verify} className={compact ? 'space-y-3' : 'card space-y-4 p-5'}>
        {!compact && <h3 className="text-base font-semibold">Verify your number</h3>}
        <p className="text-sm text-slate-500">
          We&apos;ve got your enquiry. Enter the 6-digit code sent to <b className="text-slate-700">{form.phone}</b> to
          verify your number{user ? '' : ' and create your Propszy account'}.
        </p>
        <Field label="OTP code">
          <input
            className="input text-center text-lg tracking-[0.4em]"
            inputMode="numeric"
            maxLength={6}
            autoFocus
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          />
        </Field>
        <button className="btn-primary w-full" disabled={verifying}>
          {verifying ? 'Verifying…' : 'Verify & continue'}
        </button>
        <div className="flex items-center justify-between text-xs">
          <button type="button" onClick={() => setStep('form')} className="text-slate-400 hover:text-slate-600">
            ← Edit number
          </button>
          <button type="button" onClick={resend} disabled={resending} className="font-medium text-brand-700 hover:underline disabled:opacity-50">
            {resending ? 'Sending…' : 'Resend code'}
          </button>
        </div>
        <p className="text-center text-xs text-slate-400">
          Your enquiry is already saved — verifying just confirms it&apos;s really you.
        </p>
      </form>
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
          <input className="input" type="tel" required value={form.phone} onChange={set('phone')} placeholder="10-digit mobile number" />
        </Field>
        <Field label="Email (optional)">
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
      {!user && (
        <p className="text-center text-xs text-slate-400">We&apos;ll text a one-time code to verify your mobile number.</p>
      )}
      {ref && <p className="text-center text-xs text-slate-400">Referred by associate code: {ref}</p>}
    </form>
  );
}
