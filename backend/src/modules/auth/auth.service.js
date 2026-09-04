const crypto = require('crypto');
const { customAlphabet } = require('nanoid');
const { prisma } = require('../../config/prisma');
const { ApiError } = require('../../utils/ApiError');
const {
  hashPassword,
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  sha256,
  ttlToMs,
} = require('../../utils/tokens');
const { env } = require('../../config/env');
const { sendMail } = require('../../services/mailer');

const refCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);

async function uniqueReferralCode() {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const code = refCode();
    const exists = await prisma.user.findUnique({ where: { referralCode: code } });
    if (!exists) return code;
  }
}

const publicUser = (u) => ({
  id: u.id,
  role: u.role,
  name: u.name,
  email: u.email,
  phone: u.phone,
  avatarUrl: u.avatarUrl,
  kycStatus: u.kycStatus,
  referralCode: u.referralCode,
  sponsorAgentId: u.sponsorAgentId,
  permissions: u.permissions,
  createdAt: u.createdAt,
});

async function issueSession(user, ctx = {}) {
  const accessToken = signAccessToken(user);
  const { token: refreshToken, jti } = signRefreshToken(user);
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: sha256(jti),
      userAgent: ctx.userAgent || null,
      ip: ctx.ip || null,
      expiresAt: new Date(Date.now() + ttlToMs(env.jwt.refreshTtl)),
    },
  });
  return { accessToken, refreshToken, user: publicUser(user) };
}

async function register({ name, email, phone, password, referralCode }, ctx) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, ...(phone ? [{ phone }] : [])] },
  });
  if (existing) throw ApiError.conflict('An account with that email or phone already exists');

  let sponsorAgentId = null;
  if (referralCode) {
    const sponsor = await prisma.user.findUnique({ where: { referralCode } });
    if (!sponsor || (sponsor.role !== 'AGENT' && sponsor.role !== 'ADMIN')) {
      throw ApiError.badRequest('Invalid referral code');
    }
    sponsorAgentId = sponsor.id;
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone: phone || null,
      passwordHash: await hashPassword(password),
      role: 'CUSTOMER',
      sponsorAgentId,
    },
  });

  return issueSession(user, ctx);
}

async function login({ emailOrPhone, password }, ctx) {
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: emailOrPhone }, { phone: emailOrPhone }] },
  });
  if (!user || !user.passwordHash) throw ApiError.unauthorized('Invalid credentials');
  if (!user.isActive) throw ApiError.forbidden('Account disabled');

  const good = await verifyPassword(password, user.passwordHash);
  if (!good) throw ApiError.unauthorized('Invalid credentials');

  return issueSession(user, ctx);
}

async function refresh(refreshToken, ctx) {
  if (!refreshToken) throw ApiError.unauthorized('Missing refresh token');
  const payload = verifyRefreshToken(refreshToken);
  const hash = sha256(payload.jti);

  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: hash } });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw ApiError.unauthorized('Refresh token no longer valid');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) throw ApiError.unauthorized('Account not available');

  // rotate
  await prisma.refreshToken.update({
    where: { tokenHash: hash },
    data: { revokedAt: new Date() },
  });
  return issueSession(user, ctx);
}

async function logout(refreshToken) {
  if (!refreshToken) return;
  try {
    const payload = verifyRefreshToken(refreshToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(payload.jti), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  } catch {
    /* already invalid */
  }
}

async function requestPasswordReset(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Always resolve the same way (don't leak account existence).
  if (!user) return;

  const raw = crypto.randomBytes(32).toString('hex');
  await prisma.otpCode.create({
    data: {
      userId: user.id,
      channel: 'email',
      target: email,
      codeHash: sha256(raw),
      purpose: 'RESET_PASSWORD',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  const link = `${env.clientOrigin[0]}/reset-password?token=${raw}&email=${encodeURIComponent(email)}`;
  await sendMail({
    to: email,
    subject: 'Reset your Propszy password',
    html: `<p>Click to reset your password (valid 1 hour):</p><p><a href="${link}">${link}</a></p>`,
    text: link,
  });
}

async function resetPassword({ email, token, password }) {
  const record = await prisma.otpCode.findFirst({
    where: {
      target: email,
      purpose: 'RESET_PASSWORD',
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (!record || record.codeHash !== sha256(token)) {
    throw ApiError.badRequest('Reset link is invalid or has expired');
  }
  await prisma.$transaction([
    prisma.user.update({
      where: { email },
      data: { passwordHash: await hashPassword(password) },
    }),
    prisma.otpCode.update({ where: { id: record.id }, data: { consumedAt: new Date() } }),
    prisma.refreshToken.updateMany({
      where: { user: { email }, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  requestPasswordReset,
  resetPassword,
  issueSession,
  publicUser,
  uniqueReferralCode,
};
