const { checkAdminPassword } = require('./lib/auth');
const { issueAdminToken } = require('./lib/tokens');
const { clientIp, isLimited, recordHit, clearHits, FIFTEEN_MINUTES } = require('./lib/rateLimit');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { password } = JSON.parse(event.body || '{}');

    if (!password || typeof password !== 'string') {
      return respond(400, { success: false, message: 'Please enter the admin password.' });
    }

    const ipKey = 'admin-ip:' + clientIp(event);
    const globalKey = 'admin-global';

    if ((await isLimited(ipKey, 5, FIFTEEN_MINUTES)) || (await isLimited(globalKey, 20, FIFTEEN_MINUTES))) {
      return respond(429, { success: false, message: 'Too many attempts. Please wait 15 minutes and try again.' });
    }

    if (!checkAdminPassword(password)) {
      await recordHit(ipKey);
      await recordHit(globalKey);
      return respond(401, { success: false, message: 'Invalid password. Please try again.' });
    }

    await clearHits(ipKey);
    return respond(200, { success: true, token: issueAdminToken() });

  } catch (err) {
    console.error('admin-login error:', err);
    return respond(500, { success: false, message: 'Login failed. Please try again.' });
  }
};

function respond(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
