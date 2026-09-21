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

const app = express();

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5050',
  'http://127.0.0.1:5050',
  ...(Array.isArray(env.clientOrigin) ? env.clientOrigin : [env.clientOrigin]),
];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      const isLocal = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      if (isLocal || allowedOrigins.includes(origin) || !env.isProd) {
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

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = { app };
