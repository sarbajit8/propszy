import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { api, unwrap, apiError } from '../../lib/api';
import { selectUser, setUser } from '../../features/auth/authSlice';
import { PageLoader } from '../../components/ui';
import ImageUpload from '../../components/ImageUpload';

const MASK = '••••••••'; // server placeholder for a stored secret

// How each group renders: label + per-field control hints
const FIELD_META = {
  'integrations.googleMaps': {
    hint: 'Maps JavaScript API key, default state/city selection, and center coordinates for the Map page.',
    fields: {
      apiKey: { label: 'Google Maps API key', type: 'text', wide: true },
      defaultCity: { label: 'Default Map City', placeholder: 'Kolkata', hint: 'Default city selected in map view' },
      defaultState: { label: 'Default Map State', placeholder: 'West Bengal', hint: 'Default state selected in map view' },
      defaultLat: { label: 'Default Center Latitude', type: 'number', placeholder: '22.5726' },
      defaultLng: { label: 'Default Center Longitude', type: 'number', placeholder: '88.3639' },
      defaultZoom: { label: 'Default Zoom Level (1-20)', type: 'number', placeholder: '11' },
    },
  },
  'integrations.smtp': {
    hint: 'Used for enquiry alerts, KYC/commission notifications and password resets.',
    fields: {
      host: { label: 'Host' },
      port: { label: 'Port', type: 'number' },
      secure: { label: 'Use TLS (port 465)', type: 'checkbox' },
      user: { label: 'Username' },
      pass: { label: 'Password', type: 'password' },
      from: { label: 'From address', wide: true, placeholder: 'Propszy <no-reply@propszy.com>' },
    },
    testEmail: true,
  },
  'integrations.sms': {
    hint: 'Generic provider hook (MSG91 / Twilio / Gupshup / Kaleyra…). Turn on "enabled" once configured.',
    fields: {
      enabled: { label: 'Enabled', type: 'checkbox' },
      provider: { label: 'Provider key', placeholder: 'msg91' },
      apiKey: { label: 'API key', type: 'password' },
      senderId: { label: 'Sender ID' },
      whatsappApiUrl: { label: 'WhatsApp / send URL', wide: true },
    },
  },
  'integrations.otp': {
    hint: 'Powers mobile OTP login/registration via apitxt.com\'s Unified OTP API (SMS / WhatsApp / Voice).',
    fields: {
      enabled: { label: 'Enabled', type: 'checkbox' },
      authkey: { label: 'Auth key', type: 'password', wide: true },
      channel: { label: 'Channel', type: 'select', options: ['sms', 'whatsapp', 'voice'] },
      country: { label: 'Country code', placeholder: '91' },
      templateId: { label: 'SMS template id (optional)' },
      templateName: { label: 'WhatsApp template name (optional)' },
      projectRefId: { label: 'WhatsApp project ref id (optional)' },
    },
  },
  'integrations.storage': {
    hint: 'Media storage driver. Changing this takes effect after a backend restart.',
    fields: {
      driver: { label: 'Driver', type: 'select', options: ['local', 's3', 'cloudinary'] },
      s3Bucket: { label: 'S3 bucket' },
      s3Region: { label: 'S3 region' },
      s3AccessKeyId: { label: 'S3 access key id' },
      s3SecretAccessKey: { label: 'S3 secret access key', type: 'password' },
      cloudinaryUrl: { label: 'Cloudinary URL', type: 'password', wide: true },
    },
  },
  analytics: {
    hint: 'Google Analytics 4 measurement id — injected on the public site.',
    fields: { gaId: { label: 'GA4 measurement id', placeholder: 'G-XXXXXXX' } },
  },
  branding: {
    hint: 'Shown across the site and in emails.',
    fields: {
      companyName: { label: 'Company name' },
      logoUrl: { label: 'Logo', type: 'logo', wide: true },
      supportEmail: { label: 'Support email' },
      supportPhone: { label: 'Support phone' },
      primaryColor: { label: 'Primary color', type: 'color' },
    },
  },
  'pages.customerAuth': {
    hint: 'The mobile-OTP sign-in / sign-up page customers see at /login.',
    fields: {
      heroImage: { label: 'Hero photo', type: 'image', folder: 'pages', aspect: 'aspect-[16/9]', wide: true },
      badge: { label: 'Badge text', placeholder: 'Trusted Real Estate Platform' },
      heading1: { label: 'Heading line 1', placeholder: 'Better Homes' },
      heading2: { label: 'Heading line 2 (accent color)', placeholder: 'Brighter Futures' },
      blurb: { label: 'Blurb', type: 'textarea', wide: true },
      cardTitle: { label: 'Floating card title', placeholder: 'Find Your Dream Home' },
      cardSubtitle: { label: 'Floating card subtitle', placeholder: 'Apartments · Villas · Plots · Commercial' },
    },
  },
  'pages.agentAuth': {
    hint: 'The associate sign-up page at /register?role=associate.',
    fields: {
      heroImage: { label: 'Hero photo', type: 'image', folder: 'pages', aspect: 'aspect-[16/9]', wide: true },
      badge: { label: 'Badge text', placeholder: 'Partner Programme' },
      heading1: { label: 'Heading line 1', placeholder: 'Earn as a' },
      heading2: { label: 'Heading line 2 (accent color)', placeholder: 'Propszy Associate.' },
      blurb: { label: 'Blurb', type: 'textarea', wide: true },
      cardTitle: { label: 'Floating card title', placeholder: 'Every sale, rewarded' },
      cardSubtitle: { label: 'Floating card subtitle', placeholder: 'Track pending & paid commission live' },
    },
  },
};

export default function AdminSettings() {
  const qc = useQueryClient();
  const user = useSelector(selectUser);
  const dispatch = useDispatch();

  const { data, isLoading } = useQuery({ queryKey: ['admin-settings'], queryFn: () => unwrap(api.get('/settings')) });
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [testTo, setTestTo] = useState('');

  // Admin Credentials form state
  const [adminCreds, setAdminCreds] = useState({
    name: user?.name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [savingCreds, setSavingCreds] = useState(false);

  useEffect(() => {
    if (user) {
      setAdminCreds((prev) => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email,
      }));
    }
  }, [user]);

  useEffect(() => {
    if (data) {
      const d = {};
      for (const [k, group] of Object.entries(data)) d[k] = { ...group.values };
      setDraft(d);
    }
  }, [data]);

  if (isLoading || !data) return <PageLoader />;

  const setField = (group, field, value) =>
    setDraft((d) => ({ ...d, [group]: { ...d[group], [field]: value } }));

  const updateAdminCreds = async (e) => {
    e.preventDefault();
    if (!adminCreds.currentPassword) {
      return toast.error('Current password is required to update credentials');
    }
    if (adminCreds.newPassword) {
      if (adminCreds.newPassword.length < 8) {
        return toast.error('New password must be at least 8 characters');
      }
      if (adminCreds.newPassword !== adminCreds.confirmPassword) {
        return toast.error('New password and confirm password do not match');
      }
    }
    setSavingCreds(true);
    try {
      const res = await api.patch('/users/me/credentials', {
        name: adminCreds.name,
        email: adminCreds.email,
        currentPassword: adminCreds.currentPassword,
        newPassword: adminCreds.newPassword || undefined,
      });
      dispatch(setUser(res.data.data.user));
      toast.success('Admin ID & password updated successfully!');
      setAdminCreds((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSavingCreds(false);
    }
  };

  const save = async () => {
    setSaving(true);
    // Only send fields the admin actually changed; never resend the mask.
    const patch = {};
    for (const [group, values] of Object.entries(draft)) {
      const changed = {};
      for (const [f, v] of Object.entries(values)) {
        if (v === MASK) continue;
        if (data[group]?.values?.[f] !== v) changed[f] = v;
      }
      if (Object.keys(changed).length) patch[group] = changed;
    }
    if (!Object.keys(patch).length) {
      setSaving(false);
      return toast('Nothing changed');
    }
    try {
      await api.put('/settings', patch);
      toast.success('Settings saved');
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      qc.invalidateQueries({ queryKey: ['public-config'] });
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    if (!testTo) return toast.error('Enter an email address');
    try {
      await api.post('/settings/test-email', { to: testTo });
      toast.success(`Test email sent to ${testTo}`);
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  return (
    <div className="max-w-3xl space-y-8 pb-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Settings &amp; integrations</h1>
          <p className="mt-0.5 text-xs text-slate-500">Manage admin credentials, API keys, and platform integrations.</p>
        </div>
        <button className="btn-primary" disabled={saving} onClick={save}>
          {saving ? 'Saving…' : 'Save all integrations'}
        </button>
      </div>

      {/* ── Admin ID & Password Section ───────────────────────────── */}
      <section id="admin-credentials" className="card p-6 border-2 border-brand-200/80 bg-gradient-to-br from-white via-white to-brand-50/30 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-600 text-white shadow-sm">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
              </span>
              <h2 className="text-base font-bold text-slate-900">Admin Account Credentials (ID &amp; Password)</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Update your Admin login email/ID and password. These credentials are used to sign in at <code className="rounded bg-slate-100 px-1 text-brand-700">/admin/login</code>.
            </p>
          </div>
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 border border-brand-200/50">
            Active ID: {user?.email}
          </span>
        </div>

        <form onSubmit={updateAdminCreds} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Admin Name</label>
              <input
                className="input"
                value={adminCreds.name}
                onChange={(e) => setAdminCreds((c) => ({ ...c, name: e.target.value }))}
                placeholder="Propszy Admin"
                required
              />
            </div>
            <div>
              <label className="label">Admin Login ID (Email) *</label>
              <input
                className="input font-medium"
                type="email"
                value={adminCreds.email}
                onChange={(e) => setAdminCreds((c) => ({ ...c, email: e.target.value }))}
                placeholder="admin@propszy.com"
                required
              />
              <p className="mt-1 text-[11px] text-slate-400">Used as your login username/email for the Admin Console.</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Password Update</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="label">Current Password *</label>
                <input
                  className="input bg-white"
                  type="password"
                  value={adminCreds.currentPassword}
                  onChange={(e) => setAdminCreds((c) => ({ ...c, currentPassword: e.target.value }))}
                  placeholder="Required for security"
                  required
                />
              </div>
              <div>
                <label className="label">New Password (optional)</label>
                <input
                  className="input bg-white"
                  type="password"
                  minLength={8}
                  value={adminCreds.newPassword}
                  onChange={(e) => setAdminCreds((c) => ({ ...c, newPassword: e.target.value }))}
                  placeholder="Leave blank to keep same"
                />
              </div>
              <div>
                <label className="label">Confirm New Password</label>
                <input
                  className="input bg-white"
                  type="password"
                  minLength={8}
                  value={adminCreds.confirmPassword}
                  onChange={(e) => setAdminCreds((c) => ({ ...c, confirmPassword: e.target.value }))}
                  placeholder="Re-type new password"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button type="submit" className="btn-primary" disabled={savingCreds}>
              {savingCreds ? 'Updating Credentials…' : 'Save Admin ID & Password'}
            </button>
          </div>
        </form>
      </section>

      {Object.entries(data).map(([groupKey, group]) => {
        const meta = FIELD_META[groupKey] || { fields: {} };
        const values = draft[groupKey] || {};
        return (
          <section key={groupKey} className="card p-5">
            <h2 className="text-base font-semibold">{group.label}</h2>
            {meta.hint && <p className="mt-1 text-sm text-slate-500">{meta.hint}</p>}

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {Object.entries(meta.fields).map(([field, fm]) => {
                const val = values[field] ?? '';
                const common = 'input';
                return (
                  <div key={field} className={fm.wide ? 'sm:col-span-2' : ''}>
                    <label className="label">{fm.label}</label>
                    {fm.type === 'checkbox' ? (
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={!!val}
                          onChange={(e) => setField(groupKey, field, e.target.checked)} />
                        <span className="text-slate-500">enable</span>
                      </label>
                    ) : fm.type === 'select' ? (
                      <select className={common} value={val} onChange={(e) => setField(groupKey, field, e.target.value)}>
                        {fm.options.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : fm.type === 'color' ? (
                      <div className="flex items-center gap-2">
                        <input type="color" value={val || '#7c3aed'} onChange={(e) => setField(groupKey, field, e.target.value)}
                          className="h-9 w-12 rounded border border-slate-300" />
                        <input className={common} value={val} onChange={(e) => setField(groupKey, field, e.target.value)} />
                      </div>
                    ) : fm.type === 'logo' ? (
                      <div className="flex items-center gap-3">
                        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                          {val ? <img src={val} alt="logo" className="max-h-full max-w-full object-contain" /> : <span className="text-lg font-bold text-brand-600">P</span>}
                        </div>
                        <div className="flex-1">
                          <ImageUpload value={val} folder="branding" aspect="aspect-[3/1]" onChange={(url) => setField(groupKey, field, url)} />
                          {val && <button type="button" className="mt-1 text-xs text-rose-600 hover:underline" onClick={() => setField(groupKey, field, '')}>Remove — use default</button>}
                        </div>
                      </div>
                    ) : fm.type === 'image' ? (
                      <div>
                        <ImageUpload value={val} folder={fm.folder || 'pages'} aspect={fm.aspect || 'aspect-[16/9]'} onChange={(url) => setField(groupKey, field, url)} />
                        {val && <button type="button" className="mt-1 text-xs text-rose-600 hover:underline" onClick={() => setField(groupKey, field, '')}>Remove — use default</button>}
                      </div>
                    ) : fm.type === 'textarea' ? (
                      <textarea
                        className={`${common} min-h-[80px]`}
                        value={val}
                        placeholder={fm.placeholder}
                        onChange={(e) => setField(groupKey, field, e.target.value)}
                      />
                    ) : (
                      <input
                        className={common}
                        type={fm.type === 'number' ? 'number' : fm.type === 'password' ? 'password' : 'text'}
                        value={val}
                        placeholder={fm.placeholder || (val === MASK ? 'unchanged — type to replace' : '')}
                        onFocus={(e) => { if (e.target.value === MASK) setField(groupKey, field, ''); }}
                        onChange={(e) => setField(groupKey, field, e.target.value)}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {meta.testEmail && (
              <div className="mt-4 flex items-end gap-2 border-t border-slate-100 pt-4">
                <div className="flex-1">
                  <label className="label">Send a test email to</label>
                  <input className="input" type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com" />
                </div>
                <button type="button" className="btn-outline" onClick={sendTest}>Send test</button>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
