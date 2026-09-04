const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const { validate } = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const ctrl = require('./auth.controller');
const v = require('./auth.validation');

const router = Router();

const tight = rateLimit({ windowMs: 15 * 60_000, max: 30, standardHeaders: true, legacyHeaders: false });

router.post('/register', tight, validate(v.registerSchema), ctrl.register);
router.post('/login', tight, validate(v.loginSchema), ctrl.login);
router.post('/refresh', ctrl.refresh);
router.post('/logout', ctrl.logout);
router.get('/me', authenticate, ctrl.me);
router.post('/forgot-password', tight, validate(v.forgotSchema), ctrl.forgotPassword);
router.post('/reset-password', tight, validate(v.resetSchema), ctrl.resetPassword);

module.exports = router;
