const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const ROUNDS = 10;
const MAX_PASSWORD_LENGTH = 72;

let dummyHash = null;

function isBcryptHash(stored) {
  return typeof stored === 'string' && /^\$2[aby]\$/.test(stored);
}

function legacyHash(password) {
  return crypto.createHash('sha256').update(String(password), 'utf8').digest('hex');
}

function hashPassword(password) {
  return bcrypt.hash(String(password), ROUNDS);
}

async function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string') {
    return { valid: false, needsUpgrade: false };
  }
  if (isBcryptHash(stored)) {
    return { valid: await bcrypt.compare(String(password), stored), needsUpgrade: false };
  }
  const expected = Buffer.from(stored);
  const given = Buffer.from(legacyHash(password));
  const valid = expected.length === given.length && crypto.timingSafeEqual(expected, given);
  return { valid, needsUpgrade: valid };
}

async function burnPassword(password) {
  if (!dummyHash) dummyHash = bcrypt.hashSync('not-a-real-password', ROUNDS);
  await bcrypt.compare(String(password), dummyHash);
}

module.exports = { hashPassword, verifyPassword, burnPassword, MAX_PASSWORD_LENGTH };
