const { prisma } = require('../../config/prisma');
const { env } = require('../../config/env');

// Shown in place of a stored secret on read. On write, a secret field whose
// value still "looks like" a mask (bullets / asterisks / blank / a mangled
// sentinel) is ignored so the real value is preserved.
const SECRET_MASK = '••••••••';

function isPlaceholderSecret(v) {
  if (v === undefined || v === null) return true;
  const s = String(v).trim();
  return s === '' || /^[*•∙·�]+$/.test(s);
}

/**
 * Registry of admin-editable setting groups.
 *  - fields:  shape + defaults
 *  - secrets: field names to mask when reading, keep-on-save when equal to mask
 *  - env:     fallback values from process.env / .env (used until an admin saves)
 */
const GROUPS = {
  'integrations.googleMaps': {
    label: 'Google Maps & Location Defaults',
    fields: {
      apiKey: '',
      defaultCity: '',
      defaultState: '',
      defaultLat: 20.5937,
      defaultLng: 78.9629,
      defaultZoom: 5,
    },
    secrets: [], // Maps JS keys are always client-visible (restrict by HTTP referrer)
    env: () => ({ apiKey: process.env.GOOGLE_MAPS_API_KEY || '' }),
  },
  'integrations.smtp': {
    label: 'Email (SMTP)',
    fields: { host: '', port: 587, secure: false, user: '', pass: '', from: '' },
    secrets: ['pass'],
    env: () => ({
      host: env.mail.host,
      port: env.mail.port,
      secure: env.mail.secure,
      user: env.mail.user || '',
      pass: env.mail.pass || '',
      from: env.mail.from,
    }),
  },
  'integrations.sms': {
    label: 'SMS / WhatsApp',
    fields: { provider: '', apiKey: '', senderId: '', whatsappApiUrl: '', enabled: false },
    secrets: ['apiKey'],
    env: () => ({
      provider: env.sms.provider || '',
      apiKey: env.sms.apiKey || '',
      senderId: '',
      whatsappApiUrl: env.sms.whatsappApiUrl || '',
      enabled: false,
    }),
  },
  'integrations.otp': {
    label: 'Mobile OTP (apitxt.com)',
    fields: {
      authkey: '', channel: 'sms', templateId: '', templateName: '', projectRefId: '', country: '91', enabled: false,
    },
    secrets: ['authkey'],
    env: () => ({}),
  },
  'integrations.storage': {
    label: 'Media storage',
    fields: { driver: 'local', s3Bucket: '', s3Region: '', s3AccessKeyId: '', s3SecretAccessKey: '', cloudinaryUrl: '' },
    secrets: ['s3SecretAccessKey', 'cloudinaryUrl'],
    env: () => ({
      driver: env.storage.driver,
      s3Bucket: env.storage.s3.bucket || '',
      s3Region: env.storage.s3.region || '',
      s3AccessKeyId: env.storage.s3.accessKeyId || '',
      s3SecretAccessKey: env.storage.s3.secretAccessKey || '',
      cloudinaryUrl: env.storage.cloudinaryUrl || '',
    }),
  },
  analytics: {
    label: 'Analytics',
    fields: { gaId: '' },
    secrets: [],
    env: () => ({ gaId: process.env.GA_ID || '' }),
  },
  branding: {
    label: 'Branding',
    fields: { companyName: 'Propszy', logoUrl: '', supportEmail: '', supportPhone: '', primaryColor: '#7c3aed' },
    secrets: [],
    env: () => ({}),
  },
  'pages.customerAuth': {
    label: 'Customer sign-in page',
    fields: {
      heroImage: '', badge: 'Trusted Real Estate Platform',
      heading1: 'Better Homes', heading2: 'Brighter Futures',
      blurb: "Discover, buy or rent your dream property with ease — simple, transparent and stress-free.",
      cardTitle: 'Find Your Dream Home', cardSubtitle: 'Apartments · Villas · Plots · Commercial',
    },
    secrets: [],
    env: () => ({}),
  },
  'pages.agentAuth': {
    label: 'Associate registration page',
    fields: {
      heroImage: '', badge: 'Partner Programme',
      heading1: 'Earn as a', heading2: 'Propszy Associate.',
      blurb: 'Refer buyers, build a downline and earn level-wise commission on every conversion — with a transparent ledger and one-time KYC.',
      cardTitle: 'Every sale, rewarded', cardSubtitle: 'Track pending & paid commission live',
    },
    secrets: [],
    env: () => ({}),
  },
};

// Effective (unmasked) value for one group: defaults <- env <- stored overrides.
async function getRaw(key) {
  const def = GROUPS[key];
  if (!def) return null;
  const row = await prisma.setting.findUnique({ where: { key } });
  return { ...def.fields, ...def.env(), ...(row?.value || {}) };
}

async function getAllRaw() {
  const out = {};
  for (const key of Object.keys(GROUPS)) out[key] = await getRaw(key);
  return out;
}

function mask(key, value) {
  const def = GROUPS[key];
  const out = { ...value };
  for (const s of def.secrets) if (out[s]) out[s] = SECRET_MASK;
  return out;
}

// Admin view: every group, secrets masked, plus metadata for rendering.
async function getAllMasked() {
  const raw = await getAllRaw();
  const groups = {};
  for (const [k, v] of Object.entries(raw)) {
    groups[k] = { label: GROUPS[k].label, secrets: GROUPS[k].secrets, values: mask(k, v) };
  }
  return groups;
}

async function updateSettings(patch) {
  for (const [key, incoming] of Object.entries(patch || {})) {
    const def = GROUPS[key];
    if (!def || typeof incoming !== 'object') continue;

    const current = await getRaw(key);
    const merged = { ...current };
    for (const [field, val] of Object.entries(incoming)) {
      if (!(field in def.fields)) continue;
      if (def.secrets.includes(field) && isPlaceholderSecret(val)) continue;
      merged[field] = val;
    }
    await prisma.setting.upsert({
      where: { key },
      update: { value: merged },
      create: { key, value: merged },
    });
  }
  return getAllMasked();
}

// Non-secret config the public frontend needs at runtime.
async function getPublicConfig() {
  const [maps, analytics, branding, customerAuth, agentAuth] = await Promise.all([
    getRaw('integrations.googleMaps'),
    getRaw('analytics'),
    getRaw('branding'),
    getRaw('pages.customerAuth'),
    getRaw('pages.agentAuth'),
  ]);
  return {
    googleMapsApiKey: maps.apiKey || '',
    defaultCity: maps.defaultCity || '',
    defaultState: maps.defaultState || '',
    defaultLat: maps.defaultLat != null && maps.defaultLat !== '' ? Number(maps.defaultLat) : 20.5937,
    defaultLng: maps.defaultLng != null && maps.defaultLng !== '' ? Number(maps.defaultLng) : 78.9629,
    defaultZoom: maps.defaultZoom != null && maps.defaultZoom !== '' ? Number(maps.defaultZoom) : 5,
    gaId: analytics.gaId || '',
    companyName: branding.companyName || 'Propszy',
    logoUrl: branding.logoUrl || '',
    primaryColor: branding.primaryColor || '#7c3aed',
    supportEmail: branding.supportEmail || '',
    supportPhone: branding.supportPhone || '',
    customerAuth,
    agentAuth,
  };
}

module.exports = { getRaw, getAllMasked, updateSettings, getPublicConfig, SECRET_MASK, GROUPS };
