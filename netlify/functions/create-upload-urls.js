const crypto = require('crypto');
const { supabase } = require('./lib/supabaseClient');
const { requireUser, issueUploadTicket } = require('./lib/tokens');
const { isValidSouthAfricanId } = require('./lib/saId');
const { checkDeclaredFile } = require('./lib/uploads');
const { clientIp, isLimited, recordHit, ONE_HOUR } = require('./lib/rateLimit');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const name = (body.name || '').toString().trim();
    const jobId = (body.jobId || '').toString().trim();
    const idStr = (body.idNumber || '').toString().replace(/\D/g, '');

    if (!name || !jobId) {
      return respond(400, { success: false, message: 'Please fill in all required fields.' });
    }
    if (!isValidSouthAfricanId(idStr)) {
      return respond(400, { success: false, message: 'Please enter a valid 13-digit South African ID number.' });
    }

    const cv = checkDeclaredFile('cv', body.cv);
    if (!cv.ok) return respond(400, { success: false, message: cv.message });
    const idDoc = checkDeclaredFile('id', body.id);
    if (!idDoc.ok) return respond(400, { success: false, message: idDoc.message });

    const ipKey = 'upload-ip:' + clientIp(event);
    const idKey = 'upload-id:' + idStr;
    if ((await isLimited(ipKey, 40, ONE_HOUR)) || (await isLimited(idKey, 6, ONE_HOUR))) {
      return respond(429, { success: false, message: 'Too many attempts. Please try again later.' });
    }
    await recordHit(ipKey);
    await recordHit(idKey);

    const { data: existingApp } = await supabase
      .from('applications')
      .select('id')
      .eq('id_number', idStr)
      .eq('job_id', jobId)
      .maybeSingle();

    if (existingApp) {
      return respond(409, {
        success: false,
        message: 'You have already submitted an application for this position. Please check your application status.'
      });
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.toLocaleString('en-US', { month: 'long' });
    const safeName = name.replace(/[^a-zA-Z0-9 _-]/g, '').trim().slice(0, 60) || 'applicant';
    const safeJob = jobId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 60) || 'job';
    const suffix = crypto.randomBytes(3).toString('hex');
    const folder = `${year}/${month}/${safeJob}/${safeName}_${now.getTime()}_${suffix}`;
    const cvPath = `${folder}/CV_${cv.base}.${cv.ext}`;
    const idPath = `${folder}/ID_${idDoc.base}.${idDoc.ext}`;

    const bucket = supabase.storage.from('applications');
    const cvSigned = await bucket.createSignedUploadUrl(cvPath);
    if (cvSigned.error) throw cvSigned.error;
    const idSigned = await bucket.createSignedUploadUrl(idPath);
    if (idSigned.error) throw idSigned.error;

    const ticket = issueUploadTicket({
      folder,
      cvPath,
      idPath,
      idNumber: idStr,
      jobId,
      userEmail: requireUser(event)
    });

    return respond(200, {
      success: true,
      ticket,
      uploads: {
        cv: { signedUrl: cvSigned.data.signedUrl, contentType: cv.contentType },
        id: { signedUrl: idSigned.data.signedUrl, contentType: idDoc.contentType }
      }
    });

  } catch (err) {
    console.error('create-upload-urls error:', err);
    return respond(500, { success: false, message: 'Could not start your upload. Please try again.' });
  }
};

function respond(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
