const { supabase } = require('./lib/supabaseClient');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const jobData = JSON.parse(event.body || '{}');

    if (!jobData.title) {
      return respond(200, { success: false, message: 'Job title is required.' });
    }

    const id = (jobData.id || '').toString().trim() || 'JOB' + Date.now();

    const { error } = await supabase.from('jobs').insert({
      id,
      title: jobData.title.toString().trim(),
      description: jobData.description || '',
      requirements: jobData.requirements || '',
      closing: jobData.closing || '',
      status: jobData.status || 'Open'
    });

    if (error) {
      if (error.code === '23505') {
        return respond(200, { success: false, message: 'A job with this ID already exists.' });
      }
      throw error;
    }

    return respond(200, { success: true });

  } catch (err) {
    console.error('admin-add-job error:', err);
    return respond(200, { success: false, message: err.message || 'Failed to add job.' });
  }
};

function respond(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
