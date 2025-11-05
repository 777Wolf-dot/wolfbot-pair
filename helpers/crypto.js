// helpers/crypto.js
require('dotenv').config();
const crypto = require('crypto');

// Ensure key exists
if (!process.env.SESSION_ENCRYPTION_KEY) {
  throw new Error('❌ Missing SESSION_ENCRYPTION_KEY in .env');
}

// Load 24-byte key for AES-192
const key = Buffer.from(process.env.SESSION_ENCRYPTION_KEY, 'base64');

function encryptBuffer(buffer) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-192-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  return Buffer.concat([iv, encrypted]).toString('base64');
}

function decryptBuffer(encryptedBase64) {
  const data = Buffer.from(encryptedBase64, 'base64');
  const iv = data.slice(0, 16);
  const encrypted = data.slice(16);
  const decipher = crypto.createDecipheriv('aes-192-cbc', key, iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

module.exports = { encryptBuffer, decryptBuffer };
