const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { env } = require('../config/env');

const hashPassword = (plain) => bcrypt.hash(plain, 10);
const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash || '');

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, name: user.name },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessTtl }
  );
}

function signRefreshToken(user) {
  const jti = crypto.randomUUID();
  const token = jwt.sign({ sub: user.id, jti }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshTtl,
  });
  return { token, jti };
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.accessSecret);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwt.refreshSecret);
}

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

// approximate ms from a jwt-style ttl string ("15m", "30d", "3600")
function ttlToMs(ttl) {
  const m = /^(\d+)\s*([smhd])?$/.exec(String(ttl).trim());
  if (!m) return 0;
  const n = parseInt(m[1], 10);
  const unit = m[2] || 's';
  return n * { s: 1e3, m: 6e4, h: 36e5, d: 864e5 }[unit];
}

module.exports = {
  hashPassword,
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  sha256,
  ttlToMs,
};
