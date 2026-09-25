const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { env } = require('../config/env');

// Pluggable media storage. Local disk is implemented; S3 / Cloudinary are
// stubbed so the rest of the app codes against one interface.

const uploadRoot = path.isAbsolute(env.storage.uploadDir)
  ? env.storage.uploadDir
  : path.resolve(__dirname, '../../', env.storage.uploadDir);

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

try {
  ensureDir(uploadRoot);
} catch (err) {
  // eslint-disable-next-line no-console
  console.warn('[storage] Warning: could not ensure uploadRoot:', err.message);
}

function safeName(original) {
  const ext = path.extname(original || '').toLowerCase().slice(0, 10);
  return `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
}

function resolvePublicBaseUrl(req) {
  if (process.env.PUBLIC_BASE_URL) {
    return process.env.PUBLIC_BASE_URL.replace(/\/+$/, '');
  }
  if (req && typeof req.get === 'function') {
    const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
    const host = req.get('host');
    if (host) return `${proto}://${host}`;
  }
  return (env.storage.publicBaseUrl || (env.isProd ? 'https://propszy.com' : 'http://localhost:5050')).replace(/\/+$/, '');
}

const localDriver = {
  async save(file, folder = 'misc', req = null) {
    const dir = path.join(uploadRoot, folder);
    ensureDir(dir);
    const baseUrl = resolvePublicBaseUrl(req);

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
      const key = `${folder}/${filename}`.replace(/\\/g, '/');
      return {
        url: `${baseUrl}/uploads/${key}`,
        key,
        size: file.size,
      };
    }

    const filename = safeName(file.originalname);
    const key = `${folder}/${filename}`.replace(/\\/g, '/');
    const dest = path.join(uploadRoot, key);
    ensureDir(path.dirname(dest));
    await fs.promises.writeFile(dest, file.buffer);
    return {
      url: `${baseUrl}/uploads/${key}`,
      key,
      size: file.size || (file.buffer ? file.buffer.length : 0),
    };
  },
  async remove(key) {
    if (!key) return;
    const target = path.join(uploadRoot, key);
    await fs.promises.unlink(target).catch(() => {});
  },
};

const s3Driver = {
  async save(file, folder = 'misc') {
    const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
    const region = env.storage.s3.region || process.env.AWS_DEFAULT_REGION || 'ap-south-1';
    const bucket = env.storage.s3.bucket;
    if (!bucket) {
      throw new Error('S3 storage driver is missing AWS_S3_BUCKET in .env');
    }
    const clientConfig = { region };
    const { accessKeyId, secretAccessKey } = env.storage.s3;
    if (accessKeyId && secretAccessKey) {
      clientConfig.credentials = { accessKeyId, secretAccessKey };
    }
    const s3 = new S3Client(clientConfig);
    const originalName = file.originalname || file.filename || 'file';
    const key = `${folder}/${safeName(originalName)}`.replace(/\\/g, '/');

    let buffer;
    if (file.buffer) {
      buffer = file.buffer;
    } else if (file.path) {
      buffer = await fs.promises.readFile(file.path);
    } else {
      throw new Error('No file buffer or path provided for upload');
    }

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: file.mimetype || 'application/octet-stream',
      })
    );

    if (file.path) {
      await fs.promises.unlink(file.path).catch(() => {});
    }

    const url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    return {
      url,
      key,
      size: file.size || buffer.length,
    };
  },
  async remove(key) {
    if (!key) return;
    try {
      const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
      const { region, bucket, accessKeyId, secretAccessKey } = env.storage.s3;
      if (!bucket || !region) return;
      const clientConfig = { region };
      if (accessKeyId && secretAccessKey) {
        clientConfig.credentials = { accessKeyId, secretAccessKey };
      }
      const s3 = new S3Client(clientConfig);
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    } catch {
      // Ignore S3 delete errors
    }
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
  s3: s3Driver,
  cloudinary: notImplemented('cloudinary'),
};

const storage = drivers[env.storage.driver] || localDriver;

module.exports = { storage, uploadRoot };
