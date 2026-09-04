const { Router } = require('express');
const { z } = require('zod');
const { authenticate, authorize } = require('../../middleware/auth');
const { asyncHandler, ok } = require('../../utils/http');
const { sendMail } = require('../../services/mailer');
const svc = require('./settings.service');

const router = Router();

// Public runtime config for the frontend (Maps key, GA id, branding).
router.get(
  '/public',
  asyncHandler(async (req, res) => ok(res, await svc.getPublicConfig()))
);

// Everything else is admin-only.
router.use(authenticate, authorize('ADMIN', 'SUBADMIN'));

router.get(
  '/',
  asyncHandler(async (req, res) => ok(res, await svc.getAllMasked()))
);

router.put(
  '/',
  asyncHandler(async (req, res) => {
    const patch = z.record(z.string(), z.record(z.string(), z.any())).parse(req.body);
    return ok(res, await svc.updateSettings(patch));
  })
);

// Send a test email using the currently-saved SMTP settings.
router.post(
  '/test-email',
  asyncHandler(async (req, res) => {
    const { to } = z.object({ to: z.string().email() }).parse(req.body);
    const result = await sendMail({
      to,
      subject: 'Propszy — SMTP test',
      html: '<p>Your SMTP settings are working. 🎉</p>',
      text: 'Your SMTP settings are working.',
    });
    if (!result.ok) return res.status(502).json({ success: false, error: { message: result.error || 'Send failed' } });
    return ok(res, result);
  })
);

module.exports = router;
