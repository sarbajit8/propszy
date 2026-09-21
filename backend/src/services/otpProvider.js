// Sends an OTP via apitxt.com's "Unified OTP API" (SMS / WhatsApp / Voice, one endpoint).
// Config (authkey + channel + template ids) is admin-editable — Settings → Mobile OTP.
const { getRaw } = require('../modules/settings/settings.service');

const ENDPOINT = 'https://apitxt.com/api/sendOTP';

async function sendOtpSms(mobile, otp) {
  const cfg = await getRaw('integrations.otp');
  if (!cfg.authkey) {
    // eslint-disable-next-line no-console
    console.log(`[otp:unconfigured] → ${mobile}: ${otp}`);
    return { ok: false, skipped: 'not-configured' };
  }

  const params = new URLSearchParams({
    authkey: cfg.authkey,
    mobile,
    otp,
    channel: cfg.channel || 'sms',
    country: cfg.country || '91',
  });
  if (cfg.templateId) params.set('template_id', cfg.templateId);
  if (cfg.templateName) params.set('template_name', cfg.templateName);
  if (cfg.projectRefId) params.set('project_ref_id', cfg.projectRefId);

  try {
    const res = await fetch(`${ENDPOINT}?${params.toString()}`, { method: 'GET' });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.status !== 'success') {
      // eslint-disable-next-line no-console
      console.warn('[otp] provider rejected send:', body.message || res.status);
      return { ok: false, error: body.message || `HTTP ${res.status}` };
    }
    return { ok: true, requestId: body.data?.request_id };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[otp] send failed:', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = { sendOtpSms };
