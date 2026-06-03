// =========================================================================
// VANTA Vercel Serverless Payment Verification Handler
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

  const { reference, amount } = req.body;
  if (!reference) {
    return res.status(400).json({ verified: false, message: 'Missing transaction reference.' });
  }

  const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
  if (!PAYSTACK_SECRET_KEY) {
    console.warn('[Verify Payment] PAYSTACK_SECRET_KEY is not defined. Bypassing verification for development.');
    return res.status(200).json({
      verified: true,
      message: 'Bypassed verification: PAYSTACK_SECRET_KEY is not configured.'
    });
  }

  try {
    console.log(`[Verify Payment] Querying Paystack API for reference: ${reference}`);
    const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const paystackData = await paystackRes.json();

    if (!paystackRes.ok || !paystackData.status) {
      console.error('[Verify Payment] Paystack API error response:', paystackData);
      return res.status(400).json({
        verified: false,
        message: paystackData.message || 'Failed to verify transaction with Paystack.'
      });
    }

    const txData = paystackData.data;

    // Check transaction status
    if (txData.status !== 'success') {
      console.warn(`[Verify Payment] Reference ${reference} is not successful. Status: ${txData.status}`);
      return res.status(200).json({
        verified: false,
        message: `Transaction status is ${txData.status}.`
      });
    }

    // Verify amount (Paystack amount is in kobo)
    if (amount && Math.abs(txData.amount - amount) > 1) {
      console.warn(`[Verify Payment] Reference ${reference} amount mismatch. Expected: ${amount}, Got: ${txData.amount}`);
      return res.status(200).json({
        verified: false,
        message: `Transaction amount mismatch.`
      });
    }

    console.log(`[Verify Payment] Reference ${reference} verified successfully.`);
    return res.status(200).json({
      verified: true,
      message: 'Payment verified successfully.'
    });
  } catch (error) {
    console.error('[Verify Payment] Internal verification error:', error);
    return res.status(500).json({ verified: false, message: 'Internal server error during verification: ' + error.message });
  }
}
