const { Prisma } = require('@prisma/client');
const { ApiError } = require('../utils/ApiError');
const { env } = require('../config/env');

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
      message = `Duplicate value for ${err.meta?.target}`;
    } else if (err.code === 'P2025') {
      statusCode = 404;
      message = 'Record not found';
    } else {
      statusCode = 400;
      message = 'Database request error';
      details = env.isProd ? undefined : err.message;
    }
  }

  if (err?.name === 'ZodError') {
    statusCode = 422;
    const issues = err.errors || err.issues || [];
    details = issues.map((e) => ({ path: (e.path || []).join('.'), message: e.message }));
    // surface the first human-readable issue as the main message
    const first = issues[0];
    message = first
      ? (first.path?.length ? `${first.path.join('.')}: ${first.message}` : first.message)
      : 'Validation failed';
  }

  if (err?.name === 'JsonWebTokenError' || err?.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Invalid or expired token';
  }

  if (statusCode >= 500) {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    error: { message, details, code: err.code },
  });
}

module.exports = { notFoundHandler, errorHandler };
