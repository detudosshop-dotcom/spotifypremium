// ==========================================
// 🔧 CONFIGURAÇÕES CENTRAIS - EDITE AQUI
// ==========================================
// Este arquivo contém TODAS as configurações do checkout.
// Altere apenas este arquivo para atualizar todas as páginas.
// ==========================================

const CONFIG = {
    // ==========================================
    // API DO WORKER
    // ==========================================
    API: {
        WORKER_URL: '',
        ENDPOINTS: {
            CREATE_PAYMENT: '/api/create-payment',
            CHECK_STATUS: '/api/check-status',
            WEBHOOK: '/api/webhook'
        }
    },

    // ==========================================
    // RASTREAMENTO - PIXELS E ANALYTICS
    // ==========================================
    TRACKING: {
        // Facebook Pixel ID
        FACEBOOK_PIXEL_ID: '3060208564320322',
        
        // Microsoft Clarity ID
        CLARITY_ID: 'uem62uib5t',
        
        // Google Analytics ID (opcional)
        GOOGLE_ANALYTICS_ID: ''
    },

    // ==========================================
    // PRODUTO
    // ==========================================
    PRODUTO: {
        nome: 'Prioridade Premium',
        valor: 999, // em centavos (R$ 9,99)
        valor_formatado: 'R$ 9,99',
        externalRef: 'prioridade_premium'
    },

    // ==========================================
    // SALDO (para exibição)
    // ==========================================
    SALDO: {
        valor: '382,76',
        valor_formatado: 'R$ 382,76'
    },

    // ==========================================
    // REDIRECIONAMENTOS
    // ==========================================
    REDIRECTS: {
        pix: '/checkout/pix.html',
        obrigado: '/checkout/obrigado.html',
        erro: '/checkout/error.html',
        pending: '/checkout/pending.html',
        confirmar: '/checkout/confirmar.html'
    },

    // ==========================================
    // TEXTOS E BRANDING
    // ==========================================
    BRANDING: {
        provider_name: 'Cadastro Rapido',
        logo_color: 'rgb(30, 215, 96)',
        primary_color: 'rgb(1, 214, 97)',
        background: 'rgb(24, 24, 24)',
        card_background: 'rgb(0, 0, 0)'
    },

    // ==========================================
    // IMPERIUMPAY
    // ==========================================
    IMPERIUM: {
        pix_key: '58315936000191',
        expires_in_days: 1
    },

    // ==========================================
    // IPINFO (para captura de localização)
    // ==========================================
    IPINFO: {
        token: '08c92cfc72522b'
    }
};

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

// Obter URL completa da API
function getApiUrl(endpoint) {
    return CONFIG.API.WORKER_URL + endpoint;
}

// Formatar valor em centavos para moeda
function formatarMoeda(centavos) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(centavos / 100);
}

// ==========================================
// INICIALIZAÇÃO AUTOMÁTICA DE TRACKING
// ==========================================

// Inicializar Facebook Pixel
function initFacebookPixel() {
    if (!CONFIG.TRACKING.FACEBOOK_PIXEL_ID) return;
    
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    
    fbq('init', CONFIG.TRACKING.FACEBOOK_PIXEL_ID);
    fbq('track', 'PageView');
}

// Inicializar Microsoft Clarity
function initClarity() {
    if (!CONFIG.TRACKING.CLARITY_ID) return;
    
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", CONFIG.TRACKING.CLARITY_ID);
}

// Inicializar todos os trackings
function initTracking() {
    initFacebookPixel();
    initClarity();
}

// Auto-inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTracking);
} else {
    initTracking();
}

// Exportar para uso global
window.CONFIG = CONFIG;
window.getApiUrl = getApiUrl;
window.formatarMoeda = formatarMoeda;