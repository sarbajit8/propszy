const { prisma } = require('../config/prisma');
const { env } = require('../config/env');
const { hashPassword } = require('../utils/tokens');

const LEAD_STATUSES = [
  { key: 'NEW', label: 'New', color: '#8b5cf6', sortOrder: 0 },
  { key: 'CONTACTED', label: 'Contacted', color: '#6366f1', sortOrder: 1 },
  { key: 'SITE_VISIT', label: 'Site Visit', color: '#0ea5e9', sortOrder: 2 },
  { key: 'NEGOTIATION', label: 'Negotiation', color: '#f59e0b', sortOrder: 3 },
  { key: 'CONVERTED', label: 'Converted', color: '#16a34a', sortOrder: 4, isConversion: true, isTerminal: true },
  { key: 'DROPPED', label: 'Dropped', color: '#ef4444', sortOrder: 5, isTerminal: true },
];

const MLM_LEVELS = [
  { level: 1, rateType: 'PERCENT', rateValue: 5.0, label: 'Sourcing agent' },
  { level: 2, rateType: 'PERCENT', rateValue: 2.0, label: 'Sponsor' },
  { level: 3, rateType: 'PERCENT', rateValue: 1.0, label: 'Level 3 upline' },
  { level: 4, rateType: 'PERCENT', rateValue: 0.5, label: 'Level 4 upline' },
  { level: 5, rateType: 'PERCENT', rateValue: 0.25, label: 'Level 5 upline' },
];

/**
 * Ensures the default admin account and essential lookup tables exist
 * automatically upon server connection, especially on fresh AWS deployments.
 */
async function autoBootstrap() {
  try {
    const adminEmail = (env.seed.adminEmail || 'admin@propszy.com').trim().toLowerCase();
    const adminPassword = env.seed.adminPassword || 'Admin@12345';
    const adminName = env.seed.adminName || 'Propszy Admin';

    // 1. Ensure admin account exists
    let existingSeedAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

    // If adminEmail doesn't exist yet, check for legacy 'admin@propszy.test' and update it to the official propszy.com address
    if (!existingSeedAdmin) {
      const legacyAdmin = await prisma.user.findUnique({ where: { email: 'admin@propszy.test' } });
      if (legacyAdmin) {
        existingSeedAdmin = await prisma.user.update({
          where: { id: legacyAdmin.id },
          data: { email: adminEmail, emailVerified: true },
        });
        // eslint-disable-next-line no-console
        console.log(`[bootstrap] Migrated admin email to: ${adminEmail}`);
      }
    }

    // Also migrate legacy test demo agent emails if present
    const legacyAgent = await prisma.user.findUnique({ where: { email: 'agent@propszy.test' } });
    if (legacyAgent) {
      const hasAgentCom = await prisma.user.findUnique({ where: { email: 'agent@propszy.com' } });
      if (!hasAgentCom) {
        await prisma.user.update({ where: { id: legacyAgent.id }, data: { email: 'agent@propszy.com' } });
      }
    }
    const legacySubAgent = await prisma.user.findUnique({ where: { email: 'subagent@propszy.test' } });
    if (legacySubAgent) {
      const hasSubAgentCom = await prisma.user.findUnique({ where: { email: 'subagent@propszy.com' } });
      if (!hasSubAgentCom) {
        await prisma.user.update({ where: { id: legacySubAgent.id }, data: { email: 'subagent@propszy.com' } });
      }
    }

    if (!existingSeedAdmin) {
      // If no admin with seed email exists, check if another admin account was configured in the UI
      const anyAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
      if (!anyAdmin) {
        const passwordHash = await hashPassword(adminPassword);
        await prisma.user.create({
          data: {
            email: adminEmail,
            name: adminName,
            role: 'ADMIN',
            passwordHash,
            emailVerified: true,
            isActive: true,
          },
        });
        // eslint-disable-next-line no-console
        console.log(`[bootstrap] Default admin ready: ${adminEmail}`);
      }
    } else if (!existingSeedAdmin.passwordHash) {
      const passwordHash = await hashPassword(adminPassword);
      await prisma.user.update({
        where: { id: existingSeedAdmin.id },
        data: { passwordHash, isActive: true },
      });
      // eslint-disable-next-line no-console
      console.log(`[bootstrap] Initialized password for admin: ${adminEmail}`);
    }

    // 2. Ensure default lead statuses exist if table is empty
    const statusCount = await prisma.leadStatusConfig.count();
    if (statusCount === 0) {
      for (const s of LEAD_STATUSES) {
        await prisma.leadStatusConfig.upsert({ where: { key: s.key }, update: s, create: s });
      }
      // eslint-disable-next-line no-console
      console.log(`[bootstrap] Initialized ${LEAD_STATUSES.length} lead statuses`);
    }

    // 3. Ensure 5 MLM levels exist if table has fewer than 5
    const mlmCount = await prisma.mlmLevelConfig.count();
    if (mlmCount < 5) {
      for (const l of MLM_LEVELS) {
        await prisma.mlmLevelConfig.upsert({ where: { level: l.level }, update: l, create: l });
      }
      // eslint-disable-next-line no-console
      console.log(`[bootstrap] Initialized 5 MLM levels`);
    }
  } catch (err) {
    // Non-fatal warning if tables are still running migrations
    // eslint-disable-next-line no-console
    console.warn('[bootstrap] Notice:', err.message);
  }
}

module.exports = { autoBootstrap };
