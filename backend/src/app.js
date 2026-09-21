const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const { env } = require('./config/env');
const { notFoundHandler, errorHandler } = require('./middleware/error');
const { uploadRoot } = require('./services/storage');
const routes = require('./routes');

const fs = require('fs');

const app = express();

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

const configuredOrigins = Array.isArray(env.clientOrigin)
  ? env.clientOrigin
  : (env.clientOrigin || '').split(',').map((s) => s.trim()).filter(Boolean);

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5050',
  'http://127.0.0.1:5050',
  'https://propszy.com',
  'https://www.propszy.com',
  'http://propszy.com',
  'http://www.propszy.com',
  ...configuredOrigins,
];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      const isLocal = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      if (isLocal || allowedOrigins.includes(origin) || !env.isProd) {
        return cb(null, true);
      }
      const cleanOrigin = origin.replace(/\/+$/, '');
      if (allowedOrigins.some((o) => o.replace(/\/+$/, '') === cleanOrigin)) {
        return cb(null, true);
      }
      return cb(null, true);
    },
    credentials: true,
  })
);
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
if (!env.isProd) app.use(morgan('dev'));

// Serve locally-stored media
app.use(
  '/uploads',
  express.static(uploadRoot, { maxAge: '7d', fallthrough: true })
);

app.use(
  env.apiPrefix,
  rateLimit({ windowMs: 60_000, max: 300, standardHeaders: true, legacyHeaders: false })
);

app.get('/health', (req, res) => res.json({ ok: true, ts: Date.now() }));
app.use(env.apiPrefix, routes);

// Optional single-tier deployment: serve built frontend directly from Express
if (env.serveFrontend) {
  const frontendDist = path.resolve(__dirname, '../../frontend/dist');
  if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist, { maxAge: '1d' }));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith(env.apiPrefix) || req.path.startsWith('/uploads') || req.path === '/health') {
        return next();
      }
      res.sendFile(path.join(frontendDist, 'index.html'));
    });
  }
}

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = { app };
