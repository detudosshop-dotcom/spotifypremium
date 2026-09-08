# Spotify Avaliador — Clone Completo do Funil

Clone idêntico e funcional de todas as etapas do funil Spotify Avaliador (`sptagora.shop`), com 100% de fidelidade aos detalhes visuais, players do Spotify, contadores de tempo, notificações de saldo dinâmicas, tela de saque Pix com popup animado, status da fila de envio, regras de saque e checkout prioritário.

---

## 📁 Estrutura das Páginas

| Caminho | Descrição |
|---|---|
| `/` ou `index.html` | Entrada com redirecionamento preservando parâmetros e UTMs |
| `/inicio/` | Cadastro inicial (Nome, Sobrenome, E-mail) |
| `/inicio/02/` | Etapa 1: MC Ryan SP (Saldo: R$ 100,00) |
| `/03/` | Etapa 2: Pagode (Saldo: R$ 131,76) |
| `/04/` | Etapa 3: Sertanejo Diego & Victor Hugo (Saldo: R$ 161,68) |
| `/05/` | Etapa 4: Vitinho Imperador (Saldo: R$ 200,80) |
| `/06/` | Etapa 5: Ana Castela (Saldo: R$ 242,88) |
| `/07/` | Etapa 6: Música Positiva (Saldo: R$ 281,32) |
| `/08/` | Etapa 7: Medley The Box Funk (Saldo: R$ 314,35) |
| `/09/` | Etapa 8: Pedro Sampaio (Saldo: R$ 351,17) |
| `/10/` | Solicitação do 1º Saque Pix (Saldo: R$ 382,76) com animação de validação |
| `/status/` | Painel de status do Pix (Progresso 72% -> 85%), modal Fila Padrão vs Prioridade Premium |
| `/regrasdesaque/` | Termos e regras oficiais de liberação de saldo |
| `/checkout/loading.html` | Tela de carregamento prioritário animada (0% a 100%) |
| `/checkout/confirmar.html` | Confirmação do pedido com resumo e dados do titular |
| `/checkout/index.html` | Checkout direto |
| `/checkout/pix.html` | QR Code Pix e código copia-e-cola |
| `/checkout/obrigado.html` | Tela de confirmação e agradecimento |

---

## 🚀 Como Executar Localmente

Você tem um servidor em Node.js pronto para uso sem precisar instalar nenhuma biblioteca adicional.

Basta abrir o terminal nesta pasta e executar:

```bash
node server.js
```
ou:
```bash
npm start
```

Em seguida, acesse no navegador:
👉 **[http://localhost:3000/inicio/](http://localhost:3000/inicio/)**

---

## ⚙️ Configuração dos Pixels e Gateway

### 1. Facebook Pixel e UTMify
Os scripts de rastreamento estão inclusos em todas as páginas:
- Para alterar o ID do Pixel do Facebook, procure por `fbq('init', 'SEU_PIXEL_AQUI')` nos arquivos HTML.
- O UTMify está configurado em todas as páginas para rastrear e repassar as UTMs de campanha entre todas as etapas do funil automaticamente.

### 2. Gateway de Pagamento / Checkout
O arquivo de configuração centralizado fica em:
📂 `checkout/js/config.js`

Você pode configurar:
- URL do seu Worker / API de pagamento
- Chave Pix ou credenciais
- Valor do produto prioritário (`R$ 9,99`)
- IDs de rastreamento adicionais
