const { Prisma } = require('@prisma/client');
const { ApiError } = require('../utils/ApiError');
const { env } = require('../config/env');

// Turn a raw field key into words a person can read.
const FIELD_LABELS = {
  reraNo: 'RERA number', priceMin: 'minimum price', priceMax: 'maximum price',
  lat: 'latitude', lng: 'longitude', metaTitle: 'meta title', metaDescription: 'meta description',
  coverImageUrl: 'cover image', brochureUrl: 'brochure link', virtualTourUrl: 'virtual tour link',
  featuredVideoUrl: 'featured video link', developerId: 'developer', categoryId: 'category',
  commissionBaseValue: 'commission value', emailOrPhone: 'email or phone', unitType: 'unit type',
  carpetArea: 'carpet area', builtUpArea: 'built-up area', amenityIds: 'amenities',
  foundedYear: 'year established', totalProjects: 'total projects', logoUrl: 'logo',
};
function labelFor(path = []) {
  const key = [...path].reverse().find((p) => typeof p === 'string');
  if (!key) return 'A field';
  return FIELD_LABELS[key] || key.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').replace(/^./, (c) => c.toUpperCase()).trim();
}
function humanizeZodIssue(issue) {
  const label = labelFor(issue.path || []);
  const cap = label.charAt(0).toUpperCase() + label.slice(1);
  const m = String(issue.message || '');
  if (issue.code === 'invalid_type' && /received undefined|Required/i.test(m)) return `${cap} is required.`;
  if (issue.code === 'invalid_type') return `Please enter a valid ${label}.`;
  if (/required/i.test(m)) return `${cap} is required.`;
  if (/invalid url|must be a valid url/i.test(m)) return `${cap} must be a valid link starting with http.`;
  if (/invalid email/i.test(m)) return 'Please enter a valid email address.';
  if (/at least|too small|greater than|min/i.test(m)) return `${cap} is too short or too small.`;
  if (/at most|too big|less than|max/i.test(m)) return `${cap} is too long or too large.`;
  if (/expected|invalid/i.test(m)) return `Please enter a valid ${label}.`;
  return `Please check the ${label} field.`;
}

// 404 for unmatched routes
function notFoundHandler(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details;

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      statusCode = 409;
      message = 'That already exists — please use a different value.';
    } else if (err.code === 'P2025') {
      statusCode = 404;
      message = 'We couldn’t find that item — it may have been removed.';
    } else if (err.code === 'P2003') {
      statusCode = 400;
      message = 'One of the linked items no longer exists. Please refresh and try again.';
    } else {
      statusCode = 400;
      message = 'We couldn’t save that. Please check your entries and try again.';
      details = env.isProd ? undefined : err.message;
    }
  }

  if (err?.name === 'ZodError') {
    statusCode = 422;
    const issues = err.errors || err.issues || [];
    details = issues.map((e) => ({ path: (e.path || []).join('.'), message: e.message }));
    message = issues.length ? humanizeZodIssue(issues[0]) : 'Please check the highlighted fields and try again.';
    if (issues.length > 1) message += ` (and ${issues.length - 1} more field${issues.length - 1 === 1 ? '' : 's'})`;
  }

  if (err?.name === 'JsonWebTokenError' || err?.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Your session has expired. Please sign in again.';
  }

  if (err?.name === 'MulterError') {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      statusCode = 413;
      message = 'File is too large. Maximum allowed size is 150MB.';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = `Unexpected upload field: ${err.field || 'file'}`;
    } else {
      message = err.message || 'File upload failed';
    }
  }

  if (statusCode >= 500) {
    // eslint-disable-next-line no-console
    console.error(err);
    if (!(err instanceof ApiError)) message = 'Something went wrong on our side. Please try again in a moment.';
  }

  res.status(statusCode).json({
    success: false,
    error: { message, details, code: err.code },
  });
}

module.exports = { notFoundHandler, errorHandler };
