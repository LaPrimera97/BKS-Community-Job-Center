const { supabase } = require('./lib/supabaseClient');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { jobId } = JSON.parse(event.body || '{}');

    if (!jobId) {
      return respond(200, { success: false, message: 'Job ID is required.' });
    }

    const { error } = await supabase.from('jobs').delete().eq('id', jobId);
    if (error) throw error;

    return respond(200, { success: true });

  } catch (err) {
    console.error('admin-delete-job error:', err);
    return respond(200, { success: false, message: err.message || 'Failed to delete job.' });
  }
};

function respond(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
