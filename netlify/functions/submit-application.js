const { supabase } = require('./lib/supabaseClient');

const MAX_BYTES = 5242880; 

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { formData, cvFileData, idFileData } = JSON.parse(event.body || '{}');

    if (!formData || !formData.name || !formData.idNumber || !formData.phone || !formData.jobId) {
      return respond(200, { success: false, message: 'Please fill in all required fields.' });
    }
    if (!cvFileData || !idFileData) {
      return respond(200, { success: false, message: 'Please upload both your CV and ID document.' });
    }
    if (!formData.gender || !formData.maritalStatus) {
      return respond(200, { success: false, message: 'Please select your gender and marital status.' });
    }

    const idStr = formData.idNumber.toString().replace(/\D/g, '');
    if (idStr.length !== 13) {
      return respond(200, { success: false, message: 'Please enter a valid 13-digit South African ID number.' });
    }

    const phoneStr = formData.phone.toString().replace(/\D/g, '');
    if (phoneStr.length < 10) {
      return respond(200, { success: false, message: 'Please enter a valid 10-digit phone number.' });
    }
    
    const cvBuffer = Buffer.from(cvFileData.data, 'base64');
    const idBuffer = Buffer.from(idFileData.data, 'base64');
    if (cvBuffer.length > MAX_BYTES) {
      return respond(200, { success: false, message: 'Your CV file is too large. Maximum size is 5MB.' });
    }
    if (idBuffer.length > MAX_BYTES) {
      return respond(200, { success: false, message: 'Your ID document is too large. Maximum size is 5MB.' });
    }

    const { data: existingApp } = await supabase
      .from('applications')
      .select('id')
      .eq('id_number', idStr)
      .eq('job_id', formData.jobId.toString().trim())
      .maybeSingle();

    if (existingApp) {
      return respond(200, {
        success: false,
        message: 'You have already submitted an application for this position. Please check your application status.'
      });
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.toLocaleString('en-US', { month: 'long' });
    const safeName = formData.name.toString().trim().replace(/[^a-zA-Z0-9 _-]/g, '');
    const folderPath = `${year}/${month}/${formData.jobId}/${safeName}_${now.getTime()}`;

    const cvPath = `${folderPath}/CV_${cvFileData.name}`;
    const idPath = `${folderPath}/ID_${idFileData.name}`;

    const { error: cvUploadErr } = await supabase.storage
      .from('applications')
      .upload(cvPath, cvBuffer, { contentType: cvFileData.type || 'application/pdf' });
    if (cvUploadErr) throw cvUploadErr;

    const { error: idUploadErr } = await supabase.storage
      .from('applications')
      .upload(idPath, idBuffer, { contentType: idFileData.type || 'application/pdf' });
    if (idUploadErr) throw idUploadErr;

    const { error: insertErr } = await supabase.from('applications').insert({
      name: formData.name.toString().trim(),
      id_number: idStr,
      phone: phoneStr,
      email: (formData.email || '').toString().trim(),
      gender: formData.gender,
      marital_status: formData.maritalStatus,
      job_id: formData.jobId.toString().trim(),
      cv_url: cvPath,
      id_url: idPath,
      folder_url: folderPath,
      status: 'Pending'
    });

    if (insertErr) throw insertErr;

    await supabase.from('application_events').insert({
      applicant_email: formData.email || '',
      applicant_name: formData.name,
      job_id: formData.jobId,
      event_type: 'Submitted',
      detail: 'Application submitted for: ' + (formData.jobTitle || formData.jobId),
      triggered_by: 'Applicant'
    });

    return respond(200, {
      success: true,
      message: 'Application submitted successfully!' +
        (formData.email && formData.email.trim() !== ''
          ? ' A confirmation email has been sent to ' + formData.email + '.'
          : ' Please sign in to track your application status.')
    });

  } catch (err) {
    console.error('submit-application error:', err);
    return respond(200, { success: false, message: 'Submission failed due to a server error. Please try again.' });
  }
};

function respond(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
