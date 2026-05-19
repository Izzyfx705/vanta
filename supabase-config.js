// ===== VANTA SUPABASE CONFIGURATION =====
const SUPABASE_URL = 'https://vohpglktaatabxxqyccp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_FOzb_g7tjGv5q39qoh-Ezw__d-x3cFG';

const supabaseHeaders = {
    'apikey': SUPABASE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
};

console.log('[Vanta] Supabase configured');
