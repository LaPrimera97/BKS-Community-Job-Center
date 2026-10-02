const { supabase } = require('./lib/supabaseClient');
const { verifyUploadTicket } = require('./lib/tokens');
const { isValidSouthAfricanId } = require('./lib/saId');
const { MAX_BYTES, extensionOf, matchesSignature } = require('./lib/uploads');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let uploadedPaths = [];

  async function discardUploads() {
    if (!uploadedPaths.length) return;
    try {
      await supabase.storage.from('applications').remove(uploadedPaths);
    } catch (err) {
      console.error('cleanup of uploaded files failed:', err);
    }
  }

  async function fail(statusCode, message) {
    await discardUploads();
    return respond(statusCode, { success: false, message });
  }

  try {
    const { formData, ticket: ticketToken } = JSON.parse(event.body || '{}');

    const ticket = verifyUploadTicket(ticketToken);
    if (!ticket) {
      return respond(400, { success: false, message: 'Your upload session has expired. Please try submitting again.' });
    }
    uploadedPaths = [ticket.cvPath, ticket.idPath];

    if (!formData || !formData.name || !formData.idNumber || !formData.phone || !formData.jobId) {
      return fail(400, 'Please fill in all required fields.');
    }
    if (!formData.gender || !formData.maritalStatus) {
      return fail(400, 'Please select your gender and marital status.');
    }

    const idStr = formData.idNumber.toString().replace(/\D/g, '');
    if (!isValidSouthAfricanId(idStr)) {
      return fail(400, 'Please enter a valid 13-digit South African ID number.');
    }

    const phoneStr = formData.phone.toString().replace(/\D/g, '');
    if (phoneStr.length < 10) {
      return fail(400, 'Please enter a valid 10-digit phone number.');
    }

    const jobIdStr = formData.jobId.toString().trim();
    if (idStr !== ticket.idNumber || jobIdStr !== ticket.jobId) {
      return fail(400, 'Your details do not match the uploaded documents. Please try submitting again.');
    }

    for (const path of uploadedPaths) {
      const { data: blob, error: downloadErr } = await supabase.storage.from('applications').download(path);
      if (downloadErr || !blob) {
        return fail(400, 'One of your documents did not upload correctly. Please try again.');
      }
      const buffer = Buffer.from(await blob.arrayBuffer());
      if (buffer.length === 0 || buffer.length > MAX_BYTES) {
        return fail(400, 'One of your documents is empty or larger than 5MB.');
      }
      if (!matchesSignature(extensionOf(path), buffer)) {
        return fail(400, 'One of your documents is not a valid file of the type it claims to be. Please upload a PDF, Word document or image.');
      }
    }

    const { data: existingApp } = await supabase
      .from('applications')
      .select('id')
      .eq('id_number', idStr)
      .eq('job_id', jobIdStr)
      .maybeSingle();

    if (existingApp) {
      return fail(409, 'You have already submitted an application for this position. Please check your application status.');
    }

    const email = (formData.email || '').toString().toLowerCase().trim();

    const { error: insertErr } = await supabase.from('applications').insert({
      name: formData.name.toString().trim(),
      id_number: idStr,
      phone: phoneStr,
      email,
      user_email: ticket.userEmail || null,
      gender: formData.gender,
      marital_status: formData.maritalStatus,
      job_id: jobIdStr,
      cv_url: ticket.cvPath,
      id_url: ticket.idPath,
      folder_url: ticket.folder,
      status: 'Pending'
    });

    if (insertErr) {
      if (insertErr.code === '23505') {
        return fail(409, 'You have already submitted an application for this position. Please check your application status.');
      }
      throw insertErr;
    }
    uploadedPaths = [];

    await supabase.from('application_events').insert({
      applicant_email: email,
      user_email: ticket.userEmail || null,
      applicant_name: formData.name.toString().trim(),
      job_id: jobIdStr,
      event_type: 'Submitted',
      detail: 'Application submitted for: ' + (formData.jobTitle || jobIdStr),
      triggered_by: 'Applicant'
    });

    return respond(200, {
      success: true,
      message: ticket.userEmail
        ? 'Application submitted successfully! You can follow its status under My Applications.'
        : 'Application submitted successfully! To follow your applications in future, sign in before you apply.'
    });

  } catch (err) {
    console.error('submit-application error:', err);
    await discardUploads();
    return respond(500, { success: false, message: 'Submission failed due to a server error. Please try again.' });
  }
};

function respond(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
