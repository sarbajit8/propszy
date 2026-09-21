const { z } = require('zod');
const { prisma } = require('../../config/prisma');
const { asyncHandler, ok, parsePagination, pageMeta } = require('../../utils/http');
const { ApiError } = require('../../utils/ApiError');
const { hashPassword, verifyPassword } = require('../../utils/tokens');
const { publicUser } = require('../auth/auth.service');
const { logActivity } = require('../../services/activity');

const profileSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(7).max(20).optional(),
  avatarUrl: z.string().url().optional(),
});

const updateProfile = asyncHandler(async (req, res) => {
  const data = profileSchema.parse(req.body);
  if (data.email) {
    const cleanEmail = data.email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing && existing.id !== req.user.id) {
      throw ApiError.badRequest(`Email ${cleanEmail} is already taken.`);
    }
    data.email = cleanEmail;
  }
  const user = await prisma.user.update({ where: { id: req.user.id }, data });
  return ok(res, { user: publicUser(user) });
});

const credentialsSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(2).max(120).optional(),
  currentPassword: z.string().min(1, 'Current password is required to verify changes'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').max(72).optional().or(z.literal('')),
});

const updateCredentials = asyncHandler(async (req, res) => {
  const { email, name, currentPassword, newPassword } = credentialsSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) throw ApiError.notFound('User not found');

  if (user.passwordHash && !(await verifyPassword(currentPassword, user.passwordHash))) {
    throw ApiError.badRequest('Current password is incorrect');
  }

  const updateData = {};
  if (name && name.trim()) {
    updateData.name = name.trim();
  }

  if (email && email.trim().toLowerCase() !== user.email?.toLowerCase()) {
    const cleanEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing && existing.id !== user.id) {
      throw ApiError.badRequest(`The ID/email "${cleanEmail}" is already in use by another account.`);
    }
    updateData.email = cleanEmail;
  }

  if (newPassword && newPassword.trim()) {
    updateData.passwordHash = await hashPassword(newPassword.trim());
    await prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: updateData,
  });

  logActivity(req, {
    action: 'user.credentials_updated',
    metadata: { changedEmail: !!updateData.email, changedPassword: !!updateData.passwordHash },
  });

  return ok(res, {
    user: publicUser(updatedUser),
    message: 'Admin ID & password updated successfully.',
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = z
    .object({ currentPassword: z.string(), newPassword: z.string().min(8).max(72) })
    .parse(req.body);

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (user.passwordHash && !(await verifyPassword(currentPassword, user.passwordHash))) {
    throw ApiError.badRequest('Current password is incorrect');
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });
  await prisma.refreshToken.updateMany({
    where: { userId: user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return ok(res, { message: 'Password changed. Please sign in again.' });
});

// ── Admin ────────────────────────────────────────────────
const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip, take } = parsePagination(req.query, { defaultLimit: 20 });
  const { role, q, kycStatus } = req.query;
  const where = {
    ...(role ? { role } : {}),
    ...(kycStatus ? { kycStatus } : {}),
    ...(q
      ? { OR: [{ name: { contains: q } }, { email: { contains: q } }, { phone: { contains: q } }] }
      : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: { sponsorAgent: { select: { id: true, name: true, referralCode: true } } },
    }),
    prisma.user.count({ where }),
  ]);
  return ok(res, rows.map(publicUser), pageMeta(page, limit, total));
});

const getUser = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: {
      sponsorAgent: { select: { id: true, name: true, referralCode: true } },
      bankDetail: true,
      _count: { select: { downline: true, leadsAsAgent: true, commissions: true } },
    },
  });
  if (!user) throw ApiError.notFound('User not found');
  return ok(res, { ...publicUser(user), sponsorAgent: user.sponsorAgent, bankDetail: user.bankDetail, counts: user._count });
});

const adminUpdateUser = asyncHandler(async (req, res) => {
  const data = z
    .object({
      name: z.string().min(2).optional(),
      phone: z.string().optional(),
      role: z.enum(['ADMIN', 'SUBADMIN', 'AGENT', 'CUSTOMER']).optional(),
      isActive: z.boolean().optional(),
      permissions: z.array(z.string()).optional(),
    })
    .parse(req.body);
  const user = await prisma.user.update({ where: { id: req.params.id }, data });
  return ok(res, { user: publicUser(user) });
});

// DELETE /users/:id — admin removes an associate or customer account.
// Blocked when the account has commission/payout history, so a delete can
// never silently wipe out earnings/payout records (those cascade on User);
// deactivating (PATCH isActive:false) is the safe path for those accounts.
const deleteUser = asyncHandler(async (req, res) => {
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) throw ApiError.notFound('User not found');
  if (target.id === req.user.id) throw ApiError.badRequest('You cannot delete your own account');

  if (target.role === 'ADMIN') {
    const otherAdmins = await prisma.user.count({ where: { role: 'ADMIN', id: { not: target.id } } });
    if (otherAdmins === 0) throw ApiError.badRequest('At least one admin account must remain');
  }

  const [commissionCount, payoutCount] = await Promise.all([
    prisma.commission.count({ where: { agentId: target.id } }),
    prisma.payout.count({ where: { agentId: target.id } }),
  ]);
  if (commissionCount > 0 || payoutCount > 0) {
    throw ApiError.badRequest(
      'This account has commission/payout history — deactivate it instead of deleting, to keep financial records intact'
    );
  }

  await prisma.user.delete({ where: { id: target.id } });
  logActivity(req, { action: 'user.delete', entityType: 'user', entityId: target.id, metadata: { role: target.role, email: target.email } });
  return ok(res, { deleted: true });
});

module.exports = { updateProfile, updateCredentials, changePassword, listUsers, getUser, adminUpdateUser, deleteUser };
