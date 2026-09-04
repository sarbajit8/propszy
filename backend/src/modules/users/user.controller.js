const { z } = require('zod');
const { prisma } = require('../../config/prisma');
const { asyncHandler, ok, parsePagination, pageMeta } = require('../../utils/http');
const { ApiError } = require('../../utils/ApiError');
const { hashPassword, verifyPassword } = require('../../utils/tokens');
const { publicUser } = require('../auth/auth.service');

const profileSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  phone: z.string().min(7).max(20).optional(),
  avatarUrl: z.string().url().optional(),
});

const updateProfile = asyncHandler(async (req, res) => {
  const data = profileSchema.parse(req.body);
  const user = await prisma.user.update({ where: { id: req.user.id }, data });
  return ok(res, { user: publicUser(user) });
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

module.exports = { updateProfile, changePassword, listUsers, getUser, adminUpdateUser };
