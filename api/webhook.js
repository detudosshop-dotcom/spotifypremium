// Webhook para receber notificações da FreePay Brasil e repassar à UTMify
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

  console.log('[Webhook FreePay] Event received:', JSON.stringify(body).slice(0, 300));

  const transaction = body.data || body;
  const id = transaction.Id || transaction.id;
  const rawStatus = (transaction.Status || transaction.status || '').toString();
  const upperStatus = rawStatus.toUpperCase();
  const isPaid = upperStatus === 'PAID' || upperStatus === 'APPROVED' || upperStatus === 'COMPLETED';

  if (id && isPaid) {
    try {
      let rawAmount = transaction.Amount !== undefined ? transaction.Amount : transaction.amount;
      let amountInCents = typeof rawAmount === 'number' ? (rawAmount < 100 ? Math.round(rawAmount * 100) : rawAmount) : 999;
      const rawPaidAt = transaction.PaidAt || transaction.paidAt || transaction.paid_at;
      const paidDate = (rawPaidAt && !rawPaidAt.startsWith('0001')) 
        ? rawPaidAt.replace('T', ' ').substring(0, 19) 
        : null;

      const customer = transaction.Customer || transaction.customer || {};
      const document = customer.Document || customer.document || {};

      await sendUtmifyOrder({
        orderId: id,
        status: 'paid',
        amount: amountInCents,
        customer: {
          name: customer.Name || customer.name,
          email: customer.Email || customer.email,
          phone: customer.Phone || customer.phone,
          document: document.Number || document.number || (typeof document === 'string' ? document : null)
        },
        approvedDate: paidDate
      });
      console.log(`[Webhook FreePay] Notified UTMify for transaction ${id} (paid)`);
    } catch (err) {
      console.error('[Webhook FreePay] Error notifying UTMify:', err.message);
    }
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ received: true }));
}

module.exports = handler;
