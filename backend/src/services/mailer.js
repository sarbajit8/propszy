const nodemailer = require('nodemailer');
const { env } = require('../config/env');

// Transporter is rebuilt whenever the saved SMTP config changes.
let cache = { sig: null, transporter: null };

async function resolveSmtp() {
  // lazy require avoids a load-time cycle (settings.service only needs prisma/env)
  const { getRaw } = require('../modules/settings/settings.service');
  try {
    return await getRaw('integrations.smtp');
  } catch {
    return {
      host: env.mail.host, port: env.mail.port, secure: env.mail.secure,
      user: env.mail.user, pass: env.mail.pass, from: env.mail.from,
    };
  }
}

function transporterFor(smtp) {
  const sig = JSON.stringify(smtp);
  if (cache.sig === sig && cache.transporter) return cache.transporter;
  cache = {
    sig,
    transporter: nodemailer.createTransport({
      host: smtp.host || env.mail.host,
      port: Number(smtp.port) || env.mail.port,
      secure: !!smtp.secure,
      auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
      connectionTimeout: 8000,
      greetingTimeout: 8000,
    }),
  };
  return cache.transporter;
}

async function sendMail({ to, subject, html, text, from }) {
  try {
    const smtp = await resolveSmtp();
    const info = await transporterFor(smtp).sendMail({
      from: from || smtp.from || env.mail.from,
      to,
      subject,
      text,
      html,
    });
    return { ok: true, id: info.messageId };
  } catch (err) {
    // Don't blow up business flows if mail is down.
    // eslint-disable-next-line no-console
    console.warn('[mailer] send failed:', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = { sendMail };
