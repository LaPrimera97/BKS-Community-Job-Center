const { supabase } = require('./lib/supabaseClient');
const { verifyPassword, burnPassword, hashPassword } = require('./lib/password');
const { issueUserToken } = require('./lib/tokens');
const { clientIp, isLimited, recordHit, clearHits, FIFTEEN_MINUTES } = require('./lib/rateLimit');

const GENERIC_FAILURE = 'Incorrect email or password. Please try again.';

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { email, password } = JSON.parse(event.body || '{}');

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return respond(400, { success: false, message: 'Please enter your email and password.' });
    }

    const eLow = email.toLowerCase().trim();
    const emailKey = 'signin:' + eLow;
    const ipKey = 'signin-ip:' + clientIp(event);

    if ((await isLimited(emailKey, 5, FIFTEEN_MINUTES)) || (await isLimited(ipKey, 30, FIFTEEN_MINUTES))) {
      return respond(429, { success: false, message: 'Too many sign-in attempts. Please wait 15 minutes and try again.' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password_hash, full_name, phone, id_number')
      .eq('email', eLow)
      .maybeSingle();

    if (error) throw error;

    if (!user) {
      await burnPassword(password);
      await recordHit(emailKey);
      await recordHit(ipKey);
      return respond(401, { success: false, message: GENERIC_FAILURE });
    }

    const { valid, needsUpgrade } = await verifyPassword(password, user.password_hash);

    if (!valid) {
      await recordHit(emailKey);
      await recordHit(ipKey);
      return respond(401, { success: false, message: GENERIC_FAILURE });
    }

    await clearHits(emailKey);

    const update = { last_login: new Date().toISOString() };
    if (needsUpgrade) update.password_hash = await hashPassword(password);
    await supabase.from('users').update(update).eq('id', user.id);

    return respond(200, {
      success: true,
      token: issueUserToken(user.email),
      fullName: user.full_name || eLow,
      email: user.email,
      phone: user.phone || '',
      idNumber: user.id_number || ''
    });

  } catch (err) {
    console.error('sign-in error:', err);
    return respond(500, { success: false, message: 'Sign in failed. Please try again.' });
  }
};

function respond(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
