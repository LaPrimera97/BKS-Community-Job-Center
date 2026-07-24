const { supabase } = require('./lib/supabaseClient');

exports.handler = async function (event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('id, title, description, requirements, closing, status')
      .eq('status', 'Open')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data || [])
    };
  } catch (err) {
    console.error('get-jobs error:', err);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([])
    };
  }
};
