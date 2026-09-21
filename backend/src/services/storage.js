const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { env } = require('../config/env');

// Pluggable media storage. Local disk is implemented; S3 / Cloudinary are
// stubbed so the rest of the app codes against one interface.

const uploadRoot = path.resolve(process.cwd(), env.storage.uploadDir);

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function safeName(original) {
  const ext = path.extname(original || '').toLowerCase().slice(0, 10);
  return `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
}

const localDriver = {
  async save(file, folder = 'misc') {
    const dir = path.join(uploadRoot, folder);
    ensureDir(dir);

    // If file was already streamed to disk by diskStorage
    if (file.filename && file.path) {
      const filename = file.filename;
      const targetPath = path.join(dir, filename);
      if (path.resolve(file.path) !== path.resolve(targetPath)) {
        try {
          await fs.promises.rename(file.path, targetPath);
        } catch {
          await fs.promises.copyFile(file.path, targetPath);
          await fs.promises.unlink(file.path).catch(() => {});
        }
      }
      const key = `${folder}/${filename}`;
      return {
        url: `${env.storage.publicBaseUrl}/uploads/${key}`,
        key,
        size: file.size,
      };
    }

    const key = `${folder}/${safeName(file.originalname)}`;
    const dest = path.join(uploadRoot, key);
    await fs.promises.writeFile(dest, file.buffer);
    return {
      url: `${env.storage.publicBaseUrl}/uploads/${key}`,
      key,
      size: file.size,
    };
  },
  async remove(key) {
    if (!key) return;
    const target = path.join(uploadRoot, key);
    await fs.promises.unlink(target).catch(() => {});
  },
};

const notImplemented = (name) => ({
  async save() {
    throw new Error(`${name} storage driver not configured`);
  },
  async remove() {},
});

const drivers = {
  local: localDriver,
  s3: notImplemented('s3'),
  cloudinary: notImplemented('cloudinary'),
};

const storage = drivers[env.storage.driver] || localDriver;

module.exports = { storage, uploadRoot };
