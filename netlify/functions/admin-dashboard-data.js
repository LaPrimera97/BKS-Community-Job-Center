const { supabase } = require('./lib/supabaseClient');

exports.handler = async function (event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { data: jobs, error: jobsErr } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });
    if (jobsErr) throw jobsErr;

    const { data: apps, error: appsErr } = await supabase
      .from('applications')
      .select('*')
      .order('submitted_at', { ascending: false });
    if (appsErr) throw appsErr;

    const formattedJobs = (jobs || []).map(j => ({
      id: j.id,
      title: j.title,
      description: j.description,
      requirements: j.requirements,
      closing: j.closing,
      status: j.status
    }));

    const formattedApps = await Promise.all((apps || []).map(async (a) => {
      let cvSignedUrl = '';
      let idSignedUrl = '';
      try {
        if (a.cv_url) {
          const { data } = await supabase.storage.from('applications').createSignedUrl(a.cv_url, 3600);
          cvSignedUrl = data ? data.signedUrl : '';
        }
        if (a.id_url) {
          const { data } = await supabase.storage.from('applications').createSignedUrl(a.id_url, 3600);
          idSignedUrl = data ? data.signedUrl : '';
        }
      } catch (signErr) {
        console.error('Signed URL error for application', a.id, signErr);
      }

      return {
        id: a.id, 
        timestamp: a.submitted_at,
        name: a.name,
        idNumber: a.id_number,
        phone: a.phone,
        email: a.email,
        gender: a.gender,
        maritalStatus: a.marital_status,
        jobId: a.job_id,
        cvUrl: cvSignedUrl,
        idUrl: idSignedUrl,
        folderUrl: a.folder_url,
        status: a.status
      };
    }));

    return respond(200, { jobs: formattedJobs, apps: formattedApps });

  } catch (err) {
    console.error('admin-dashboard-data error:', err);
    return respond(200, { jobs: [], apps: [] });
  }
};

function respond(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
