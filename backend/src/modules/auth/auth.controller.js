const { asyncHandler, ok, created } = require('../../utils/http');
const { env } = require('../../config/env');
const { ttlToMs } = require('../../utils/tokens');
const svc = require('./auth.service');
const { prisma } = require('../../config/prisma');
const { logActivity } = require('../../services/activity');

const REFRESH_COOKIE = 'refreshToken';

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? 'none' : 'lax',
    maxAge: ttlToMs(env.jwt.refreshTtl),
    path: '/',
  });
}

const ctxOf = (req) => ({ ip: req.ip, userAgent: req.headers['user-agent'] });

const register = asyncHandler(async (req, res) => {
  const session = await svc.register(req.body, ctxOf(req));
  setRefreshCookie(res, session.refreshToken);
  logActivity({ ...req, user: { id: session.user.id } }, { action: 'auth.register' });
  return created(res, { user: session.user, accessToken: session.accessToken });
});

const login = asyncHandler(async (req, res) => {
  const session = await svc.login(req.body, ctxOf(req));
  setRefreshCookie(res, session.refreshToken);
  logActivity({ ...req, user: { id: session.user.id } }, { action: 'auth.login' });
  return ok(res, { user: session.user, accessToken: session.accessToken });
});

const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken;
  const session = await svc.refresh(token, ctxOf(req));
  setRefreshCookie(res, session.refreshToken);
  return ok(res, { user: session.user, accessToken: session.accessToken });
});

const logout = asyncHandler(async (req, res) => {
  await svc.logout(req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken);
  res.clearCookie(REFRESH_COOKIE, { path: '/' });
  return ok(res, { loggedOut: true });
});

const me = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  return ok(res, { user: svc.publicUser(user) });
});

const forgotPassword = asyncHandler(async (req, res) => {
  await svc.requestPasswordReset(req.body.email);
  return ok(res, { message: 'If that email exists, a reset link has been sent.' });
});

const resetPassword = asyncHandler(async (req, res) => {
  await svc.resetPassword(req.body);
  return ok(res, { message: 'Password updated. Please sign in.' });
});

module.exports = { register, login, refresh, logout, me, forgotPassword, resetPassword };
