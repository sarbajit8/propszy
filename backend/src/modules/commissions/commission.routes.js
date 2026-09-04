const { Router } = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const ctrl = require('./commission.controller');

const router = Router();
router.use(authenticate);

router.get('/', ctrl.listCommissions);
router.get('/summary', ctrl.mySummary);
router.get('/rates', ctrl.commissionRates);
router.get('/payouts', ctrl.listPayouts);

router.patch('/:id/status', authorize('ADMIN', 'SUBADMIN'), ctrl.setStatus);
router.post('/payouts', authorize('ADMIN', 'SUBADMIN'), ctrl.createPayout);
router.patch('/payouts/:id/paid', authorize('ADMIN', 'SUBADMIN'), ctrl.markPayoutPaid);

module.exports = router;
