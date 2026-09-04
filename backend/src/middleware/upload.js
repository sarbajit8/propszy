const multer = require('multer');
const { env } = require('../config/env');
const { ApiError } = require('../utils/ApiError');

const IMAGE = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const VIDEO = ['video/mp4', 'video/webm', 'video/quicktime'];
const DOC = ['application/pdf'];

const groups = {
  image: IMAGE,
  media: [...IMAGE, ...VIDEO],
  doc: DOC,
  any: [...IMAGE, ...VIDEO, ...DOC],
};

// memoryStorage — the storage service decides where bytes finally land.
function uploader(group = 'media') {
  const allowed = groups[group] || groups.media;
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: env.storage.maxUploadMb * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (allowed.includes(file.mimetype)) return cb(null, true);
      cb(ApiError.badRequest(`Unsupported file type: ${file.mimetype}`));
    },
  });
}

module.exports = { uploader };
