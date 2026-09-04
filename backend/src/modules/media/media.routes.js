const { Router } = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const { uploader } = require('../../middleware/upload');
const ctrl = require('./media.controller');

const router = Router();

router.use(authenticate, authorize('ADMIN', 'SUBADMIN'));

router.post('/upload', uploader('any').array('files', 20), ctrl.upload);
router.patch('/reorder', ctrl.reorder);
router.patch('/:id', ctrl.updateMedia);
router.delete('/:id', ctrl.deleteMedia);

module.exports = router;
