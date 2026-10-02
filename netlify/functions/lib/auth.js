const crypto = require('crypto');

function digest(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest();
}

function checkAdminPassword(password) {
  const correct = process.env.ADMIN_PASSWORD;
  if (!correct) {
    throw new Error('ADMIN_PASSWORD environment variable is not set.');
  }
  return crypto.timingSafeEqual(digest(password), digest(correct));
}

module.exports = { checkAdminPassword };
