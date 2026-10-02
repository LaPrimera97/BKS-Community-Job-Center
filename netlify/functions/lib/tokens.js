const crypto = require('crypto');

const TTL = {
  admin: 8 * 60 * 60 * 1000,
  user: 12 * 60 * 60 * 1000,
  upload: 30 * 60 * 1000
};

function getSecret() {
  const secret = process.env.TOKEN_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('TOKEN_SECRET must be set to a random string of at least 32 characters.');
  }
  return secret;
}

function base64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64url(str) {
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function signature(payload) {
  return base64url(crypto.createHmac('sha256', getSecret()).update(payload).digest());
}

function issueToken(type, claims) {
  const body = Object.assign({}, claims, { typ: type, exp: Date.now() + TTL[type] });
  const payload = base64url(Buffer.from(JSON.stringify(body)));
  return payload + '.' + signature(payload);
}

function verifyToken(token, type) {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const expected = Buffer.from(signature(parts[0]));
    const given = Buffer.from(parts[1]);
    if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
    const data = JSON.parse(fromBase64url(parts[0]).toString('utf8'));
    if (data.typ !== type || typeof data.exp !== 'number' || data.exp <= Date.now()) return null;
    return data;
  } catch (e) {
    return null;
  }
}

function bearerToken(event) {
  const headers = (event && event.headers) || {};
  const header = headers.authorization || headers.Authorization || '';
  return header.indexOf('Bearer ') === 0 ? header.slice(7) : '';
}

function issueUserToken(email) {
  return issueToken('user', { email: String(email).toLowerCase() });
}

function requireUser(event) {
  const data = verifyToken(bearerToken(event), 'user');
  return data && typeof data.email === 'string' && data.email ? data.email : null;
}

function issueUploadTicket(claims) {
  return issueToken('upload', claims);
}

function verifyUploadTicket(ticket) {
  return verifyToken(ticket, 'upload');
}

function issueAdminToken() {
  return issueToken('admin', { role: 'admin' });
}

function verifyAdminToken(token) {
  const data = verifyToken(token, 'admin');
  return !!data && data.role === 'admin';
}

function requireAdmin(event) {
  return verifyAdminToken(bearerToken(event));
}

module.exports = {
  issueUserToken,
  requireUser,
  issueUploadTicket,
  verifyUploadTicket,
  issueAdminToken,
  verifyAdminToken,
  requireAdmin
};
