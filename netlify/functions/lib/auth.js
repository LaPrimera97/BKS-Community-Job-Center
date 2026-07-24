const crypto = require('crypto');

function hashPassword(password) {
  if (!password) return '';
  return crypto.createHash('sha256').update(password, 'utf8').digest('hex');
}

function checkAdminPassword(password) {
  const correct = process.env.ADMIN_PASSWORD;
  if (!correct) {
    throw new Error('ADMIN_PASSWORD environment variable is not set.');
  }
  return password === correct;
}

module.exports = { hashPassword, checkAdminPassword };
