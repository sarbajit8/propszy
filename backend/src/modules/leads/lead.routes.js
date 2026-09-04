const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const { optionalAuth, authenticate, authorize } = require('../../middleware/auth');
const ctrl = require('./lead.controller');

const router = Router();

// Public / any authenticated actor can submit an enquiry
router.post(
  '/',
  rateLimit({ windowMs: 10 * 60_000, max: 20 }),
  optionalAuth,
  ctrl.createLead
);

// Everything below needs a session
router.use(authenticate);

router.get('/', ctrl.listLeads);          // scoped by role inside the service
router.get('/:id', ctrl.getLead);
router.post('/:id/notes', ctrl.addNote);

// Staff-only pipeline controls
router.patch('/:id/status', authorize('ADMIN', 'SUBADMIN'), ctrl.updateStatus);
router.patch('/:id/assign', authorize('ADMIN', 'SUBADMIN'), ctrl.assignLead);
router.post('/:id/follow-ups', authorize('ADMIN', 'SUBADMIN', 'AGENT'), ctrl.addFollowUp);

module.exports = router;
