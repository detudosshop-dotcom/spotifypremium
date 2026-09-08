// ==========================================
// 🔧 CONFIGURAÇÕES CENTRAIS UP1
// ==========================================

const CONFIG = {
    API: {
        WORKER_URL: '', // Vercel / mesmo domínio
        ENDPOINTS: {
            CREATE_PAYMENT: '/api/create-payment',
            CHECK_STATUS: '/api/check-status',
            WEBHOOK: '/api/webhook'
        }
    },
    TRACKING: {
        FACEBOOK_PIXEL_ID: '',
        CLARITY_ID: 'vf9o4hng1f',
        GOOGLE_ANALYTICS_ID: ''
    },
    PRODUTO: {
        nome: 'Verificação de Segurança',
        valor: 2772, // R$ 19,90
        valor_formatado: 'R$ 27,72',
        externalRef: 'up1_verificacao'
    },
    SALDO: {
        valor: '382,76',
        valor_formatado: 'R$ 382,76'
    },
    REDIRECTS: {
        pix: '/checkout/pix.html',
        obrigado: '/checkout/conclusao.html',
        erro: '../index.html',
        voltar: '../index.html'
    },
    BRANDING: {
        provider_name: 'Spotify',
        logo_color: 'rgb(30, 215, 96)',
        primary_color: 'rgb(1, 214, 97)',
        background: 'rgb(24, 24, 24)',
        card_background: 'rgb(0, 0, 0)'
    }
};

function getApiUrl(endpoint) {
    return (CONFIG.API.WORKER_URL || '') + endpoint;
}

function formatarMoeda(centavos) {
    return 'R$ ' + (centavos / 100).toFixed(2).replace('.', ',');
}
