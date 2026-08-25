const crypto = require('crypto');

const SECRET = process.env.ADMIN_PASSWORD || 'fallback-dev-secret';
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

function base64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64url(str) {
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function issueAdminToken() {
  const expires = Date.now() + TOKEN_TTL_MS;
  const payload = base64url(Buffer.from(JSON.stringify({ role: 'admin', expires })));
  const sig = base64url(crypto.createHmac('sha256', SECRET).update(payload).digest());
  return payload + '.' + sig;
}

function verifyAdminToken(token) {
  if (!token || typeof token !== 'string' || token.indexOf('.') === -1) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expectedSig = base64url(crypto.createHmac('sha256', SECRET).update(payload).digest());
  if (sig.length !== expectedSig.length) return false;
  const sigMatches = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig));
  if (!sigMatches) return false;
  try {
    const data = JSON.parse(fromBase64url(payload).toString('utf8'));
    return data.role === 'admin' && typeof data.expires === 'number' && data.expires > Date.now();
  } catch (e) {
    return false;
  }
}

function requireAdmin(event) {
  const headers = event.headers || {};
  const header = headers.authorization || headers.Authorization || '';
  const token = header.indexOf('Bearer ') === 0 ? header.slice(7) : '';
  return verifyAdminToken(token);
}

module.exports = { issueAdminToken, verifyAdminToken, requireAdmin };
