const { supabase } = require('./supabaseClient');

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

function clientIp(event) {
  const headers = (event && event.headers) || {};
  const forwarded = (headers['x-forwarded-for'] || '').split(',')[0].trim();
  return headers['x-nf-client-connection-ip'] || forwarded || headers['client-ip'] || 'unknown';
}

async function isLimited(key, max, windowMs) {
  try {
    const since = new Date(Date.now() - windowMs).toISOString();
    const { count, error } = await supabase
      .from('rate_limits')
      .select('id', { count: 'exact', head: true })
      .eq('key', key)
      .gte('created_at', since);
    if (error) throw error;
    return (count || 0) >= max;
  } catch (err) {
    console.error('rate limit check failed:', err.message || err);
    return false;
  }
}

async function recordHit(key) {
  try {
    const { error } = await supabase.from('rate_limits').insert({ key });
    if (error) throw error;
    if (Math.random() < 0.02) {
      const cutoff = new Date(Date.now() - 24 * ONE_HOUR).toISOString();
      await supabase.from('rate_limits').delete().lt('created_at', cutoff);
    }
  } catch (err) {
    console.error('rate limit record failed:', err.message || err);
  }
}

async function clearHits(key) {
  try {
    await supabase.from('rate_limits').delete().eq('key', key);
  } catch (err) {
    console.error('rate limit clear failed:', err.message || err);
  }
}

module.exports = { clientIp, isLimited, recordHit, clearHits, FIFTEEN_MINUTES, ONE_HOUR };
