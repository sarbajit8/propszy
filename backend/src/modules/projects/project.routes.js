const { Router } = require('express');
const { optionalAuth, authenticate, authorize } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const ctrl = require('./project.controller');
const v = require('./project.validation');

const router = Router();

// Public (staff see unpublished too via optionalAuth)
router.get('/', optionalAuth, validate(v.listQuerySchema), ctrl.listProjects);
router.get('/map', ctrl.mapView);
router.get('/:idOrSlug', optionalAuth, ctrl.getProject);

// Admin
router.post('/', authenticate, authorize('ADMIN', 'SUBADMIN'), validate(v.createSchema), ctrl.createProject);
router.patch('/:id', authenticate, authorize('ADMIN', 'SUBADMIN'), validate(v.updateSchema), ctrl.updateProject);
router.delete('/:id', authenticate, authorize('ADMIN'), ctrl.deleteProject);

module.exports = router;
