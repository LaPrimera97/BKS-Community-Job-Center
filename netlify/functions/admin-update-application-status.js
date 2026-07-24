const { supabase } = require('./lib/supabaseClient');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { applicationId, status } = JSON.parse(event.body || '{}');

    if (!applicationId || !status) {
      return respond(200, { success: false, message: 'Application ID and status are required.' });
    }

    const { data: app, error: updateErr } = await supabase
      .from('applications')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', applicationId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    await supabase.from('application_events').insert({
      applicant_email: app.email || '',
      applicant_name: app.name || '',
      job_id: app.job_id || '',
      event_type: 'StatusChanged',
      detail: 'Status updated to: ' + status,
      triggered_by: 'Admin'
    });


    return respond(200, { success: true });

  } catch (err) {
    console.error('admin-update-application-status error:', err);
    return respond(200, { success: false, message: err.message || 'Failed to update application status.' });
  }
};

function respond(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
