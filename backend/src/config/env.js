const dotenv = require('dotenv');
dotenv.config();

function required(key, fallback) {
  const val = process.env[key] ?? fallback;
  if (val === undefined) {
    // eslint-disable-next-line no-console
    console.warn(`[env] Missing ${key}`);
  }
  return val;
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT || '5050', 10),
  apiPrefix: process.env.API_PREFIX || '/api',
  clientOrigin: (process.env.CLIENT_ORIGIN || 'https://propszy.com,https://www.propszy.com,http://localhost:5173')
    .split(',')
    .map((s) => s.trim()),

  databaseUrl: required('DATABASE_URL'),

  cookie: {
    secure: process.env.COOKIE_SECURE !== undefined
      ? process.env.COOKIE_SECURE === 'true'
      : process.env.NODE_ENV === 'production',
    sameSite: process.env.COOKIE_SAME_SITE || (process.env.NODE_ENV === 'production' ? 'none' : 'lax'),
  },
  serveFrontend: process.env.SERVE_FRONTEND === 'true',

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET', 'dev-access-secret'),
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
    accessTtl: process.env.JWT_ACCESS_TTL || '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL || '30d',
  },

  storage: {
    driver: process.env.STORAGE_DRIVER || 'local',
    uploadDir: process.env.UPLOAD_DIR || 'uploads',
    publicBaseUrl: process.env.PUBLIC_BASE_URL || (process.env.NODE_ENV === 'production' ? 'https://propszy.com' : 'http://localhost:5050'),
    maxUploadMb: parseInt(process.env.MAX_UPLOAD_MB || '25', 10),
    s3: {
      region: process.env.AWS_REGION,
      bucket: process.env.AWS_S3_BUCKET,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    cloudinaryUrl: process.env.CLOUDINARY_URL,
  },

  mail: {
    from: process.env.MAIL_FROM || 'Propszy Real Estate <no-reply@propszy.com>',
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '1025', 10),
    user: process.env.SMTP_USER || undefined,
    pass: process.env.SMTP_PASS || undefined,
    secure: process.env.SMTP_SECURE === 'true',
  },

  sms: {
    provider: process.env.SMS_PROVIDER,
    apiKey: process.env.SMS_API_KEY,
    whatsappApiUrl: process.env.WHATSAPP_API_URL,
  },

  seed: {
    adminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@propszy.com',
    adminPassword: process.env.SEED_ADMIN_PASSWORD || 'Admin@12345',
    adminName: process.env.SEED_ADMIN_NAME || 'Propszy Admin',
  },
};

module.exports = { env };
