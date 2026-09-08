// ==========================================
// PÁGINA PIX - IMPERIUMPAY
// Integração com Cloudflare Worker
// ==========================================
// CONFIGURAÇÕES CENTRALIZADAS EM: js/config.js
// Edite apenas o arquivo config.js para alterar todas as páginas
// ==========================================

// Estado da página
let estadoPix = {
    transacaoId: null,
    qrCode: null,
    expirationDate: null,
    amount: null,
    timerInterval: null,
    checkInterval: null
};

// ==========================================
// INICIALIZAÇÃO
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // Carregar dados da URL
    carregarDadosURL();
    
    // Se não tiver dados na URL, tentar localStorage
    if (!estadoPix.transacaoId) {
        carregarDadosLocalStorage();
    }
    
    // Se ainda não tiver dados, redirecionar para checkout
    if (!estadoPix.transacaoId) {
        window.location.href = 'index.html';
        return;
    }
    
    // Inicializar página
    const saldoParam = new URLSearchParams(window.location.search).get('saldo') || localStorage.getItem('saldo') || '382,76';
    const saldoEl = document.getElementById('saldoatual');
    if (saldoEl) saldoEl.textContent = 'Saldo: ' + (saldoParam.startsWith('R
});

// ==========================================
// CARREGAMENTO DE DADOS
// ==========================================

function carregarDadosURL() {
    const params = new URLSearchParams(window.location.search);
    
    estadoPix.transacaoId = params.get('id');
    estadoPix.qrCode = params.get('qr_code') || params.get('code');
    estadoPix.expirationDate = params.get('expiration');
    let rawAmount = params.get('amount') || params.get('valor');
    if (rawAmount) {
      const s = String(rawAmount).trim().replace(',', '.');
      const f = parseFloat(s);
      if (!isNaN(f)) estadoPix.amount = f < 100 ? Math.round(f * 100) : Math.round(f);
    }
    if (!estadoPix.amount || estadoPix.amount < 100) estadoPix.amount = 999;
    
    console.log('Dados carregados da URL:', {
        id: estadoPix.transacaoId,
        qr_code: estadoPix.qrCode ? 'presente' : 'ausente',
        expiration: estadoPix.expirationDate,
        amount: estadoPix.amount
    });
}

function carregarDadosLocalStorage() {
    // Tentar carregar dados gerados pelo confirmar.html
    const pixCode = localStorage.getItem('pix_code');
    const pixTxId = localStorage.getItem('pix_txid');
    const pixValor = localStorage.getItem('pix_valor');
    
    if (pixCode && pixTxId) {
        estadoPix.transacaoId = pixTxId;
        estadoPix.qrCode = pixCode;
        estadoPix.expirationDate = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutos
        estadoPix.amount = parseFloat(pixValor.replace(',', '.')) * 100; // Converter para centavos
        
        // Salvar no formato esperado pelo resto do código
        localStorage.setItem('transacao_atual', JSON.stringify({
            id: estadoPix.transacaoId,
            qrCode: estadoPix.qrCode,
            expirationDate: estadoPix.expirationDate,
            amount: estadoPix.amount
        }));
        
        console.log('Dados carregados do localStorage (pix_code):', {
            id: estadoPix.transacaoId,
            qr_code: 'presente',
            amount: estadoPix.amount
        });
        return;
    }
    
    // Fallback: formato antigo
    const transacao = localStorage.getItem('transacao_atual');
    if (transacao) {
        const dados = JSON.parse(transacao);
        estadoPix.transacaoId = dados.id;
        estadoPix.qrCode = dados.qrCode;
        estadoPix.expirationDate = dados.expirationDate;
        estadoPix.amount = dados.amount;
    }
}

// ==========================================
// INICIALIZAÇÃO DA PÁGINA
// ==========================================

function inicializarPagina() {
    // Exibir valor
    document.getElementById('valorPix').textContent = formatarMoeda(estadoPix.amount);
    
    // Gerar QR Code
    gerarQRCode(estadoPix.qrCode);
    
    // Preencher código Pix
    document.getElementById('codigoPix').value = estadoPix.qrCode;
    
    // Iniciar timer
    iniciarTimer();
    
    // Iniciar verificação automática
    iniciarVerificacaoAutomatica();
}

// ==========================================
// QR CODE
// ==========================================

function gerarQRCode(codigo) {
    const container = document.getElementById('qrcode');
    
    // Limpar container
    container.innerHTML = '';
    
    // Usar API externa para gerar QR Code (mais confiável)
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(codigo)}`;
    
    const img = document.createElement('img');
    img.src = qrImageUrl;
    img.alt = 'QR Code Pix';
    img.style.width = '200px';
    img.style.height = '200px';
    img.style.borderRadius = '8px';
    
    img.onerror = function() {
        // Fallback: tentar biblioteca local
        if (typeof QRCode !== 'undefined') {
            QRCode.toCanvas(codigo, {
                width: 200,
                height: 200,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#ffffff'
                }
            }, (error, canvas) => {
                if (error) {
                    console.error('Erro ao gerar QR Code:', error);
                    container.innerHTML = `<p style="font-size:10px;word-break:break-all;padding:10px;">${codigo}</p>`;
                    return;
                }
                container.innerHTML = '';
                container.appendChild(canvas);
            });
        } else {
            // Fallback final: mostrar código como texto
            container.innerHTML = `<p style="font-size:10px;word-break:break-all;padding:10px;background:#fff;color:#000;">${codigo}</p>`;
        }
    };
    
    container.appendChild(img);
}

// ==========================================
// COPIAR CÓDIGO
// ==========================================

function copiarCodigo() {
    const codigo = document.getElementById('codigoPix').value;
    
    navigator.clipboard.writeText(codigo).then(() => {
        // Feedback visual
        const btn = document.getElementById('btnCopiar');
        const textNormal = btn.querySelector('.btn-copiar-text');
        const textSuccess = btn.querySelector('.btn-copiar-success');
        
        textNormal.style.display = 'none';
        textSuccess.style.display = 'inline';
        btn.classList.add('copiado');
        
        // Voltar ao normal após 3 segundos
        setTimeout(() => {
            textNormal.style.display = 'inline';
            textSuccess.style.display = 'none';
            btn.classList.remove('copiado');
        }, 3000);
    }).catch(err => {
        console.error('Erro ao copiar:', err);
        // Fallback para navegadores antigos
        const input = document.getElementById('codigoPix');
        input.select();
        document.execCommand('copy');
    });
}

// ==========================================
// TIMER DE EXPIRAÇÃO
// ==========================================

function iniciarTimer() {
    atualizarTimer();
    estadoPix.timerInterval = setInterval(atualizarTimer, 1000);
}

function atualizarTimer() {
    // Tratar diferentes formatos de data
    let expiration;
    let usarTimerPadrao = false;
    
    try {
        // Se já é um objeto Date válido
        if (estadoPix.expirationDate instanceof Date) {
            expiration = estadoPix.expirationDate;
        } 
        // Se é string ISO (2026-05-04T21:37:52.7812798+00:00)
        else if (typeof estadoPix.expirationDate === 'string' && estadoPix.expirationDate.length > 0) {
            // Tratar formato ISO com timezone
            // Remover milissegundos extras e garantir formato válido
            let dateStr = estadoPix.expirationDate;
            
            // Se tem formato com +00:00, o JavaScript deve interpretar corretamente
            expiration = new Date(dateStr);
            
            // Verificar se a data é válida
            if (isNaN(expiration.getTime())) {
                console.log('Data inválida, usando timer padrão');
                usarTimerPadrao = true;
            }
        }
        // Se é timestamp em milissegundos
        else if (typeof estadoPix.expirationDate === 'number') {
            expiration = new Date(estadoPix.expirationDate);
        }
        else {
            console.log('Formato de data não reconhecido, usando timer padrão');
            usarTimerPadrao = true;
        }
    } catch (error) {
        console.error('Erro ao processar data:', error);
        usarTimerPadrao = true;
    }
    
    // Se deve usar timer padrão, definir 10 minutos a partir de agora
    if (usarTimerPadrao) {
        expiration = new Date(Date.now() + 10 * 60 * 1000);
        // Salvar nova expiração
        estadoPix.expirationDate = expiration.toISOString();
    }
    
    const now = new Date();
    const diff = expiration - now;
    
    // Só logar a cada 10 segundos para não poluir console
    if (now.getSeconds() % 10 === 0) {
        console.log('Timer - Expiration:', expiration.toLocaleTimeString(), 'Now:', now.toLocaleTimeString(), 'Diff:', Math.floor(diff/1000), 'segundos');
    }
    
    if (diff <= 0) {
        // Expirado - mostrar botão para reiniciar
        clearInterval(estadoPix.timerInterval);
        const timerElement = document.getElementById('timer');
        timerElement.innerHTML = '<button onclick="reiniciarTimer()" class="btn-reiniciar">Liberar Agora</button>';
        timerElement.classList.add('urgente');
        return;
    }
    
    // Calcular horas, minutos, segundos
    const horas = Math.floor(diff / (1000 * 60 * 60));
    const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const segundos = Math.floor((diff % (1000 * 60)) / 1000);
    
    // Formatar e exibir
    const timerElement = document.getElementById('timer');
    timerElement.textContent = `${pad(horas)}:${pad(minutos)}:${pad(segundos)}`;
    
    // Adicionar classe de urgência se menos de 5 minutos
    if (diff < 5 * 60 * 1000) {
        timerElement.classList.add('urgente');
    }
}

function pad(num) {
    return num.toString().padStart(2, '0');
}

// ==========================================
// REINICIAR TIMER
// ==========================================

function reiniciarTimer() {
    // Definir nova expiração de 10 minutos
    const novaExpiracao = new Date(Date.now() + 10 * 60 * 1000);
    estadoPix.expirationDate = novaExpiracao.toISOString();
    
    // Remover classe de urgência
    document.getElementById('timer').classList.remove('urgente');
    
    // Reiniciar timer
    iniciarTimer();
    
    console.log('Timer reiniciado - Nova expiração:', novaExpiracao.toLocaleTimeString());
}

// ==========================================
// VERIFICAÇÃO DE PAGAMENTO
// ==========================================

function iniciarVerificacaoAutomatica() {
    // Verificar a cada 60 segundos (1 minuto)
    estadoPix.checkInterval = setInterval(verificarPagamentoAutomatico, 4000);
    
    // Primeira verificação após 5 segundos
    setTimeout(verificarPagamentoAutomatico, 5000);
}

async function verificarPagamentoAutomatico() {
    try {
        const resultado = await consultarStatusTransacao();
        
        // Status da ImperiumPay: PAGO, PENDENTE, CANCELADO, RECUSADO, etc.
        if (resultado.status === 'PAID' || resultado.status === 'PAGO' || resultado.status === 'paid' || resultado.status === 'approved' || resultado.status === 'completed' || resultado.paid) {
            // Pagamento confirmado!
            clearInterval(estadoPix.checkInterval);
            clearInterval(estadoPix.timerInterval);
            
            // Atualizar UI
            atualizarStatusPago();
            
            // Mostrar popup de sucesso
            setTimeout(() => {
                document.getElementById('popupSucesso').style.display = 'flex';
            }, 500);
        } else if (resultado.status === 'EXPIRED' || resultado.status === 'CANCELADO' || resultado.status === 'RECUSADO') {
            // Pagamento expirado ou recusado
            clearInterval(estadoPix.checkInterval);
            clearInterval(estadoPix.timerInterval);
        }
        // Se for PENDING ou ERROR, continua verificando silenciosamente
    } catch (error) {
        console.error('Erro na verificação automática:', error);
    }
}

async function verificarPagamento() {
    const btn = document.getElementById('btnVerificar');
    const btnText = btn.querySelector('.btn-text');
    const btnLoader = btn.querySelector('.btn-loader');
    
    // Mostrar loading
    btn.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'flex';
    
    try {
        const resultado = await consultarStatusTransacao();
        
        // Status da ImperiumPay: PAGO, PENDENTE, CANCELADO, RECUSADO, etc.
        if (resultado.status === 'PAID' || resultado.status === 'PAGO' || resultado.status === 'paid' || resultado.status === 'approved' || resultado.status === 'completed' || resultado.paid) {
            // Pagamento confirmado!
            clearInterval(estadoPix.checkInterval);
            clearInterval(estadoPix.timerInterval);
            
            // Atualizar UI
            atualizarStatusPago();
            
            // Mostrar popup de sucesso
            document.getElementById('popupSucesso').style.display = 'flex';
        } else if (resultado.status === 'PENDING' || resultado.status === 'PENDENTE') {
            // Ainda pendente
            mostrarErro('Ainda não identificamos seu pagamento. Aguarde alguns instantes e tente novamente.');
        } else if (resultado.status === 'EXPIRED') {
            mostrarErro('O código Pix expirou. Por favor, inicie um novo pagamento.');
        } else if (resultado.status === 'NOT_FOUND') {
            mostrarErro('Transação não encontrada. Verifique se o pagamento foi processado corretamente.');
        } else {
            mostrarErro(`Status: ${resultado.status}. Tente novamente em alguns instantes.`);
        }
    } catch (error) {
        console.error('Erro ao verificar:', error);
        mostrarErro('Erro ao verificar pagamento. Tente novamente.');
    } finally {
        // Esconder loading
        btn.disabled = false;
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
    }
}

async function consultarStatusTransacao() {
    try {
        const response = await fetch(
            `${getApiUrl(CONFIG.API.ENDPOINTS.CHECK_STATUS)}?id=${estadoPix.transacaoId}`,
            {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            }
        );
        
        // Se 404, transação não encontrada
        if (response.status === 404) {
            console.log('Transação não encontrada na API');
            return { status: 'NOT_FOUND', error: 'Transação não encontrada' };
        }
        
        const data = await response.json();
        
        if (data.success && data.data) {
            return { status: data.data.status, data: data.data };
        }
        
        return { status: data.error || 'ERROR', error: data.error };
    } catch (error) {
        console.error('Erro na consulta:', error);
        return { status: 'ERROR', error: error.message };
    }
}

// ==========================================
// ATUALIZAÇÃO DE UI
// ==========================================

function atualizarStatusPago() {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');
    const statusInfo = document.querySelector('.status-info');
    
    statusDot.classList.remove('pulse');
    statusDot.classList.add('pago');
    statusText.textContent = 'Pagamento confirmado!';
    statusText.style.color = 'rgb(1, 214, 97)';
    statusInfo.textContent = 'Redirecionando...';
    
    // Salvar status no localStorage
    const transacao = JSON.parse(localStorage.getItem('transacao_atual') || '{}');
    transacao.status = 'PAID';
    transacao.pagoEm = new Date().toISOString();
    localStorage.setItem('transacao_atual', JSON.stringify(transacao));
}

// ==========================================
// NAVEGAÇÃO
// ==========================================

function irParaConfirmacao() {
    // Redirecionar para página de obrigado com parâmetros
    const transacao = JSON.parse(localStorage.getItem('transacao_atual') || '{}');
    const dadosCliente = JSON.parse(localStorage.getItem('dados_cliente') || '{}');
    
    const params = new URLSearchParams({
        nome: dadosCliente.nome || '',
        email: dadosCliente.email || '',
        telefone: dadosCliente.telefone || '',
        transacao_id: transacao.id || '',
        utm_source: localStorage.getItem('utm_source') || '',
        utm_medium: localStorage.getItem('utm_medium') || '',
        utm_campaign: localStorage.getItem('utm_campaign') || '',
        utm_term: localStorage.getItem('utm_term') || '',
        utm_content: localStorage.getItem('utm_content') || ''
    });
    
    window.location.href = '/checkout/obrigado.html?' + params.toString();
}

// ==========================================
// POPUP
// ==========================================

function mostrarErro(mensagem) {
    // Se a mensagem for um JSON, extrair apenas a mensagem relevante
    if (typeof mensagem === 'string' && mensagem.startsWith('{')) {
        try {
            const json = JSON.parse(mensagem);
            if (json.error) {
                mensagem = json.error;
            } else if (json.message) {
                mensagem = json.message;
            } else {
                mensagem = 'Erro ao processar pagamento. Tente novamente.';
            }
        } catch (e) {
            // Se não for JSON válido, usar mensagem padrão
            mensagem = 'Erro ao processar pagamento. Tente novamente.';
        }
    }
    
    document.getElementById('mensagemErro').textContent = mensagem;
    document.getElementById('popupErro').style.display = 'flex';
}

function fecharPopup() {
    document.getElementById('popupErro').style.display = 'none';
}

// ==========================================
// ABAS DOS BANCOS
// ==========================================

function initBankTabs() {
    const tabs = document.querySelectorAll('.bank-tab');
    const panels = document.querySelectorAll('.bank-panel');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remover active de todas as abas
            tabs.forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            
            // Remover active de todos os painéis
            panels.forEach(p => p.classList.remove('active'));
            
            // Adicionar active na aba clicada
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');
            
            // Mostrar painel correspondente
            const panelId = tab.getAttribute('aria-controls');
            const panel = document.getElementById(panelId);
            if (panel) {
                panel.classList.add('active');
            }
        });
    });
}

// Inicializar abas quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    initBankTabs();
});

// ==========================================
// CLEANUP
// ==========================================

window.addEventListener('beforeunload', () => {
    if (estadoPix.timerInterval) clearInterval(estadoPix.timerInterval);
    if (estadoPix.checkInterval) clearInterval(estadoPix.checkInterval);
});) ? saldoParam : ('R$ ' + saldoParam));
    inicializarPagina();
});

// ==========================================
// CARREGAMENTO DE DADOS
// ==========================================

function carregarDadosURL() {
    const params = new URLSearchParams(window.location.search);
    
    estadoPix.transacaoId = params.get('id');
    estadoPix.qrCode = params.get('qr_code') || params.get('code');
    estadoPix.expirationDate = params.get('expiration');
    let rawAmount = params.get('amount') || params.get('valor');
    if (rawAmount) {
      const s = String(rawAmount).trim().replace(',', '.');
      const f = parseFloat(s);
      if (!isNaN(f)) estadoPix.amount = f < 100 ? Math.round(f * 100) : Math.round(f);
    }
    if (!estadoPix.amount || estadoPix.amount < 100) estadoPix.amount = 999;
    
    console.log('Dados carregados da URL:', {
        id: estadoPix.transacaoId,
        qr_code: estadoPix.qrCode ? 'presente' : 'ausente',
        expiration: estadoPix.expirationDate,
        amount: estadoPix.amount
    });
}

function carregarDadosLocalStorage() {
    // Tentar carregar dados gerados pelo confirmar.html
    const pixCode = localStorage.getItem('pix_code');
    const pixTxId = localStorage.getItem('pix_txid');
    const pixValor = localStorage.getItem('pix_valor');
    
    if (pixCode && pixTxId) {
        estadoPix.transacaoId = pixTxId;
        estadoPix.qrCode = pixCode;
        estadoPix.expirationDate = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutos
        estadoPix.amount = parseFloat(pixValor.replace(',', '.')) * 100; // Converter para centavos
        
        // Salvar no formato esperado pelo resto do código
        localStorage.setItem('transacao_atual', JSON.stringify({
            id: estadoPix.transacaoId,
            qrCode: estadoPix.qrCode,
            expirationDate: estadoPix.expirationDate,
            amount: estadoPix.amount
        }));
        
        console.log('Dados carregados do localStorage (pix_code):', {
            id: estadoPix.transacaoId,
            qr_code: 'presente',
            amount: estadoPix.amount
        });
        return;
    }
    
    // Fallback: formato antigo
    const transacao = localStorage.getItem('transacao_atual');
    if (transacao) {
        const dados = JSON.parse(transacao);
        estadoPix.transacaoId = dados.id;
        estadoPix.qrCode = dados.qrCode;
        estadoPix.expirationDate = dados.expirationDate;
        estadoPix.amount = dados.amount;
    }
}

// ==========================================
// INICIALIZAÇÃO DA PÁGINA
// ==========================================

function inicializarPagina() {
    // Exibir valor
    document.getElementById('valorPix').textContent = formatarMoeda(estadoPix.amount);
    
    // Gerar QR Code
    gerarQRCode(estadoPix.qrCode);
    
    // Preencher código Pix
    document.getElementById('codigoPix').value = estadoPix.qrCode;
    
    // Iniciar timer
    iniciarTimer();
    
    // Iniciar verificação automática
    iniciarVerificacaoAutomatica();
}

// ==========================================
// QR CODE
// ==========================================

function gerarQRCode(codigo) {
    const container = document.getElementById('qrcode');
    
    // Limpar container
    container.innerHTML = '';
    
    // Usar API externa para gerar QR Code (mais confiável)
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(codigo)}`;
    
    const img = document.createElement('img');
    img.src = qrImageUrl;
    img.alt = 'QR Code Pix';
    img.style.width = '200px';
    img.style.height = '200px';
    img.style.borderRadius = '8px';
    
    img.onerror = function() {
        // Fallback: tentar biblioteca local
        if (typeof QRCode !== 'undefined') {
            QRCode.toCanvas(codigo, {
                width: 200,
                height: 200,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#ffffff'
                }
            }, (error, canvas) => {
                if (error) {
                    console.error('Erro ao gerar QR Code:', error);
                    container.innerHTML = `<p style="font-size:10px;word-break:break-all;padding:10px;">${codigo}</p>`;
                    return;
                }
                container.innerHTML = '';
                container.appendChild(canvas);
            });
        } else {
            // Fallback final: mostrar código como texto
            container.innerHTML = `<p style="font-size:10px;word-break:break-all;padding:10px;background:#fff;color:#000;">${codigo}</p>`;
        }
    };
    
    container.appendChild(img);
}

// ==========================================
// COPIAR CÓDIGO
// ==========================================

function copiarCodigo() {
    const codigo = document.getElementById('codigoPix').value;
    
    navigator.clipboard.writeText(codigo).then(() => {
        // Feedback visual
        const btn = document.getElementById('btnCopiar');
        const textNormal = btn.querySelector('.btn-copiar-text');
        const textSuccess = btn.querySelector('.btn-copiar-success');
        
        textNormal.style.display = 'none';
        textSuccess.style.display = 'inline';
        btn.classList.add('copiado');
        
        // Voltar ao normal após 3 segundos
        setTimeout(() => {
            textNormal.style.display = 'inline';
            textSuccess.style.display = 'none';
            btn.classList.remove('copiado');
        }, 3000);
    }).catch(err => {
        console.error('Erro ao copiar:', err);
        // Fallback para navegadores antigos
        const input = document.getElementById('codigoPix');
        input.select();
        document.execCommand('copy');
    });
}

// ==========================================
// TIMER DE EXPIRAÇÃO
// ==========================================

function iniciarTimer() {
    atualizarTimer();
    estadoPix.timerInterval = setInterval(atualizarTimer, 1000);
}

function atualizarTimer() {
    // Tratar diferentes formatos de data
    let expiration;
    let usarTimerPadrao = false;
    
    try {
        // Se já é um objeto Date válido
        if (estadoPix.expirationDate instanceof Date) {
            expiration = estadoPix.expirationDate;
        } 
        // Se é string ISO (2026-05-04T21:37:52.7812798+00:00)
        else if (typeof estadoPix.expirationDate === 'string' && estadoPix.expirationDate.length > 0) {
            // Tratar formato ISO com timezone
            // Remover milissegundos extras e garantir formato válido
            let dateStr = estadoPix.expirationDate;
            
            // Se tem formato com +00:00, o JavaScript deve interpretar corretamente
            expiration = new Date(dateStr);
            
            // Verificar se a data é válida
            if (isNaN(expiration.getTime())) {
                console.log('Data inválida, usando timer padrão');
                usarTimerPadrao = true;
            }
        }
        // Se é timestamp em milissegundos
        else if (typeof estadoPix.expirationDate === 'number') {
            expiration = new Date(estadoPix.expirationDate);
        }
        else {
            console.log('Formato de data não reconhecido, usando timer padrão');
            usarTimerPadrao = true;
        }
    } catch (error) {
        console.error('Erro ao processar data:', error);
        usarTimerPadrao = true;
    }
    
    // Se deve usar timer padrão, definir 10 minutos a partir de agora
    if (usarTimerPadrao) {
        expiration = new Date(Date.now() + 10 * 60 * 1000);
        // Salvar nova expiração
        estadoPix.expirationDate = expiration.toISOString();
    }
    
    const now = new Date();
    const diff = expiration - now;
    
    // Só logar a cada 10 segundos para não poluir console
    if (now.getSeconds() % 10 === 0) {
        console.log('Timer - Expiration:', expiration.toLocaleTimeString(), 'Now:', now.toLocaleTimeString(), 'Diff:', Math.floor(diff/1000), 'segundos');
    }
    
    if (diff <= 0) {
        // Expirado - mostrar botão para reiniciar
        clearInterval(estadoPix.timerInterval);
        const timerElement = document.getElementById('timer');
        timerElement.innerHTML = '<button onclick="reiniciarTimer()" class="btn-reiniciar">Liberar Agora</button>';
        timerElement.classList.add('urgente');
        return;
    }
    
    // Calcular horas, minutos, segundos
    const horas = Math.floor(diff / (1000 * 60 * 60));
    const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const segundos = Math.floor((diff % (1000 * 60)) / 1000);
    
    // Formatar e exibir
    const timerElement = document.getElementById('timer');
    timerElement.textContent = `${pad(horas)}:${pad(minutos)}:${pad(segundos)}`;
    
    // Adicionar classe de urgência se menos de 5 minutos
    if (diff < 5 * 60 * 1000) {
        timerElement.classList.add('urgente');
    }
}

function pad(num) {
    return num.toString().padStart(2, '0');
}

// ==========================================
// REINICIAR TIMER
// ==========================================

function reiniciarTimer() {
    // Definir nova expiração de 10 minutos
    const novaExpiracao = new Date(Date.now() + 10 * 60 * 1000);
    estadoPix.expirationDate = novaExpiracao.toISOString();
    
    // Remover classe de urgência
    document.getElementById('timer').classList.remove('urgente');
    
    // Reiniciar timer
    iniciarTimer();
    
    console.log('Timer reiniciado - Nova expiração:', novaExpiracao.toLocaleTimeString());
}

// ==========================================
// VERIFICAÇÃO DE PAGAMENTO
// ==========================================

function iniciarVerificacaoAutomatica() {
    // Verificar a cada 60 segundos (1 minuto)
    estadoPix.checkInterval = setInterval(verificarPagamentoAutomatico, 60000);
    
    // Primeira verificação após 5 segundos
    setTimeout(verificarPagamentoAutomatico, 5000);
}

async function verificarPagamentoAutomatico() {
    try {
        const resultado = await consultarStatusTransacao();
        
        // Status da ImperiumPay: PAGO, PENDENTE, CANCELADO, RECUSADO, etc.
        if (resultado.status === 'PAID' || resultado.status === 'PAGO') {
            // Pagamento confirmado!
            clearInterval(estadoPix.checkInterval);
            clearInterval(estadoPix.timerInterval);
            
            // Atualizar UI
            atualizarStatusPago();
            
            // Mostrar popup de sucesso
            setTimeout(() => {
                document.getElementById('popupSucesso').style.display = 'flex';
            }, 500);
        } else if (resultado.status === 'EXPIRED' || resultado.status === 'CANCELADO' || resultado.status === 'RECUSADO') {
            // Pagamento expirado ou recusado
            clearInterval(estadoPix.checkInterval);
            clearInterval(estadoPix.timerInterval);
        }
        // Se for PENDING ou ERROR, continua verificando silenciosamente
    } catch (error) {
        console.error('Erro na verificação automática:', error);
    }
}

async function verificarPagamento() {
    const btn = document.getElementById('btnVerificar');
    const btnText = btn.querySelector('.btn-text');
    const btnLoader = btn.querySelector('.btn-loader');
    
    // Mostrar loading
    btn.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'flex';
    
    try {
        const resultado = await consultarStatusTransacao();
        
        // Status da ImperiumPay: PAGO, PENDENTE, CANCELADO, RECUSADO, etc.
        if (resultado.status === 'PAID' || resultado.status === 'PAGO') {
            // Pagamento confirmado!
            clearInterval(estadoPix.checkInterval);
            clearInterval(estadoPix.timerInterval);
            
            // Atualizar UI
            atualizarStatusPago();
            
            // Mostrar popup de sucesso
            document.getElementById('popupSucesso').style.display = 'flex';
        } else if (resultado.status === 'PENDING' || resultado.status === 'PENDENTE') {
            // Ainda pendente
            mostrarErro('Ainda não identificamos seu pagamento. Aguarde alguns instantes e tente novamente.');
        } else if (resultado.status === 'EXPIRED') {
            mostrarErro('O código Pix expirou. Por favor, inicie um novo pagamento.');
        } else if (resultado.status === 'NOT_FOUND') {
            mostrarErro('Transação não encontrada. Verifique se o pagamento foi processado corretamente.');
        } else {
            mostrarErro(`Status: ${resultado.status}. Tente novamente em alguns instantes.`);
        }
    } catch (error) {
        console.error('Erro ao verificar:', error);
        mostrarErro('Erro ao verificar pagamento. Tente novamente.');
    } finally {
        // Esconder loading
        btn.disabled = false;
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
    }
}

async function consultarStatusTransacao() {
    try {
        const response = await fetch(
            `${getApiUrl(CONFIG.API.ENDPOINTS.CHECK_STATUS)}?id=${estadoPix.transacaoId}`,
            {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            }
        );
        
        // Se 404, transação não encontrada
        if (response.status === 404) {
            console.log('Transação não encontrada na API');
            return { status: 'NOT_FOUND', error: 'Transação não encontrada' };
        }
        
        const data = await response.json();
        
        if (data.success && data.data) {
            return { status: data.data.status, data: data.data };
        }
        
        return { status: data.error || 'ERROR', error: data.error };
    } catch (error) {
        console.error('Erro na consulta:', error);
        return { status: 'ERROR', error: error.message };
    }
}

// ==========================================
// ATUALIZAÇÃO DE UI
// ==========================================

function atualizarStatusPago() {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');
    const statusInfo = document.querySelector('.status-info');
    
    statusDot.classList.remove('pulse');
    statusDot.classList.add('pago');
    statusText.textContent = 'Pagamento confirmado!';
    statusText.style.color = 'rgb(1, 214, 97)';
    statusInfo.textContent = 'Redirecionando...';
    
    // Salvar status no localStorage
    const transacao = JSON.parse(localStorage.getItem('transacao_atual') || '{}');
    transacao.status = 'PAID';
    transacao.pagoEm = new Date().toISOString();
    localStorage.setItem('transacao_atual', JSON.stringify(transacao));
}

// ==========================================
// NAVEGAÇÃO
// ==========================================

function irParaConfirmacao() {
    // Redirecionar para página de obrigado com parâmetros
    const transacao = JSON.parse(localStorage.getItem('transacao_atual') || '{}');
    const dadosCliente = JSON.parse(localStorage.getItem('dados_cliente') || '{}');
    
    const params = new URLSearchParams({
        nome: dadosCliente.nome || '',
        email: dadosCliente.email || '',
        telefone: dadosCliente.telefone || '',
        transacao_id: transacao.id || '',
        utm_source: localStorage.getItem('utm_source') || '',
        utm_medium: localStorage.getItem('utm_medium') || '',
        utm_campaign: localStorage.getItem('utm_campaign') || '',
        utm_term: localStorage.getItem('utm_term') || '',
        utm_content: localStorage.getItem('utm_content') || ''
    });
    
    window.location.href = `obrigado.html?${params.toString()}`;
}

// ==========================================
// POPUP
// ==========================================

function mostrarErro(mensagem) {
    // Se a mensagem for um JSON, extrair apenas a mensagem relevante
    if (typeof mensagem === 'string' && mensagem.startsWith('{')) {
        try {
            const json = JSON.parse(mensagem);
            if (json.error) {
                mensagem = json.error;
            } else if (json.message) {
                mensagem = json.message;
            } else {
                mensagem = 'Erro ao processar pagamento. Tente novamente.';
            }
        } catch (e) {
            // Se não for JSON válido, usar mensagem padrão
            mensagem = 'Erro ao processar pagamento. Tente novamente.';
        }
    }
    
    document.getElementById('mensagemErro').textContent = mensagem;
    document.getElementById('popupErro').style.display = 'flex';
}

function fecharPopup() {
    document.getElementById('popupErro').style.display = 'none';
}

// ==========================================
// ABAS DOS BANCOS
// ==========================================

function initBankTabs() {
    const tabs = document.querySelectorAll('.bank-tab');
    const panels = document.querySelectorAll('.bank-panel');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remover active de todas as abas
            tabs.forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            
            // Remover active de todos os painéis
            panels.forEach(p => p.classList.remove('active'));
            
            // Adicionar active na aba clicada
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');
            
            // Mostrar painel correspondente
            const panelId = tab.getAttribute('aria-controls');
            const panel = document.getElementById(panelId);
            if (panel) {
                panel.classList.add('active');
            }
        });
    });
}

// Inicializar abas quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    initBankTabs();
});

// ==========================================
// CLEANUP
// ==========================================

window.addEventListener('beforeunload', () => {
    if (estadoPix.timerInterval) clearInterval(estadoPix.timerInterval);
    if (estadoPix.checkInterval) clearInterval(estadoPix.checkInterval);
});