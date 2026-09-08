// ==========================================
// CHECKOUT SPOTIFY - IMPERIUMPAY
// Integração com Cloudflare Worker + localStorage + UTMs
// ==========================================
// CONFIGURAÇÕES CENTRALIZADAS EM: js/config.js
// Edite apenas o arquivo config.js para alterar todas as páginas
// ==========================================

// Estado da aplicação (usa CONFIG do config.js)
let estadoAtual = {
    produto: {
        nome: CONFIG.PRODUTO.nome,
        valor: CONFIG.PRODUTO.valor,
        externalRef: CONFIG.PRODUTO.externalRef
    },
    cliente: null,
    transacao: null,
    localizacao: null,
    utm: {
        source: '',
        medium: '',
        campaign: '',
        term: '',
        content: ''
    }
};

// ==========================================
// INICIALIZAÇÃO
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // Carregar parâmetros da URL
    carregarParametrosURL();
    
    // Capturar localização do lead
    capturarLocalizacao();
    
    // Gerar CPF válido aleatório
    gerarCPFAleatorio();
    
    // Configurar máscaras de input
    configurarMascaras();
    
    // Configurar formulário
    configurarFormulario();
    
    // Pré-preencher dados se disponíveis
    preencherDadosSalvos();
});

// ==========================================
// PARÂMETROS DA URL E UTMs
// ==========================================

function carregarParametrosURL() {
    const params = new URLSearchParams(window.location.search);
    
    // UTMs - Salvar no localStorage e estado
    const utmParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    utmParams.forEach(param => {
        const value = params.get(param);
        if (value) {
            const key = param.replace('utm_', '');
            estadoAtual.utm[key] = value;
            localStorage.setItem(param, value);
        }
    });
    
    // Carregar UTMs salvos anteriormente
    utmParams.forEach(param => {
        const saved = localStorage.getItem(param);
        if (saved && !estadoAtual.utm[param.replace('utm_', '')]) {
            estadoAtual.utm[param.replace('utm_', '')] = saved;
        }
    });
    
    // Produto
    const produto = params.get('produto');
    const valor = params.get('valor');
    
    if (produto) {
        estadoAtual.produto.nome = decodeURIComponent(produto);
        document.getElementById('produtoNome').textContent = estadoAtual.produto.nome;
        localStorage.setItem('produto_nome', estadoAtual.produto.nome);
    } else {
        // Carregar do localStorage
        const savedProduto = localStorage.getItem('produto_nome');
        if (savedProduto) {
            estadoAtual.produto.nome = savedProduto;
            document.getElementById('produtoNome').textContent = savedProduto;
        }
    }
    
    if (valor) {
        estadoAtual.produto.valor = parseInt(valor);
        document.getElementById('produtoValor').textContent = formatarMoeda(estadoAtual.produto.valor);
        localStorage.setItem('produto_valor', valor);
    } else {
        // Carregar do localStorage
        const savedValor = localStorage.getItem('produto_valor');
        if (savedValor) {
            estadoAtual.produto.valor = parseInt(savedValor);
            document.getElementById('produtoValor').textContent = formatarMoeda(estadoAtual.produto.valor);
        }
    }
    
    // Nome do usuário (vem do funil)
    const nome = params.get('nome');
    if (nome) {
        document.getElementById('nome').value = decodeURIComponent(nome);
        localStorage.setItem('usuario_nome', decodeURIComponent(nome));
    }
    
    // Saldo do usuário
    const saldo = params.get('saldo');
    if (saldo) {
        localStorage.setItem('usuario_saldo', saldo);
    }
}

// ==========================================
// MÁSCARAS DE INPUT
// ==========================================

function configurarMascaras() {
    // Máscara de CPF
    const cpfInput = document.getElementById('cpf');
    cpfInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 11) value = value.slice(0, 11);
        
        if (value.length > 9) {
            value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        } else if (value.length > 6) {
            value = value.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
        } else if (value.length > 3) {
            value = value.replace(/(\d{3})(\d{1,3})/, '$1.$2');
        }
        
        e.target.value = value;
    });
    
    // Máscara de Telefone
    const telefoneInput = document.getElementById('telefone');
    telefoneInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 11) value = value.slice(0, 11);
        
        if (value.length > 10) {
            value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        } else if (value.length > 6) {
            value = value.replace(/(\d{2})(\d{5})(\d{1,4})/, '($1) $2-$3');
        } else if (value.length > 2) {
            value = value.replace(/(\d{2})(\d{1,5})/, '($1) $2');
        }
        
        e.target.value = value;
    });
}

// ==========================================
// FORMULÁRIO
// ==========================================

function configurarFormulario() {
    const form = document.getElementById('formCheckout');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Validar campos
        if (!validarFormulario()) return;
        
        // Coletar dados
        const dados = coletarDadosFormulario();
        
        // Facebook Pixel - InitiateCheckout Event
        fbq('track', 'InitiateCheckout', {
            content_name: estadoAtual.produto.nome,
            currency: 'BRL',
            value: estadoAtual.produto.valor / 100
        });
        
        // Mostrar loading
        mostrarLoading(true);
        
        try {
            // Criar transação
            const resultado = await criarTransacao(dados);
            
            if (resultado.success) {
                // Salvar dados da transação
                salvarTransacao(resultado.data);
                
                // Redirecionar para página do QR Code
                redirecionarParaQRCode(resultado.data);
            } else {
                mostrarErro(resultado.error || 'Erro ao processar pagamento');
            }
        } catch (error) {
            console.error('Erro:', error);
            mostrarErro('Erro de conexão. Tente novamente.');
        } finally {
            mostrarLoading(false);
        }
    });
}

function validarFormulario() {
    const nome = document.getElementById('nome').value.trim();
    const email = document.getElementById('email').value.trim();
    const cpf = document.getElementById('cpf').value.replace(/\D/g, '');
    const telefone = document.getElementById('telefone').value.replace(/\D/g, '');
    
    // Validar nome
    if (nome.length < 3) {
        mostrarErro('Digite seu nome completo');
        return false;
    }
    
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        mostrarErro('Digite um e-mail válido');
        return false;
    }
    
    // Validar CPF
    if (cpf.length !== 11 || !validarCPF(cpf)) {
        mostrarErro('Digite um CPF válido');
        return false;
    }
    
    // Validar telefone
    if (telefone.length < 10 || telefone.length > 11) {
        mostrarErro('Digite um telefone válido');
        return false;
    }
    
    return true;
}

function validarCPF(cpf) {
    // Validação básica de CPF
    if (/^(\d)\1+$/.test(cpf)) return false;
    
    let soma = 0;
    for (let i = 0; i < 9; i++) {
        soma += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.charAt(9))) return false;
    
    soma = 0;
    for (let i = 0; i < 10; i++) {
        soma += parseInt(cpf.charAt(i)) * (11 - i);
    }
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.charAt(10))) return false;
    
    return true;
}

function coletarDadosFormulario() {
    const cpf = document.getElementById('cpf').value.replace(/\D/g, '');
    const telefone = document.getElementById('telefone').value.replace(/\D/g, '');
    
    return {
        nome: document.getElementById('nome').value.trim(),
        email: document.getElementById('email').value.trim(),
        cpf: cpf,
        telefone: `+55${telefone}`
    };
}

// ==========================================
// API VIA WORKER
// ==========================================

async function criarTransacao(dados) {
    // Salvar dados do cliente no localStorage
    salvarDadosCliente(dados);
    
    // Garantir que temos a localização
    if (!estadoAtual.localizacao) {
        await capturarLocalizacao();
    }
    
    const payload = {
        nome: dados.nome,
        email: dados.email,
        cpf: dados.cpf,
        telefone: dados.telefone,
        amount: estadoAtual.produto.valor,
        produto: estadoAtual.produto.nome,
        externalRef: estadoAtual.produto.externalRef,
        // UTMs
        utm_source: estadoAtual.utm.source,
        utm_medium: estadoAtual.utm.medium,
        utm_campaign: estadoAtual.utm.campaign,
        utm_term: estadoAtual.utm.term,
        utm_content: estadoAtual.utm.content,
        // Metadata com dados do cliente e localização
        metadata: {
            // Dados do cliente
            cliente_nome: dados.nome,
            cliente_email: dados.email,
            cliente_cpf: dados.cpf,
            cliente_telefone: dados.telefone,
            // UTMs
            utm_source: estadoAtual.utm.source,
            utm_medium: estadoAtual.utm.medium,
            utm_campaign: estadoAtual.utm.campaign,
            utm_term: estadoAtual.utm.term,
            utm_content: estadoAtual.utm.content,
            // Localização do lead
            lead_ip: estadoAtual.localizacao?.ip || '',
            lead_cidade: estadoAtual.localizacao?.cidade || '',
            lead_regiao: estadoAtual.localizacao?.regiao || '',
            lead_pais: estadoAtual.localizacao?.pais || '',
            lead_loc: estadoAtual.localizacao?.loc || '',
            lead_timezone: estadoAtual.localizacao?.timezone || '',
            lead_org: estadoAtual.localizacao?.org || '',
            // Dados adicionais
            provider_name: CONFIG.BRANDING.provider_name,
            produto_nome: estadoAtual.produto.nome,
            produto_valor: (estadoAtual.produto.valor / 100).toFixed(2)
        }
    };
    
    try {
        // Chamar Worker API (credenciais protegidas no Worker)
        const response = await fetch(getApiUrl(CONFIG.API.ENDPOINTS.CREATE_PAYMENT), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Erro na API:', error);
        return { success: false, error: error.message };
    }
}

function salvarDadosCliente(dados) {
    const clienteData = {
        nome: dados.nome,
        email: dados.email,
        cpf: dados.cpf,
        telefone: dados.telefone.replace('+55', '')
    };
    localStorage.setItem('dados_cliente', JSON.stringify(clienteData));
    localStorage.setItem('transacao_id', '');
    localStorage.setItem('transacao_status', 'pending');
}

// ==========================================
// GERAÇÃO DE CPF VÁLIDO ALEATÓRIO
// ==========================================

function gerarCPFAleatorio() {
    // Gerar 9 dígitos aleatórios
    const numeros = [];
    for (let i = 0; i < 9; i++) {
        numeros.push(Math.floor(Math.random() * 10));
    }
    
    // Calcular primeiro dígito verificador
    let soma = 0;
    for (let i = 0; i < 9; i++) {
        soma += numeros[i] * (10 - i);
    }
    let resto = (soma * 10) % 11;
    const digito1 = resto === 10 ? 0 : resto;
    numeros.push(digito1);
    
    // Calcular segundo dígito verificador
    soma = 0;
    for (let i = 0; i < 10; i++) {
        soma += numeros[i] * (11 - i);
    }
    resto = (soma * 10) % 11;
    const digito2 = resto === 10 ? 0 : resto;
    numeros.push(digito2);
    
    // Formatar CPF
    const cpf = numeros.join('');
    const cpfFormatado = formatarCPF(cpf);
    
    // Preencher campo oculto
    document.getElementById('cpf').value = cpfFormatado;
    
    console.log('CPF gerado automaticamente:', cpfFormatado);
    
    return cpf;
}

// ==========================================
// LOCALIZAÇÃO DO LEAD
// ==========================================

async function capturarLocalizacao() {
    try {
        const response = await fetch(`https://ipinfo.io/json?token=${CONFIG.IPINFO.token}`);
        const data = await response.json();
        
        const localizacao = {
            ip: data.ip || '127.0.0.1',
            cidade: data.city || '',
            regiao: data.region || '',
            pais: data.country || '',
            loc: data.loc || '',
            timezone: data.timezone || '',
            org: data.org || '',
            hostname: data.hostname || ''
        };
        
        estadoAtual.localizacao = localizacao;
        
        // Salvar no localStorage
        localStorage.setItem('lead_localizacao', JSON.stringify(localizacao));
        
        console.log('Localização capturada:', localizacao);
        
        return localizacao;
    } catch (error) {
        console.error('Erro ao capturar localização:', error);
        
        const localizacaoPadrao = {
            ip: '127.0.0.1',
            cidade: '',
            regiao: '',
            pais: '',
            loc: '',
            timezone: '',
            org: '',
            hostname: ''
        };
        
        estadoAtual.localizacao = localizacaoPadrao;
        localStorage.setItem('lead_localizacao', JSON.stringify(localizacaoPadrao));
        
        return localizacaoPadrao;
    }
}

async function obterIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch {
        return '127.0.0.1';
    }
}

// ==========================================
// PERSISTÊNCIA
// ==========================================

function salvarTransacao(data) {
    const transacao = {
        id: data.id,
        amount: data.amount,
        qrCode: data.qr_code,
        qrCodeBase64: data.qr_code_base64,
        expirationDate: data.expiration_date,
        status: data.status,
        produto: estadoAtual.produto,
        utm: estadoAtual.utm,
        criadoEm: new Date().toISOString()
    };
    
    localStorage.setItem('transacao_atual', JSON.stringify(transacao));
    localStorage.setItem('transacao_id', data.id);
    localStorage.setItem('transacao_status', data.status);
    estadoAtual.transacao = transacao;
}

function preencherDadosSalvos() {
    // Primeiro, tentar pegar dados da URL
    const params = new URLSearchParams(window.location.search);
    const nomeURL = params.get('nome');
    const emailURL = params.get('email');
    
    // Depois, tentar pegar do localStorage
    const dadosSalvos = localStorage.getItem('dados_cliente');
    const usuarioNome = localStorage.getItem('usuario_nome');
    const usuarioEmail = localStorage.getItem('usuario_email');
    
    // Preencher nome (prioridade: URL > dados_cliente > usuario_nome)
    const nomeFinal = nomeURL || (dadosSalvos && JSON.parse(dadosSalvos).nome) || usuarioNome;
    if (nomeFinal) {
        document.getElementById('nome').value = nomeFinal;
    }
    
    // Preencher email (prioridade: URL > dados_cliente > usuario_email)
    const emailFinal = emailURL || (dadosSalvos && JSON.parse(dadosSalvos).email) || usuarioEmail;
    if (emailFinal) {
        document.getElementById('email').value = emailFinal;
    }
    
    // Preencher CPF e telefone (apenas do dados_cliente)
    if (dadosSalvos) {
        const dados = JSON.parse(dadosSalvos);
        if (dados.cpf) document.getElementById('cpf').value = formatarCPF(dados.cpf);
        if (dados.telefone) document.getElementById('telefone').value = formatarTelefone(dados.telefone);
    }
}

// ==========================================
// NAVEGAÇÃO
// ==========================================

function redirecionarParaQRCode(transacao) {
    console.log('Redirecionando para PIX com dados:', transacao);
    
    // Verificar se temos todos os dados necessários
    if (!transacao || !transacao.id || !transacao.qr_code) {
        console.error('Dados da transação incompletos:', transacao);
        mostrarErro('Erro ao processar pagamento. Dados incompletos.');
        return;
    }
    
    const params = new URLSearchParams({
        id: transacao.id,
        qr_code: transacao.qr_code,
        expiration: transacao.expiration_date,
        amount: transacao.amount
    });
    
    window.location.href = `${CONFIG.REDIRECTS.pix}?${params.toString()}`;
}

// ==========================================
// UI HELPERS
// ==========================================

function mostrarLoading(mostrar) {
    const btn = document.getElementById('btnPagar');
    const btnText = btn.querySelector('.btn-text');
    const btnLoader = btn.querySelector('.btn-loader');
    
    if (mostrar) {
        btn.disabled = true;
        btnText.style.display = 'none';
        btnLoader.style.display = 'flex';
    } else {
        btn.disabled = false;
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
    }
}

function mostrarErro(mensagem) {
    document.getElementById('mensagemErro').textContent = mensagem;
    document.getElementById('popupErro').style.display = 'flex';
}

function fecharPopup() {
    document.getElementById('popupErro').style.display = 'none';
}

// ==========================================
// FORMATAÇÃO
// ==========================================

function formatarCPF(cpf) {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function formatarTelefone(telefone) {
    const limpo = telefone.replace(/\D/g, '');
    if (limpo.length === 11) {
        return limpo.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return limpo.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
}