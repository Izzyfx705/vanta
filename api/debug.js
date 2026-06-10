// =========================================================================
// VANTA Vercel Serverless Diagnostics Endpoint
// File: /api/debug.js
// =========================================================================

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vohpglktaatabxxqyccp.supabase.co';

  const diagnostics = {
    timestamp: new Date().toISOString(),
    env: {
      PAYSTACK_SECRET_KEY: PAYSTACK_SECRET_KEY 
        ? {
            configured: true,
            length: PAYSTACK_SECRET_KEY.length,
            prefix: PAYSTACK_SECRET_KEY.slice(0, 8) + '...'
          }
        : { configured: false },
      SUPABASE_SERVICE_KEY: SUPABASE_SERVICE_KEY 
        ? {
            configured: true,
            length: SUPABASE_SERVICE_KEY.length,
            prefix: SUPABASE_SERVICE_KEY.slice(0, 10) + '...'
          }
        : { configured: false },
      SUPABASE_URL: {
        value: SUPABASE_URL,
        configured: !!process.env.SUPABASE_URL
      }
    },
    checks: {}
  };

  // Test Supabase Connection using Service Role Key
  if (SUPABASE_SERVICE_KEY) {
    try {
      const start = Date.now();
      const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/products?select=id&limit=1`, {
        method: 'GET',
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`
        }
      });
      diagnostics.checks.supabase = {
        connected: dbRes.ok,
        status: dbRes.status,
        latencyMs: Date.now() - start,
        error: dbRes.ok ? null : await dbRes.text()
      };
    } catch (err) {
      diagnostics.checks.supabase = {
        connected: false,
        error: err.message
      };
    }
  } else {
    diagnostics.checks.supabase = {
      connected: false,
      error: 'Cannot test: SUPABASE_SERVICE_KEY is not configured.'
    };
  }

  // Test Paystack Connection
  if (PAYSTACK_SECRET_KEY) {
    try {
      const start = Date.now();
      const paystackRes = await fetch('https://api.paystack.co/decision/bin/539983', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`
        }
      });
      diagnostics.checks.paystack = {
        connected: paystackRes.ok || paystackRes.status === 400 || paystackRes.status === 404, // BIN lookup can fail with 400/404 but indicates connectivity and valid auth if not 401
        status: paystackRes.status,
        latencyMs: Date.now() - start,
        error: paystackRes.ok ? null : `HTTP Status ${paystackRes.status}`
      };
    } catch (err) {
      diagnostics.checks.paystack = {
        connected: false,
        error: err.message
      };
    }
  } else {
    diagnostics.checks.paystack = {
      connected: false,
      error: 'Cannot test: PAYSTACK_SECRET_KEY is not configured.'
    };
  }

  return res.status(200).json(diagnostics);
}
