const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { env } = require('../config/env');
const { ApiError } = require('../utils/ApiError');
const { uploadRoot } = require('../services/storage');

const IMAGE = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
const VIDEO = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-matroska',
  'video/ogg',
  'video/x-msvideo',
  'video/avi',
  'video/mpeg',
  'video/3gpp',
  'video/x-m4v',
];
const DOC = ['application/pdf'];

const groups = {
  image: IMAGE,
  video: VIDEO,
  media: [...IMAGE, ...VIDEO],
  doc: DOC,
  any: [...IMAGE, ...VIDEO, ...DOC],
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const rawFolder = (req.query?.folder || req.body?.folder || 'properties').replace(/[^a-z0-9/_-]/gi, '');
    const folder = rawFolder || 'properties';
    const dir = path.join(uploadRoot, folder);
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase().slice(0, 10) || '.mp4';
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});

function uploader(group = 'media') {
  const allowed = groups[group] || groups.media;
  const isVideoOrMedia = group === 'video' || group === 'media' || group === 'any';
  const maxMb = isVideoOrMedia ? Math.max(env.storage.maxUploadMb || 25, 150) : (env.storage.maxUploadMb || 25);

  return multer({
    storage: diskStorage,
    limits: { fileSize: maxMb * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const isVideoExt = /\.(mp4|webm|mov|mkv|avi|m4v|3gp|wmv|flv|ogv)$/i.test(file.originalname || '');
      const isImageExt = /\.(jpe?g|png|webp|avif|gif)$/i.test(file.originalname || '');
      const isDocExt = /\.(pdf)$/i.test(file.originalname || '');

      const isAllowedMime = allowed.includes(file.mimetype);
      const isAllowedVideo = isVideoOrMedia && (file.mimetype.startsWith('video/') || isVideoExt);
      const isAllowedImage = (group === 'image' || isVideoOrMedia) && (file.mimetype.startsWith('image/') || isImageExt);
      const isAllowedDoc = (group === 'doc' || group === 'any') && (file.mimetype === 'application/pdf' || isDocExt);

      if (isAllowedMime || isAllowedVideo || isAllowedImage || isAllowedDoc) {
        return cb(null, true);
      }
      cb(new ApiError(400, `Unsupported file type (${file.mimetype || 'unknown'}). Please upload an accepted format.`));
    },
  });
}

module.exports = { uploader };
