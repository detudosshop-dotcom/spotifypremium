// Vercel Serverless Function & Local API Handler for checking Pix status with FreePay Brasil
const https = require('https');

const FREEPAY_PUBLIC_KEY = process.env.FREEPAY_PUBLIC_KEY || Buffer.from('ZnJlZXBheV9saXZlXzA2MEpNMDRSUkxqSW9zSklwOU1IT3dXQjZJUDRqVVB5', 'base64').toString();
const FREEPAY_SECRET_KEY = process.env.FREEPAY_SECRET_KEY || Buffer.from('c2tfbGl2ZV8xVnpSOVhMR0R1VGFqbEZqdGlRYXVKWm9zRnhTbDZIMg==', 'base64').toString();
const AUTH_HEADER = 'Basic ' + Buffer.from(FREEPAY_PUBLIC_KEY + ':' + FREEPAY_SECRET_KEY).toString('base64');

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const id = parsedUrl.searchParams.get('id') || req.query?.id;

  if (!id) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, error: 'ID da transação não fornecido' }));
    return;
  }

  const requestOptions = {
    hostname: 'api.freepaybrasil.com',
    path: `/v1/payment-transaction/info/${encodeURIComponent(id)}`,
    method: 'GET',
    headers: {
      'Authorization': AUTH_HEADER,
      'Accept': 'application/json'
    }
  };

  const freepayReq = https.request(requestOptions, (freepayRes) => {
    let data = '';
    freepayRes.on('data', chunk => data += chunk);
    freepayRes.on('end', () => {
      try {
        const json = JSON.parse(data);
        const tx = json.data || json;
        const rawStatus = (tx.status || 'PENDING').toString();
        const upperStatus = rawStatus.toUpperCase();
        const isPaid = upperStatus === 'PAID' || upperStatus === 'APPROVED' || upperStatus === 'COMPLETED';

        let rawAmount = tx.amount;
        let amountInCents = typeof rawAmount === 'number' ? (rawAmount < 100 ? Math.round(rawAmount * 100) : rawAmount) : 1772;

        // Se pago, notificar UTMify de PIX Pago (paid)
        if (isPaid) {
          try {
            const { sendUtmifyOrder } = require('./utmify');
            const paidDate = (tx.paid_at && !tx.paid_at.startsWith('0001')) 
              ? tx.paid_at.replace('T', ' ').substring(0, 19) 
              : null;

            sendUtmifyOrder({
              orderId: tx.id || id,
              status: 'paid',
              amount: amountInCents,
              customer: {
                name: tx.customer?.name,
                email: tx.customer?.email,
                phone: tx.customer?.phone,
                document: tx.customer?.document?.number || tx.customer?.document
              },
              approvedDate: paidDate
            }).catch(e => console.error('[UTMify] Error notifying paid:', e));
          } catch(e) {}
        }

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          success: true,
          status: rawStatus,
          paid: isPaid,
          data: {
            id: tx.id || id,
            status: rawStatus,
            paidAt: tx.paid_at,
            amount: amountInCents
          }
        }));
      } catch (err) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, error: 'Erro ao analisar status da transação na FreePay' }));
      }
    });
  });

  freepayReq.on('error', (err) => {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, error: err.message }));
  });

  freepayReq.end();
}

module.exports = handler;
