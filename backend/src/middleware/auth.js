const { prisma } = require('../config/prisma');
const { ApiError } = require('../utils/ApiError');
const { verifyAccessToken } = require('../utils/tokens');
const { asyncHandler } = require('../utils/http');

function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  if (req.cookies?.accessToken) return req.cookies.accessToken;
  return null;
}

// Attaches req.user when a valid token is present; 401 otherwise.
const authenticate = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) throw ApiError.unauthorized('Authentication required');

  const payload = verifyAccessToken(token);
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true, role: true, name: true, email: true, phone: true,
      isActive: true, kycStatus: true, permissions: true,
      referralCode: true, sponsorAgentId: true,
    },
  });
  if (!user || !user.isActive) throw ApiError.unauthorized('Account not found or disabled');

  req.user = user;
  next();
});

// Like authenticate, but continues as guest when no/invalid token.
const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, name: true, email: true, isActive: true, permissions: true },
    });
    if (user?.isActive) req.user = user;
  } catch {
    /* ignore — treat as guest */
  }
  next();
});

// Role gate. Usage: authorize('ADMIN', 'SUBADMIN')
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (roles.length && !roles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have access to this resource'));
    }
    next();
  };
}

// Fine-grained permission gate for SUBADMIN; ADMIN always passes.
function requirePermission(permKey) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (req.user.role === 'ADMIN') return next();
    const perms = Array.isArray(req.user.permissions) ? req.user.permissions : [];
    if (req.user.role === 'SUBADMIN' && perms.includes(permKey)) return next();
    return next(ApiError.forbidden(`Missing permission: ${permKey}`));
  };
}

module.exports = { authenticate, optionalAuth, authorize, requirePermission };
