const { checkAdminPassword } = require('./lib/auth');
const { issueAdminToken } = require('./lib/adminAuth');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { password } = JSON.parse(event.body || '{}');

    if (!password) {
      return respond(400, { success: false, message: 'Please enter the admin password.' });
    }

    const ok = checkAdminPassword(password);

    return ok
      ? respond(200, { success: true, token: issueAdminToken() })
      : respond(401, { success: false, message: 'Invalid password. Please try again.' });

  } catch (err) {
    console.error('admin-login error:', err);
    return respond(200, { success: false, message: 'Login failed. Please try again.' });
  }
};

function respond(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
