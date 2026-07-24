const { supabase } = require('./lib/supabaseClient');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { email } = JSON.parse(event.body || '{}');

    if (!email) {
      return respond(200, { apps: [], events: [] });
    }

    const eLow = email.toLowerCase().trim();

    const { data: apps, error: appsErr } = await supabase
      .from('applications')
      .select('submitted_at, name, job_id, status')
      .eq('email', eLow)
      .order('submitted_at', { ascending: false });

    if (appsErr) throw appsErr;

    const { data: events, error: eventsErr } = await supabase
      .from('application_events')
      .select('created_at, job_id, event_type, detail, triggered_by')
      .eq('applicant_email', eLow)
      .order('created_at', { ascending: true });

    if (eventsErr) throw eventsErr;

    const formattedApps = (apps || []).map(a => ({
      timestamp: a.submitted_at,
      name: a.name,
      jobId: a.job_id,
      status: a.status || 'Pending'
    }));

    const formattedEvents = (events || []).map(e => ({
      timestamp: e.created_at,
      jobId: e.job_id,
      eventType: e.event_type,
      detail: e.detail,
      triggeredBy: e.triggered_by
    }));

    return respond(200, { apps: formattedApps, events: formattedEvents });

  } catch (err) {
    console.error('get-my-applications error:', err);
    return respond(200, { apps: [], events: [] });
  }
};

function respond(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
