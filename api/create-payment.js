// Vercel Serverless Function & Local API Handler for FreePay Brasil
const https = require('https');

const FREEPAY_PUBLIC_KEY = process.env.FREEPAY_PUBLIC_KEY || Buffer.from('ZnJlZXBheV9saXZlXzA2MEpNMDRSUkxqSW9zSklwOU1IT3dXQjZJUDRqVVB5', 'base64').toString();
const FREEPAY_SECRET_KEY = process.env.FREEPAY_SECRET_KEY || Buffer.from('c2tfbGl2ZV8xVnpSOVhMR0R1VGFqbEZqdGlRYXVKWm9zRnhTbDZIMg==', 'base64').toString();
const AUTH_HEADER = 'Basic ' + Buffer.from(FREEPAY_PUBLIC_KEY + ':' + FREEPAY_SECRET_KEY).toString('base64');

function generateValidCPF() {
  const rnd = (n) => Math.round(Math.random() * n);
  const mod = (dividend, divisor) => Math.round(dividend - Math.floor(dividend / divisor) * divisor);
  const n1 = rnd(9), n2 = rnd(9), n3 = rnd(9), n4 = rnd(9), n5 = rnd(9), n6 = rnd(9), n7 = rnd(9), n8 = rnd(9), n9 = rnd(9);
  let d1 = n9*2 + n8*3 + n7*4 + n6*5 + n5*6 + n4*7 + n3*8 + n2*9 + n1*10;
  d1 = 11 - mod(d1, 11);
  if (d1 >= 10) d1 = 0;
  let d2 = d1*2 + n9*3 + n8*4 + n7*5 + n6*6 + n5*7 + n4*8 + n3*9 + n2*10 + n1*11;
  d2 = 11 - mod(d2, 11);
  if (d2 >= 10) d2 = 0;
  return `${n1}${n2}${n3}${n4}${n5}${n6}${n7}${n8}${n9}${d1}${d2}`;
}

async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, error: 'Method Not Allowed' }));
    return;
  }

  // Parse body if not parsed
  let body = req.body;
  if (!body || typeof body === 'string') {
    try {
      body = JSON.parse(body || '{}');
    } catch (e) {
      body = {};
    }
  }

  const nome = (body.nome || body.name || 'Cliente Spotify').trim();
  let email = (body.email || 'cliente@email.com').trim();
  let cpf = (body.cpf || '').replace(/\D/g, '');
  if (!cpf || cpf.length !== 11) {
    cpf = generateValidCPF();
  }
  let telefone = (body.telefone || body.phone || '11999998888').replace(/\D/g, '');
  if (telefone.length < 10) telefone = '11999998888';

  let rawAmount = body.amount;
  let amount = 1772;
  if (rawAmount !== undefined && rawAmount !== null) {
    const s = String(rawAmount).trim();
    if (s.includes(',') || s.includes('.')) {
      const f = parseFloat(s.replace(',', '.'));
      if (!isNaN(f) && f > 0) amount = Math.round(f * 100);
    } else {
      const p = parseInt(s, 10);
      if (!isNaN(p)) {
        if (p >= 100) amount = p;
        else if (p === 9 || p === 17) amount = 1772;
        else if (p === 19 || p === 20 || p === 27) amount = 2772;
        else if (p === 1772) amount = 1772;
        else if (p === 2772) amount = 2772;
        else if (p > 0) amount = Math.round(p * 100);
      }
    }
  }
  if (!amount || amount < 100) amount = 1772;
  const produtoNome = body.produto || 'Prioridade Premium';

  const payload = JSON.stringify({
    amount: amount,
    payment_method: 'pix',
    postback_url: 'https://spotifypremium.vercel.app/api/webhook',
    customer: {
      name: nome,
      email: email,
      phone: telefone,
      document: {
        number: cpf,
        type: 'cpf'
      }
    },
    items: [
      {
        title: produtoNome,
        quantity: 1,
        unit_price: amount,
        tangible: false
      }
    ],
    pix: {
      expires_in_days: 1
    },
    metadata: {
      source: 'spotify_funnel',
      produto: produtoNome,
      utm_source: body.utm_source || body.src || '',
      utm_campaign: body.utm_campaign || '',
      sck: body.sck || ''
    }
  });

  const requestOptions = {
    hostname: 'api.freepaybrasil.com',
    path: '/v1/payment-transaction/create',
    method: 'POST',
    headers: {
      'Authorization': AUTH_HEADER,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  const freepayReq = https.request(requestOptions, (freepayRes) => {
    let data = '';
    freepayRes.on('data', chunk => data += chunk);
    freepayRes.on('end', () => {
      try {
        const json = JSON.parse(data);
        const tx = Array.isArray(json.data) ? json.data[0] : (json.data || json);
        const txId = tx?.id;
        const qrCode = (Array.isArray(tx?.pix) ? tx.pix[0]?.qr_code : tx?.pix?.qr_code) || '';
        const expirationDate = (Array.isArray(tx?.pix) ? tx.pix[0]?.expiration_date : tx?.pix?.expiration_date) || '';
        const txStatus = tx?.status || 'PENDING';
        let amountInCents = typeof tx?.amount === 'number' ? (tx.amount < 100 ? Math.round(tx.amount * 100) : tx.amount) : amount;

        if (freepayRes.statusCode >= 200 && freepayRes.statusCode < 300 && txId && qrCode) {
          // Notificar UTMify de PIX Pendente (waiting_payment)
          try {
            const { sendUtmifyOrder } = require('./utmify');
            sendUtmifyOrder({
              orderId: txId,
              status: 'waiting_payment',
              amount: amountInCents,
              customer: {
                name: nome,
                email: email,
                phone: telefone,
                document: cpf
              },
              tracking: {
                src: body.src || body.utm_source,
                sck: body.sck,
                utm_source: body.utm_source,
                utm_campaign: body.utm_campaign,
                utm_medium: body.utm_medium,
                utm_content: body.utm_content,
                utm_term: body.utm_term
              }
            }).catch(e => console.error('[UTMify] Error:', e));
          } catch(e) {}

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: true,
            data: {
              id: txId,
              amount: amountInCents,
              qr_code: qrCode,
              qr_code_base64: null,
              expiration_date: expirationDate,
              status: txStatus
            }
          }));
        } else {
          console.error('FreePay error response:', data);
          res.statusCode = freepayRes.statusCode || 400;
          res.setHeader('Content-Type', 'application/json');
          const errorMsg = (json.error_messages && json.error_messages.length > 0 ? json.error_messages.join(', ') : null) ||
                           (json.errors ? (Array.isArray(json.errors) ? json.errors.map(e => e.message || JSON.stringify(e)).join(', ') : JSON.stringify(json.errors)) : null) ||
                           json.message ||
                           'Erro ao gerar Pix na FreePay Brasil';
          res.end(JSON.stringify({
            success: false,
            error: errorMsg,
            details: json
          }));
        }
      } catch (err) {
        console.error('FreePay parse error:', err, data);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, error: 'Erro ao processar resposta da adquirente' }));
      }
    });
  });

  freepayReq.on('error', (err) => {
    console.error('FreePay request error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, error: err.message }));
  });

  freepayReq.write(payload);
  freepayReq.end();
}

module.exports = handler;
