const { Router } = require('express');
const { optionalAuth, authenticate } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const ctrl = require('./property.controller');
const v = require('./property.validation');

const router = Router();

router.get('/', optionalAuth, validate(v.listQuerySchema), ctrl.listProperties);
router.get('/:id', optionalAuth, ctrl.getProperty);

// Staff can create project-wise or standalone listings; a signed-in customer can also
// self-list a standalone property (enforced/owned in the controller), pending review.
router.post('/', authenticate, validate(v.createSchema), ctrl.createProperty);
router.patch('/:id', authenticate, validate(v.updateSchema), ctrl.updateProperty);
router.delete('/:id', authenticate, ctrl.deleteProperty);

module.exports = router;
