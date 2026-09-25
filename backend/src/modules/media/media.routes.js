const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const { uploader } = require('../../middleware/upload');
const ctrl = require('./media.controller');

const router = Router();

// Staff manage any media; a signed-in customer can manage media on their own
// standalone property only (ownership enforced in the controller).
router.use(authenticate);

router.post('/upload', uploader('any').array('files', 20), ctrl.upload);
router.post('/image', uploader('image').single('file'), ctrl.uploadSingle);
router.post('/video', uploader('video').single('file'), ctrl.uploadSingle);
router.patch('/reorder', ctrl.reorder);
router.patch('/:id', ctrl.updateMedia);
router.delete('/:id', ctrl.deleteMedia);

module.exports = router;
