const { prisma } = require('../config/prisma');
const { sendMail } = require('./mailer');

// Central place to fan a domain event out to in-app + email (+ SMS later).
async function notify(userId, { type, title, body, data, email }) {
  const notification = await prisma.notification.create({
    data: { userId, type, title, body: body || null, data: data || undefined },
  });

  if (email !== false) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    if (user?.email) {
      sendMail({
        to: user.email,
        subject: title,
        html: `<p>Hi ${user.name || ''},</p><p>${body || title}</p>`,
        text: body || title,
      });
    }
  }

  return notification;
}

module.exports = { notify };
