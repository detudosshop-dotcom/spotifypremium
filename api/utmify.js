// Helper para envio de pedidos e status à UTMify API
const https = require('https');

const UTMIFY_TOKEN = process.env.UTMIFY_TOKEN || 'FVCewCTST4jON2YWRwue5Cl0o4xzJETGKsOA';

/**
 * Envia ou atualiza uma transação na UTMify
 * @param {Object} params
 * @param {string|number} params.orderId - ID da transação
 * @param {string} params.status - 'waiting_payment' ou 'paid'
 * @param {number} params.amount - Valor em centavos (ex: 999)
 * @param {Object} params.customer - { name, email, phone, document }
 * @param {Object} params.tracking - UTMs { utm_source, utm_campaign, utm_medium, utm_content, utm_term, src, sck }
 * @param {string} [params.createdAt] - Data de criação YYYY-MM-DD HH:MM:SS
 * @param {string} [params.approvedDate] - Data de aprovação YYYY-MM-DD HH:MM:SS
 */
async function sendUtmifyOrder(params) {
  return new Promise((resolve) => {
    try {
      const nowFormatted = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const amount = parseInt(params.amount) || 999;
      const status = params.status === 'paid' ? 'paid' : 'waiting_payment';
      const approvedDate = status === 'paid' ? (params.approvedDate || nowFormatted) : null;

      const payload = JSON.stringify({
        orderId: String(params.orderId),
        platform: 'SpotifyPremium',
        paymentMethod: 'pix',
        status: status,
        createdAt: params.createdAt || nowFormatted,
        approvedDate: approvedDate,
        customer: {
          name: params.customer?.name || 'Cliente',
          email: params.customer?.email || 'cliente@email.com',
          phone: (params.customer?.phone || '11999998888').replace(/\D/g, ''),
          document: (params.customer?.document || '00000000191').replace(/\D/g, '')
        },
        products: [
          {
            id: 'prioridade_premium',
            name: 'Prioridade Premium',
            planId: 'prioridade_premium',
            planName: 'Prioridade Premium',
            quantity: 1,
            priceInCents: amount
          }
        ],
        commission: {
          totalPriceInCents: amount,
          gatewayFeeInCents: Math.round(amount * 0.05) + 100, // Estimativa taxa
          userCommissionInCents: amount - (Math.round(amount * 0.05) + 100)
        },
        trackingParameters: {
          src: params.tracking?.src || null,
          sck: params.tracking?.sck || null,
          utm_source: params.tracking?.utm_source || null,
          utm_campaign: params.tracking?.utm_campaign || null,
          utm_medium: params.tracking?.utm_medium || null,
          utm_content: params.tracking?.utm_content || null,
          utm_term: params.tracking?.utm_term || null
        },
        isTest: false
      });

      const req = https.request({
        hostname: 'api.utmify.com.br',
        path: '/api-credentials/orders',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-token': UTMIFY_TOKEN,
          'Content-Length': Buffer.byteLength(payload)
        }
      }, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          console.log(`[UTMify] Order ${params.orderId} (${status}) => Status: ${res.statusCode}`);
          resolve({ success: res.statusCode === 200, data });
        });
      });

      req.on('error', (err) => {
        console.error('[UTMify] Request error:', err.message);
        resolve({ success: false, error: err.message });
      });

      req.write(payload);
      req.end();
    } catch (err) {
      console.error('[UTMify] General error:', err.message);
      resolve({ success: false, error: err.message });
    }
  });
}

module.exports = { sendUtmifyOrder, UTMIFY_TOKEN };
