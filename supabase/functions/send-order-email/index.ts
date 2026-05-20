import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

// Cors Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OrderItem {
  name: string;
  qty: number;
  size: string;
}

interface OrderRecord {
  id: string;
  customer: string;
  items: OrderItem[];
  total: number;
  date: string;
  status: string;
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: OrderRecord;
  old_record: OrderRecord | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("Missing RESEND_API_KEY environment variable.");
    }

    const payload: WebhookPayload = await req.json();
    const { type, record, old_record } = payload;

    console.log(`Processing webhook event: ${type} on orders table`);

    if (type === 'INSERT') {
      await handleNewOrder(record);
    } else if (type === 'UPDATE' && old_record) {
      if (old_record.status !== record.status) {
        await handleStatusChange(record, old_record.status);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Webhook executed successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("Webhook processing error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});

// Helper to parse Name & Email from customer string: "Name (email)"
function parseCustomer(customerStr: string) {
  const match = customerStr.match(/^(.*?)\s*\((.*?)\)$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return { name: customerStr, email: "" };
}

// Format items as a clean HTML table list
function formatItemsTable(items: OrderItem[]) {
  if (!items || !items.length) return "<p>No items found.</p>";
  
  let rows = items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #222; color: #fff;">${item.name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #222; color: #aaa; text-align: center;">${item.size}</td>
      <td style="padding: 12px; border-bottom: 1px solid #222; color: #aaa; text-align: center;">${item.qty}</td>
    </tr>
  `).join('');

  return `
    <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
      <thead>
        <tr style="background-color: #111;">
          <th style="padding: 12px; text-align: left; color: #ff3e3e; border-bottom: 2px solid #ff3e3e;">Item</th>
          <th style="padding: 12px; text-align: center; color: #ff3e3e; border-bottom: 2px solid #ff3e3e;">Size</th>
          <th style="padding: 12px; text-align: center; color: #ff3e3e; border-bottom: 2px solid #ff3e3e;">Qty</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

// Generate the beautiful VANTA brand wrapper HTML
function getVantaEmailWrapper(title: string, contentHtml: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
    </head>
    <body style="background-color: #050505; color: #ffffff; font-family: 'Courier New', Courier, monospace; margin: 0; padding: 40px 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #0b0b0b; border: 1px solid #1a1a1a; padding: 30px; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.8);">
        <!-- Logo Header -->
        <div style="text-align: center; border-bottom: 1px solid #1a1a1a; padding-bottom: 20px; margin-bottom: 25px;">
          <h1 style="color: #ff3e3e; font-size: 32px; letter-spacing: 6px; margin: 0; text-shadow: 0 0 10px rgba(255,62,62,0.3);">VANTA</h1>
          <p style="color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin: 5px 0 0 0;">Enter the Void</p>
        </div>
        
        <!-- Main Body -->
        <div style="line-height: 1.6; font-size: 14px;">
          ${contentHtml}
        </div>
        
        <!-- Footer -->
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #1a1a1a; text-align: center; color: #444; font-size: 11px;">
          <p>Logged in the secure ledger. Void transmissions only.</p>
          <p style="color: #ff3e3e; margin-top: 5px;">&copy; ${new Date().getFullYear()} VANTA. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const senderEmail = Deno.env.get('SENDER_EMAIL') || 'onboarding@resend.dev';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: `VANTA <${senderEmail}>`,
      to: [to],
      subject,
      html
    })
  });

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(`Resend API Error: ${JSON.stringify(resData)}`);
  }
  console.log(`Email successfully sent to ${to}. ID: ${resData.id}`);
  return resData;
}

// 1. Handle New Order Placement (Sends to customer & admin)
async function handleNewOrder(order: OrderRecord) {
  const { name, email } = parseCustomer(order.customer);
  if (!email) {
    console.warn("Could not parse email from customer field. Skipping customer notification.");
  }

  const itemsTable = formatItemsTable(order.items);

  // Customer Email HTML
  const customerHtml = getVantaEmailWrapper(
    "Order Logged",
    `
      <h2 style="color: #fff; font-size: 20px; margin-top: 0;">TRANSMISSION RECEIVED</h2>
      <p>Greetings, <strong>${name}</strong>.</p>
      <p>Your order has been recorded in the ledger. We will process your transmission shortly.</p>
      
      <div style="background-color: #111; padding: 15px; border-left: 3px solid #ff3e3e; margin: 20px 0;">
        <p style="margin: 0; font-size: 13px; color: #888;">Order Reference:</p>
        <p style="margin: 2px 0 0 0; font-size: 16px; font-weight: bold; color: #fff;">${order.id}</p>
        <p style="margin: 10px 0 0 0; font-size: 13px; color: #888;">Date Received:</p>
        <p style="margin: 2px 0 0 0; font-size: 14px; color: #fff;">${order.date}</p>
      </div>

      <h3 style="color: #fff; border-bottom: 1px solid #1a1a1a; padding-bottom: 8px;">Order Details</h3>
      ${itemsTable}
      
      <div style="text-align: right; margin-top: 20px; font-size: 16px;">
        <span style="color: #888;">Total Charged:</span>
        <strong style="color: #ff3e3e; font-size: 20px; margin-left: 10px;">₦${order.total.toLocaleString()}</strong>
      </div>
    `
  );

  // Admin Alert Email HTML
  const adminHtml = getVantaEmailWrapper(
    "New Order Logged",
    `
      <h2 style="color: #ff3e3e; font-size: 20px; margin-top: 0;">NEW DISPATCH REQUIRED</h2>
      <p>A new order has been logged by a guest in the system.</p>
      
      <div style="background-color: #111; padding: 15px; border-left: 3px solid #ff3e3e; margin: 20px 0;">
        <p style="margin: 0; font-size: 13px; color: #888;">Order ID:</p>
        <p style="margin: 2px 0 0 0; font-size: 16px; font-weight: bold; color: #fff;">${order.id}</p>
        <p style="margin: 10px 0 0 0; font-size: 13px; color: #888;">Customer Details:</p>
        <p style="margin: 2px 0 0 0; font-size: 14px; color: #fff;">${order.customer}</p>
      </div>

      <h3 style="color: #fff; border-bottom: 1px solid #1a1a1a; padding-bottom: 8px;">Items Ordered</h3>
      ${itemsTable}
      
      <div style="text-align: right; margin-top: 20px; font-size: 16px;">
        <span style="color: #888;">Order Value:</span>
        <strong style="color: #ff3e3e; font-size: 20px; margin-left: 10px;">₦${order.total.toLocaleString()}</strong>
      </div>
    `
  );

  // Trigger both emails
  const promises = [];
  if (email) {
    promises.push(sendEmail({
      to: email,
      subject: `Your VANTA Order has been recorded (${order.id})`,
      html: customerHtml
    }));
  }

  // Admin Notification Email
  promises.push(sendEmail({
    to: "admin@vanta.com", // You can substitute this with client's preferred admin mail
    subject: `[ADMIN ALERT] New Order Logged: ${order.id}`,
    html: adminHtml
  }));

  await Promise.all(promises);
}

// 2. Handle Status Changes (Shipped / Delivered updates)
async function handleStatusChange(order: OrderRecord, oldStatus: string) {
  const { name, email } = parseCustomer(order.customer);
  if (!email) {
    console.warn(`Could not parse email from customer field for order status update (${order.id}). Skipping email.`);
    return;
  }

  let subject = "";
  let heading = "";
  let message = "";
  let accentColor = "#ff3e3e";

  if (order.status === 'shipped') {
    subject = `Your VANTA Order has Shipped! (${order.id})`;
    heading = "DISPATCH CONFIRMED";
    message = "Your package has been successfully processed and discharged into the delivery lines. It is currently in transit.";
  } else if (order.status === 'delivered') {
    subject = `Your VANTA Order has been Delivered (${order.id})`;
    heading = "DELIVERY CONFIRMED";
    message = "Your package has arrived at its final destination coordinates. The transaction is complete.";
    accentColor = "#00e676"; // green accent for success/delivery
  } else {
    // Custom handling for other status transitions if needed (e.g. pending -> processing)
    return;
  }

  const statusHtml = getVantaEmailWrapper(
    heading,
    `
      <h2 style="color: #fff; font-size: 20px; margin-top: 0;">${heading}</h2>
      <p>Greetings, <strong>${name}</strong>.</p>
      <p>${message}</p>
      
      <div style="background-color: #111; padding: 15px; border-left: 3px solid ${accentColor}; margin: 20px 0;">
        <p style="margin: 0; font-size: 13px; color: #888;">Order ID:</p>
        <p style="margin: 2px 0 0 0; font-size: 16px; font-weight: bold; color: #fff;">${order.id}</p>
        <p style="margin: 10px 0 0 0; font-size: 13px; color: #888;">Previous Status:</p>
        <p style="margin: 2px 0 0 0; font-size: 14px; text-transform: uppercase; color: #aaa;">${oldStatus}</p>
        <p style="margin: 10px 0 0 0; font-size: 13px; color: #888;">Current Status:</p>
        <p style="margin: 2px 0 0 0; font-size: 14px; font-weight: bold; text-transform: uppercase; color: ${accentColor};">${order.status}</p>
      </div>

      <p style="font-size: 13px; color: #666; margin-top: 30px;">If you have any questions or queries regarding coordinates, reply directly to this mail transmission.</p>
    `
  );

  await sendEmail({
    to: email,
    subject,
    html: statusHtml
  });
}
