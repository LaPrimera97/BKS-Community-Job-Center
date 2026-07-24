const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Check that SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in Netlify.'
  );
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

module.exports = { supabase };
