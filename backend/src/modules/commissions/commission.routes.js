const { Router } = require('express');
const { authenticate, authorize, requireApprovedKyc } = require('../../middleware/auth');
const ctrl = require('./commission.controller');

const router = Router();
router.use(authenticate);

// associate/staff only — these were previously reachable (and unscoped!) by any
// authenticated role, since the controllers only special-case AGENT vs "else"
const staffOrAgent = authorize('AGENT', 'ADMIN', 'SUBADMIN');
router.get('/', staffOrAgent, requireApprovedKyc, ctrl.listCommissions);
router.get('/summary', staffOrAgent, requireApprovedKyc, ctrl.mySummary);
router.get('/rates', staffOrAgent, requireApprovedKyc, ctrl.commissionRates);
router.get('/payouts', staffOrAgent, requireApprovedKyc, ctrl.listPayouts);

router.patch('/:id/status', authorize('ADMIN', 'SUBADMIN'), ctrl.setStatus);
router.post('/payouts', authorize('ADMIN', 'SUBADMIN'), ctrl.createPayout);
router.patch('/payouts/:id/paid', authorize('ADMIN', 'SUBADMIN'), ctrl.markPayoutPaid);

module.exports = router;
