const { prisma } = require('../config/prisma');

// Fire-and-forget activity logging. Never throws into the request path.
function logActivity(req, { action, entityType, entityId, metadata }) {
  const data = {
    action,
    entityType: entityType || null,
    entityId: entityId ? String(entityId) : null,
    metadata: metadata || undefined,
    userId: req?.user?.id || null,
    sessionId: req?.headers?.['x-session-id'] || null,
    ip: req?.ip || null,
    userAgent: req?.headers?.['user-agent'] || null,
  };
  prisma.activityLog.create({ data }).catch((e) => {
    // eslint-disable-next-line no-console
    console.warn('[activity] failed:', e.message);
  });
}

module.exports = { logActivity };
