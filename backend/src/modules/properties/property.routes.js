const { Router } = require('express');
const { optionalAuth, authenticate, authorize } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const ctrl = require('./property.controller');
const v = require('./property.validation');

const router = Router();

router.get('/', optionalAuth, validate(v.listQuerySchema), ctrl.listProperties);
router.get('/:id', optionalAuth, ctrl.getProperty);

router.post('/', authenticate, authorize('ADMIN', 'SUBADMIN'), validate(v.createSchema), ctrl.createProperty);
router.patch('/:id', authenticate, authorize('ADMIN', 'SUBADMIN'), validate(v.updateSchema), ctrl.updateProperty);
router.delete('/:id', authenticate, authorize('ADMIN'), ctrl.deleteProperty);

module.exports = router;
