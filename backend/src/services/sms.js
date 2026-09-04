const { env } = require('../config/env');

// Minimal, provider-agnostic SMS/WhatsApp sender. Config comes from the
// admin Settings screen (integrations.sms); falls back to .env.
async function smsConfig() {
  try {
    const { getRaw } = require('../modules/settings/settings.service');
    return await getRaw('integrations.sms');
  } catch {
    return { provider: env.sms.provider, apiKey: env.sms.apiKey, whatsappApiUrl: env.sms.whatsappApiUrl, enabled: false };
  }
}

async function sendSms(to, message) {
  const cfg = await smsConfig();
  if (!cfg.enabled || !cfg.provider || !cfg.apiKey) {
    // eslint-disable-next-line no-console
    console.log(`[sms:disabled] → ${to}: ${message}`);
    return { ok: false, skipped: 'not-configured' };
  }

  try {
    // Generic HTTP hook. Plug in your provider's request shape here; many
    // (MSG91, Twilio, Gupshup, Kaleyra) accept a POST with an auth header.
    const url = cfg.whatsappApiUrl || `https://api.${cfg.provider}.com/send`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({ to, from: cfg.senderId || undefined, message }),
    });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[sms] send failed:', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = { sendSms };
