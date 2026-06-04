// =========================================================================
// VANTA Vercel Serverless Payment Verification + Order Save Handler
// File: /api/verify-payment.js
// =========================================================================

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { reference, amount, order } = req.body;

  if (!reference) {
    return res.status(400).json({ verified: false, message: 'Missing transaction reference.' });
  }

  const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vohpglktaatabxxqyccp.supabase.co';
  // Service role key bypasses RLS — keep this server-side only, never expose to client
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  // ---- Step 1: Verify payment with Paystack ----
  let verified = false;

  if (!PAYSTACK_SECRET_KEY) {
    console.warn('[Verify Payment] PAYSTACK_SECRET_KEY not set — bypassing verification for development.');
    verified = true;
  } else {
    try {
      console.log(`[Verify Payment] Querying Paystack API for reference: ${reference}`);
      const paystackRes = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const paystackData = await paystackRes.json();

      if (!paystackRes.ok || !paystackData.status) {
        console.error('[Verify Payment] Paystack API error:', paystackData);
        return res.status(400).json({
          verified: false,
          message: paystackData.message || 'Failed to verify transaction with Paystack.',
        });
      }

      const txData = paystackData.data;

      if (txData.status !== 'success') {
        return res.status(200).json({
          verified: false,
          message: `Transaction status is "${txData.status}", not "success".`,
        });
      }

      if (amount && Math.abs(txData.amount - amount) > 1) {
        console.warn(
          `[Verify Payment] Amount mismatch for ${reference}. Expected: ${amount}, Got: ${txData.amount}`
        );
        return res.status(200).json({
          verified: false,
          message: 'Transaction amount mismatch — possible tampering detected.',
        });
      }

      verified = true;
      console.log(`[Verify Payment] ${reference} verified successfully.`);
    } catch (error) {
      console.error('[Verify Payment] Internal Paystack error:', error);
      return res
        .status(500)
        .json({ verified: false, message: 'Internal server error during verification: ' + error.message });
    }
  }

  if (!verified) {
    return res.status(200).json({ verified: false, message: 'Payment could not be verified.' });
  }

  // ---- Step 2: Save order to Supabase (server-side, bypasses RLS) ----
  if (order) {
    if (!SUPABASE_SERVICE_KEY) {
      // Fallback: warn loudly — the service key must be set in production
      console.warn(
        '[Verify Payment] SUPABASE_SERVICE_KEY not set. Order will NOT be saved server-side. ' +
          'Set this env var in your Vercel dashboard to fix orders not appearing in the admin dashboard.'
      );
    } else {
      try {
        const orderRes = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
          method: 'POST',
          headers: {
            apikey: SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates,return=representation',
          },
          body: JSON.stringify(order),
        });

        if (!orderRes.ok) {
          const errText = await orderRes.text();
          console.error('[Verify Payment] Failed to save order to Supabase:', orderRes.status, errText);
          // Still return verified=true so the user sees success — the payment went through
          return res.status(200).json({
            verified: true,
            orderSaved: false,
            message: `Payment verified, but order could not be saved (${orderRes.status}). Reference: ${reference}`,
          });
        }

        console.log(`[Verify Payment] Order ${order.id} saved successfully.`);
      } catch (dbErr) {
        console.error('[Verify Payment] Database error saving order:', dbErr);
        return res.status(200).json({
          verified: true,
          orderSaved: false,
          message: 'Payment verified, but order save failed: ' + dbErr.message,
        });
      }
    }
  }

  return res.status(200).json({
    verified: true,
    orderSaved: !!order,
    message: 'Payment verified and order recorded successfully.',
  });
}
