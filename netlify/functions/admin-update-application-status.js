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
    const { applicationId, status } = JSON.parse(event.body || '{}');

    if (!applicationId || !status) {
      return respond(400, { success: false, message: 'Application ID and status are required.' });
    }

    const { data: app, error: updateErr } = await supabase
      .from('applications')
      .update({ status })
      .eq('id', applicationId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    await supabase.from('application_events').insert({
      applicant_email: (app.email || '').toLowerCase(),
      user_email: app.user_email || null,
      applicant_name: app.name || '',
      job_id: app.job_id || '',
      event_type: 'StatusChanged',
      detail: 'Status updated to: ' + status,
      triggered_by: 'Admin'
    });


    return respond(200, { success: true });

  } catch (err) {
    console.error('admin-update-application-status error:', err);
    return respond(500, { success: false, message: err.message || 'Failed to update application status.' });
  }
};

function respond(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
