// Webhook para receber notificações da SpeedPag e repassar à UTMify
const { sendUtmifyOrder } = require('./utmify');

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  let body = req.body;
  if (!body || typeof body === 'string') {
    try {
      body = JSON.parse(body || '{}');
    } catch (e) {
      body = {};
    }
  }

  console.log('[Webhook SpeedPag] Event received:', JSON.stringify(body).slice(0, 300));

  const transaction = body.data || body;
  const status = transaction.status;
  const id = transaction.id;

  if (id && (status === 'paid' || status === 'approved' || status === 'completed')) {
    try {
      await sendUtmifyOrder({
        orderId: id,
        status: 'paid',
        amount: transaction.amount || 999,
        customer: {
          name: transaction.customer?.name,
          email: transaction.customer?.email,
          phone: transaction.customer?.phone,
          document: transaction.customer?.document?.number
        },
        approvedDate: transaction.paidAt ? transaction.paidAt.replace('T', ' ').substring(0, 19) : null
      });
      console.log(`[Webhook SpeedPag] Notified UTMify for transaction ${id} (paid)`);
    } catch (err) {
      console.error('[Webhook SpeedPag] Error notifying UTMify:', err.message);
    }
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ received: true }));
}

module.exports = handler;
