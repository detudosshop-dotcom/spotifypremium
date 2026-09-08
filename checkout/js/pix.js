// Lógica da tela de pagamento Pix com SpeedPag
let pollingInterval = null;
let countdownInterval = null;
let txId = null;

document.addEventListener('DOMContentLoaded', () => {
    inicializarPix();
});

function inicializarPix() {
    // Obter dados da transação do localStorage ou URL
    const params = new URLSearchParams(window.location.search);
    txId = params.get('id') || localStorage.getItem('pix_txid');
    const pixCode = params.get('code') || params.get('qr_code') || localStorage.getItem('pix_code');
    const valor = params.get('valor') || localStorage.getItem('pix_valor') || '9,99';

    // Atualizar valor na tela
    const valorEl = document.getElementById('valorPix');
    if (valorEl) valorEl.innerText = `R$ ${valor}`;

    // Atualizar input copia e cola
    const codigoInput = document.getElementById('codigoPix');
    if (codigoInput && pixCode) {
        codigoInput.value = pixCode;
    }

    // Renderizar QR Code
    if (pixCode) {
        renderizarQrCode(pixCode);
    } else {
        console.warn('Código Pix não encontrado.');
    }

    // Iniciar contagem regressiva
    iniciarTimer(24 * 60 * 60); // 24 horas

    // Iniciar verificação automática (polling a cada 4 segundos)
    if (txId) {
        iniciarPolling(txId);
    }
}

function renderizarQrCode(texto) {
    const container = document.getElementById('qrcode');
    if (!container) return;
    container.innerHTML = '';

    // Usar QRCode.js se disponível
    if (typeof QRCode !== 'undefined') {
        const canvas = document.createElement('canvas');
        QRCode.toCanvas(canvas, texto, {
            width: 220,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        }, function (error) {
            if (!error) {
                container.appendChild(canvas);
            } else {
                renderizarFallbackQr(container, texto);
            }
        });
    } else {
        renderizarFallbackQr(container, texto);
    }
}

function renderizarFallbackQr(container, texto) {
    const img = document.createElement('img');
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(texto)}`;
    img.alt = 'QR Code Pix';
    img.style.borderRadius = '8px';
    img.style.maxWidth = '100%';
    container.appendChild(img);
}

function copiarCodigo() {
    const input = document.getElementById('codigoPix');
    if (!input || !input.value) return;

    input.select();
    input.setSelectionRange(0, 99999); // Para mobile

    navigator.clipboard.writeText(input.value).then(() => {
        mostrarFeedbackCopiado();
    }).catch(() => {
        document.execCommand('copy');
        mostrarFeedbackCopiado();
    });
}

function mostrarFeedbackCopiado() {
    const textSpan = document.querySelector('.btn-copiar-text');
    const successSpan = document.querySelector('.btn-copiar-success');
    if (textSpan && successSpan) {
        textSpan.style.display = 'none';
        successSpan.style.display = 'inline';
        setTimeout(() => {
            textSpan.style.display = 'inline';
            successSpan.style.display = 'none';
        }, 2500);
    }
}

function iniciarTimer(segundos) {
    let tempoRestante = segundos;
    const timerEl = document.getElementById('timer');
    if (!timerEl) return;

    function atualizar() {
        const h = Math.floor(tempoRestante / 3600);
        const m = Math.floor((tempoRestante % 3600) / 60);
        const s = tempoRestante % 60;
        timerEl.innerText = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        if (tempoRestante > 0) {
            tempoRestante--;
        } else {
            clearInterval(countdownInterval);
        }
    }

    atualizar();
    countdownInterval = setInterval(atualizar, 1000);
}

function iniciarPolling(id) {
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(() => {
        verificarStatusNaApi(id, false);
    }, 4000);
}

async function verificarStatusNaApi(id, exibirFeedbackManual = false) {
    try {
        const res = await fetch(`/api/check-status?id=${encodeURIComponent(id)}`);
        const data = await res.json();

        if (data.success && data.paid) {
            clearInterval(pollingInterval);
            const popup = document.getElementById('popupSucesso');
            if (popup) {
                popup.classList.add('ativo');
                popup.style.display = 'flex';
                setTimeout(irParaConfirmacao, 2500);
            } else {
                irParaConfirmacao();
            }
        } else if (exibirFeedbackManual) {
            abrirPopupErro();
        }
    } catch (e) {
        if (exibirFeedbackManual) abrirPopupErro();
    }
}

async function verificarPagamento() {
    const btn = document.getElementById('btnVerificar');
    const text = btn?.querySelector('.btn-text');
    const loader = btn?.querySelector('.btn-loader');

    if (text && loader) {
        text.style.display = 'none';
        loader.style.display = 'inline-block';
    }

    if (txId) {
        await verificarStatusNaApi(txId, true);
    } else {
        abrirPopupErro();
    }

    if (text && loader) {
        text.style.display = 'inline-block';
        loader.style.display = 'none';
    }
}

function irParaConfirmacao() {
    const params = new URLSearchParams(window.location.search);
    if (txId && !params.get('transacao_id')) {
        params.set('transacao_id', txId);
    }
    try {
        const dados = JSON.parse(localStorage.getItem('dados_cliente') || '{}');
        if (dados.nome && !params.get('nome')) params.set('nome', dados.nome);
        if (dados.email && !params.get('email')) params.set('email', dados.email);
        if (dados.telefone && !params.get('telefone')) params.set('telefone', dados.telefone);
        if (dados.pix && !params.get('pix')) params.set('pix', dados.pix);
    } catch(e) {}

    const qs = params.toString();
    window.location.href = qs ? ('obrigado.html?' + qs) : 'obrigado.html';
}

function abrirPopupErro() {
    const p = document.getElementById('popupErro');
    if (p) {
        p.classList.add('ativo');
        p.style.display = 'flex';
    }
}

function fecharPopup() {
    const p = document.getElementById('popupErro');
    if (p) {
        p.classList.remove('ativo');
        p.style.display = 'none';
    }
}
