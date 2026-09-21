const { Router } = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const ctrl = require('./user.controller');

const router = Router();

router.use(authenticate);

// self-service
router.patch('/me', ctrl.updateProfile);
router.post('/me/change-password', ctrl.changePassword);

// admin
router.get('/', authorize('ADMIN', 'SUBADMIN'), ctrl.listUsers);
router.get('/:id', authorize('ADMIN', 'SUBADMIN'), ctrl.getUser);
router.patch('/:id', authorize('ADMIN'), ctrl.adminUpdateUser);
router.delete('/:id', authorize('ADMIN'), ctrl.deleteUser);

module.exports = router;
