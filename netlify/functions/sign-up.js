const { supabase } = require('./lib/supabaseClient');
const { hashPassword } = require('./lib/auth');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const userData = JSON.parse(event.body || '{}');
    const email = (userData.email || '').toLowerCase().trim();

    if (!email || !userData.password || !userData.fullName) {
      return respond(200, { success: false, message: 'Email, password and full name are required.' });
    }
    if (userData.password.length < 8) {
      return respond(200, { success: false, message: 'Password must be at least 8 characters.' });
    }

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      return respond(200, { success: false, message: 'An account with this email already exists. Please sign in.' });
    }

    const { error } = await supabase.from('users').insert({
      email,
      password_hash: hashPassword(userData.password),
      full_name: (userData.fullName || '').toString().trim(),
      phone: (userData.phone || '').toString().trim(),
      id_number: (userData.idNumber || '').toString().trim()
    });

    if (error) throw error;

    return respond(200, { success: true, message: 'Account created successfully. You can now sign in.' });

  } catch (err) {
    console.error('sign-up error:', err);
    return respond(200, { success: false, message: 'Registration failed. Please try again.' });
  }
};

function respond(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
