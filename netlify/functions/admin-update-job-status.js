const { supabase } = require('./lib/supabaseClient');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { jobId, status } = JSON.parse(event.body || '{}');

    if (!jobId || !status) {
      return respond(200, { success: false, message: 'Job ID and status are required.' });
    }

    const { error } = await supabase.from('jobs').update({ status }).eq('id', jobId);
    if (error) throw error;

    return respond(200, { success: true });

  } catch (err) {
    console.error('admin-update-job-status error:', err);
    return respond(200, { success: false, message: err.message || 'Failed to update job status.' });
  }
};

function respond(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
