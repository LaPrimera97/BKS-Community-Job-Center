const { supabase } = require('./lib/supabaseClient');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const formData = JSON.parse(event.body || '{}');

    if (!formData.name || !formData.email || !formData.message) {
      return respond(200, { success: false, message: 'Please fill in your name, email and message.' });
    }

    const { error } = await supabase.from('contact_messages').insert({
      name: formData.name.toString().trim(),
      email: formData.email.toString().trim(),
      phone: (formData.phone || '').toString().trim(),
      message: formData.message.toString().trim()
    });

    if (error) throw error;


    return respond(200, { success: true, message: 'Your message has been sent. We will get back to you soon.' });

  } catch (err) {
    console.error('submit-contact error:', err);
    return respond(200, { success: false, message: 'Failed to send your message due to a server error. Please try again.' });
  }
};

function respond(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
