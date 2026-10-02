const { supabase } = require('./lib/supabaseClient');
const { hashPassword, MAX_PASSWORD_LENGTH } = require('./lib/password');
const { isValidSouthAfricanId } = require('./lib/saId');
const { clientIp, isLimited, recordHit, ONE_HOUR } = require('./lib/rateLimit');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const userData = JSON.parse(event.body || '{}');
    const email = (userData.email || '').toString().toLowerCase().trim();
    const password = typeof userData.password === 'string' ? userData.password : '';

    if (!email || !password || !userData.fullName) {
      return respond(400, { success: false, message: 'Email, password and full name are required.' });
    }
    if (!EMAIL_PATTERN.test(email) || email.length > 254) {
      return respond(400, { success: false, message: 'Please enter a valid email address.' });
    }
    if (password.length < 8) {
      return respond(400, { success: false, message: 'Password must be at least 8 characters.' });
    }
    if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_LENGTH) {
      return respond(400, { success: false, message: 'Password is too long. Please use at most ' + MAX_PASSWORD_LENGTH + ' characters.' });
    }

    const idNumber = (userData.idNumber || '').toString().replace(/\D/g, '');
    if (idNumber && !isValidSouthAfricanId(idNumber)) {
      return respond(400, { success: false, message: 'Please enter a valid 13-digit South African ID number, or leave it blank.' });
    }

    const ipKey = 'signup-ip:' + clientIp(event);
    if (await isLimited(ipKey, 10, ONE_HOUR)) {
      return respond(429, { success: false, message: 'Too many sign-up attempts. Please try again later.' });
    }
    await recordHit(ipKey);

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      return respond(409, { success: false, message: 'An account with this email already exists. Please sign in.' });
    }

    const { error } = await supabase.from('users').insert({
      email,
      password_hash: await hashPassword(password),
      full_name: (userData.fullName || '').toString().trim(),
      phone: (userData.phone || '').toString().trim(),
      id_number: idNumber
    });

    if (error) {
      if (error.code === '23505') {
        return respond(409, { success: false, message: 'An account with this email already exists. Please sign in.' });
      }
      throw error;
    }

    return respond(200, { success: true, message: 'Account created successfully. You can now sign in.' });

  } catch (err) {
    console.error('sign-up error:', err);
    return respond(500, { success: false, message: 'Registration failed. Please try again.' });
  }
};

function respond(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
