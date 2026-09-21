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
const { sendOtpSms } = require('../../services/otpProvider');
const { notify } = require('../../services/notify');

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

async function requestOtp(phone) {
  const oneMinAgo = new Date(Date.now() - 60 * 1000);
  const recent = await prisma.otpCode.count({
    where: { target: phone, channel: 'sms', createdAt: { gt: oneMinAgo } },
  });
  if (recent >= 3) throw ApiError.badRequest('Too many OTP requests — please wait a minute and try again');

  const otp = String(crypto.randomInt(100000, 1000000));
  const user = await prisma.user.findUnique({ where: { phone } });
  // customer OTP sign-in/sign-up is a separate account space from staff/agent
  // accounts — never let it reach into an existing ADMIN/SUBADMIN/AGENT account
  if (user && user.role !== 'CUSTOMER') {
    throw ApiError.badRequest('This number belongs to a staff/agent account — please use the staff sign-in page.');
  }
  await prisma.otpCode.create({
    data: {
      userId: user?.id || null,
      channel: 'sms',
      target: phone,
      codeHash: sha256(otp),
      purpose: user ? 'LOGIN' : 'REGISTER',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    },
  });

  const sent = await sendOtpSms(phone, otp);
  if (!sent.ok && !sent.skipped) throw ApiError.badRequest('Could not send OTP right now — please try again shortly');
  return { sent: true, isNewUser: !user };
}

async function verifyOtp({ phone, otp, name, email, referralCode, leadId }, ctx) {
  const record = await prisma.otpCode.findFirst({
    where: {
      target: phone,
      channel: 'sms',
      purpose: { in: ['LOGIN', 'REGISTER'] },
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (!record) throw ApiError.badRequest('Code has expired — please request a new one');
  if (record.attempts >= 5) throw ApiError.badRequest('Too many attempts — please request a new code');

  if (record.codeHash !== sha256(otp)) {
    await prisma.otpCode.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
    throw ApiError.badRequest('Incorrect code');
  }

  let user = await prisma.user.findUnique({ where: { phone } });
  // same guard as requestOtp — never let this flow sign someone into a staff/agent account
  if (user && user.role !== 'CUSTOMER') {
    throw ApiError.badRequest('This number belongs to a staff/agent account — please use the staff sign-in page.');
  }
  // check this before burning the code, so a first-time signup that forgot
  // their name can just fill it in and resubmit without needing a fresh OTP
  if (!user && !name?.trim()) throw ApiError.badRequest('Please enter your name');

  await prisma.otpCode.update({ where: { id: record.id }, data: { consumedAt: new Date() } });

  if (!user) {
    let sponsorAgentId = null;
    if (referralCode) {
      const sponsor = await prisma.user.findUnique({ where: { referralCode } });
      if (sponsor && (sponsor.role === 'AGENT' || sponsor.role === 'ADMIN')) sponsorAgentId = sponsor.id;
    }

    let finalEmail = `${phone.replace(/\D/g, '')}@phone.propszy.local`;
    if (email) {
      const emailTaken = await prisma.user.findUnique({ where: { email } });
      if (emailTaken) throw ApiError.conflict('That email is already registered');
      finalEmail = email;
    }

    user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: finalEmail,
        phone,
        role: 'CUSTOMER',
        phoneVerified: true,
        emailVerified: false,
        sponsorAgentId,
      },
    });
  } else if (!user.phoneVerified) {
    user = await prisma.user.update({ where: { id: user.id }, data: { phoneVerified: true } });
  }
  if (!user.isActive) throw ApiError.forbidden('Account disabled');

  // link a pre-OTP enquiry to the now-verified account, same phone only
  if (leadId) {
    const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true, guestPhone: true } });
    if (lead && lead.guestPhone === phone) {
      await prisma.lead.update({ where: { id: leadId }, data: { userId: user.id, guestPhoneVerified: true } });
    }
  }

  return issueSession(user, ctx);
}

// Agent OTP is its own space, separate from both the customer OTP flow and the
// password-only admin console: a phone already on a CUSTOMER account must sign
// in from the main site (and use "Become an agent" there to upgrade) rather than
// re-registering here, and a phone on an ADMIN/SUBADMIN account belongs on the
// separate admin sign-in page — agents are mobile-OTP-only, admins are
// password-only, by design.
function assertAgentPhone(user) {
  if (!user) return;
  if (user.role === 'CUSTOMER') {
    throw ApiError.badRequest('This number belongs to a customer account — please sign in from the main site.');
  }
  if (user.role === 'ADMIN' || user.role === 'SUBADMIN') {
    throw ApiError.badRequest('This number belongs to an admin account — please use the admin sign-in page.');
  }
}

async function requestStaffOtp(phone) {
  const oneMinAgo = new Date(Date.now() - 60 * 1000);
  const recent = await prisma.otpCode.count({
    where: { target: phone, channel: 'sms', createdAt: { gt: oneMinAgo } },
  });
  if (recent >= 3) throw ApiError.badRequest('Too many OTP requests — please wait a minute and try again');

  const otp = String(crypto.randomInt(100000, 1000000));
  const user = await prisma.user.findUnique({ where: { phone } });
  assertAgentPhone(user);
  await prisma.otpCode.create({
    data: {
      userId: user?.id || null,
      channel: 'sms',
      target: phone,
      codeHash: sha256(otp),
      purpose: user ? 'LOGIN' : 'REGISTER',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    },
  });

  const sent = await sendOtpSms(phone, otp);
  if (!sent.ok && !sent.skipped) throw ApiError.badRequest('Could not send OTP right now — please try again shortly');
  return { sent: true, isNewUser: !user };
}

async function verifyStaffOtp({ phone, otp, name, email, referralCode }, ctx) {
  const record = await prisma.otpCode.findFirst({
    where: {
      target: phone,
      channel: 'sms',
      purpose: { in: ['LOGIN', 'REGISTER'] },
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (!record) throw ApiError.badRequest('Code has expired — please request a new one');
  if (record.attempts >= 5) throw ApiError.badRequest('Too many attempts — please request a new code');

  if (record.codeHash !== sha256(otp)) {
    await prisma.otpCode.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
    throw ApiError.badRequest('Incorrect code');
  }

  let user = await prisma.user.findUnique({ where: { phone } });
  assertAgentPhone(user);
  // check this before burning the code, so a first-time signup that forgot
  // their name can just fill it in and resubmit without needing a fresh OTP
  if (!user && !name?.trim()) throw ApiError.badRequest('Please enter your name');

  await prisma.otpCode.update({ where: { id: record.id }, data: { consumedAt: new Date() } });

  if (!user) {
    let sponsorAgentId = null;
    if (referralCode) {
      const sponsor = await prisma.user.findUnique({ where: { referralCode } });
      if (sponsor && (sponsor.role === 'AGENT' || sponsor.role === 'ADMIN')) sponsorAgentId = sponsor.id;
    }

    // email is optional for agent sign-up via OTP — fall back to a synthetic,
    // phone-derived address (same pattern as the customer OTP flow)
    let finalEmail = `${phone.replace(/\D/g, '')}@phone.propszy.local`;
    if (email) {
      const emailTaken = await prisma.user.findUnique({ where: { email } });
      if (emailTaken) throw ApiError.conflict('That email is already registered');
      finalEmail = email;
    }

    user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: finalEmail,
        phone,
        role: 'AGENT',
        kycStatus: 'NOT_SUBMITTED',
        referralCode: await uniqueReferralCode(),
        phoneVerified: true,
        emailVerified: false,
        sponsorAgentId,
      },
    });

    const admins = await prisma.user.findMany({ where: { role: { in: ['ADMIN', 'SUBADMIN'] } }, select: { id: true } });
    admins.forEach((a) =>
      notify(a.id, {
        type: 'agent.apply',
        title: 'New agent application',
        body: `${user.name} registered as an agent via mobile OTP.`,
        email: false,
      }).catch(() => {})
    );
  } else if (!user.phoneVerified) {
    user = await prisma.user.update({ where: { id: user.id }, data: { phoneVerified: true } });
  }
  if (!user.isActive) throw ApiError.forbidden('Account disabled');

  return issueSession(user, ctx);
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  requestPasswordReset,
  resetPassword,
  requestOtp,
  verifyOtp,
  requestStaffOtp,
  verifyStaffOtp,
  issueSession,
  publicUser,
  uniqueReferralCode,
};
