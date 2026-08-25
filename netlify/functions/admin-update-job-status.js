const { supabase } = require('./lib/supabaseClient');
const { requireAdmin } = require('./lib/adminAuth');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  if (!requireAdmin(event)) {
    return respond(401, { success: false, message: 'Admin authentication required.' });
  }

  try {
    const { jobId, status } = JSON.parse(event.body || '{}');

    if (!jobId || !status) {
      return respond(400, { success: false, message: 'Job ID and status are required.' });
    }

    const { error } = await supabase.from('jobs').update({ status }).eq('id', jobId);
    if (error) throw error;

    return respond(200, { success: true });

  } catch (err) {
    console.error('admin-update-job-status error:', err);
    return respond(500, { success: false, message: err.message || 'Failed to update job status.' });
  }
};

function respond(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
