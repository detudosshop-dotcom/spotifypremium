// Vercel Serverless Function & Local API Handler for SpeedPag
const https = require('https');

const SPEEDPAG_PUBLIC_KEY = process.env.SPEEDPAG_PUBLIC_KEY || 'pk_xD4JcLeU5cucVIXDNhSqrvjpgQZT-N4csyGtVBvEtT-6twjn';
const SPEEDPAG_SECRET_KEY = process.env.SPEEDPAG_SECRET_KEY || 'sk_FQTBtKJas_JAw1E2e2AZzCt3yGyV7IfblcSrnZHRCZmXruQb';
const AUTH_HEADER = 'Basic ' + Buffer.from(SPEEDPAG_PUBLIC_KEY + ':' + SPEEDPAG_SECRET_KEY).toString('base64');

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
  let amount = 999;
  if (rawAmount !== undefined && rawAmount !== null) {
    const s = String(rawAmount).trim();
    if (s.includes(',') || s.includes('.')) {
      const f = parseFloat(s.replace(',', '.'));
      if (!isNaN(f) && f > 0) amount = Math.round(f * 100);
    } else {
      const p = parseInt(s, 10);
      if (!isNaN(p)) {
        if (p >= 100) amount = p;
        else if (p === 9) amount = 999;
        else if (p === 19 || p === 20) amount = 1990;
        else if (p > 0) amount = Math.round(p * 100);
      }
    }
  }
  if (!amount || amount < 100) amount = 999;
  const produtoNome = body.produto || 'Prioridade Premium';

  const payload = JSON.stringify({
    amount: amount,
    paymentMethod: 'pix',
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
        unitPrice: amount,
        tangible: false
      }
    ],
    pix: {
      expiresInDays: 1
    }
  });

  const requestOptions = {
    hostname: 'api.speedpag.com.br',
    path: '/v1/transactions',
    method: 'POST',
    headers: {
      'Authorization': AUTH_HEADER,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  const speedpagReq = https.request(requestOptions, (speedpagRes) => {
    let data = '';
    speedpagRes.on('data', chunk => data += chunk);
    speedpagRes.on('end', () => {
      try {
        const json = JSON.parse(data);
        if (speedpagRes.statusCode >= 200 && speedpagRes.statusCode < 300 && json.id) {
          // Notificar UTMify de PIX Pendente (waiting_payment)
          try {
            const { sendUtmifyOrder } = require('./utmify');
            sendUtmifyOrder({
              orderId: json.id,
              status: 'waiting_payment',
              amount: json.amount,
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
              id: json.id,
              amount: json.amount,
              qr_code: json.pix?.qrcode || '',
              qr_code_base64: null,
              expiration_date: json.pix?.expirationDate || '',
              status: json.status
            }
          }));
        } else {
          console.error('SpeedPag error response:', data);
          res.statusCode = speedpagRes.statusCode || 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: false,
            error: json.message || 'Erro ao gerar Pix na SpeedPag',
            details: json
          }));
        }
      } catch (err) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, error: 'Erro ao processar resposta da adquirente' }));
      }
    });
  });

  speedpagReq.on('error', (err) => {
    console.error('SpeedPag request error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, error: err.message }));
  });

  speedpagReq.write(payload);
  speedpagReq.end();
}

module.exports = handler;
