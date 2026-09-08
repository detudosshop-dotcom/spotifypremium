// Vercel Serverless Function & Local API Handler for checking Pix status
const https = require('https');

const SPEEDPAG_PUBLIC_KEY = process.env.SPEEDPAG_PUBLIC_KEY || 'pk_xD4JcLeU5cucVIXDNhSqrvjpgQZT-N4csyGtVBvEtT-6twjn';
const SPEEDPAG_SECRET_KEY = process.env.SPEEDPAG_SECRET_KEY || 'sk_FQTBtKJas_JAw1E2e2AZzCt3yGyV7IfblcSrnZHRCZmXruQb';
const AUTH_HEADER = 'Basic ' + Buffer.from(SPEEDPAG_PUBLIC_KEY + ':' + SPEEDPAG_SECRET_KEY).toString('base64');

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
    hostname: 'api.speedpag.com.br',
    path: `/v1/transactions/${id}`,
    method: 'GET',
    headers: {
      'Authorization': AUTH_HEADER,
      'Content-Type': 'application/json'
    }
  };

  const speedpagReq = https.request(requestOptions, (speedpagRes) => {
    let data = '';
    speedpagRes.on('data', chunk => data += chunk);
    speedpagRes.on('end', () => {
      try {
        const json = JSON.parse(data);
        const status = json.status || 'waiting_payment';
        const isPaid = status === 'paid' || status === 'approved' || status === 'completed';

        // Se pago, notificar UTMify de PIX Pago (paid)
        if (isPaid) {
          try {
            const { sendUtmifyOrder } = require('./utmify');
            sendUtmifyOrder({
              orderId: json.id,
              status: 'paid',
              amount: json.amount,
              customer: {
                name: json.customer?.name,
                email: json.customer?.email,
                phone: json.customer?.phone,
                document: json.customer?.document?.number
              },
              approvedDate: json.paidAt ? json.paidAt.replace('T', ' ').substring(0, 19) : null
            }).catch(e => console.error('[UTMify] Error notifying paid:', e));
          } catch(e) {}
        }

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          success: true,
          status: status,
          paid: isPaid,
          data: {
            id: json.id,
            status: status,
            paidAt: json.paidAt,
            amount: json.amount
          }
        }));
      } catch (err) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, error: 'Erro ao analisar status da transação' }));
      }
    });
  });

  speedpagReq.on('error', (err) => {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, error: err.message }));
  });

  speedpagReq.end();
}

module.exports = handler;
