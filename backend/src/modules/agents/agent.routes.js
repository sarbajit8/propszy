const { Router } = require('express');
const { authenticate, authorize, requireApprovedKyc } = require('../../middleware/auth');
const ctrl = require('./agent.controller');

const router = Router();
router.use(authenticate);

// self-service
router.post('/apply', ctrl.applyAsAgent);
router.post('/recruit', authorize('AGENT', 'ADMIN'), ctrl.recruitSubAgent);
router.get('/me', authorize('AGENT', 'ADMIN'), ctrl.myAgentProfile);
router.get('/me/tree', authorize('AGENT', 'ADMIN'), requireApprovedKyc, ctrl.myTree);
router.get('/me/downline-leads', authorize('AGENT', 'ADMIN'), requireApprovedKyc, ctrl.downlineLeads);
router.get('/downline/:id/sales', authorize('AGENT', 'ADMIN', 'SUBADMIN'), ctrl.downlineAgentSales);

// admin
router.get('/', authorize('ADMIN', 'SUBADMIN'), ctrl.listAgents);
router.get('/:id/tree', authorize('ADMIN', 'SUBADMIN'), ctrl.agentTree);

module.exports = router;
