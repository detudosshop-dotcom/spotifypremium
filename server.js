const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function requestHandler(req, res) {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // Handle API routes
  if (pathname === '/api/create-payment') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      req.body = body;
      require('./api/create-payment.js')(req, res);
    });
    return;
  }
  if (pathname === '/api/check-status') {
    require('./api/check-status.js')(req, res);
    return;
  }
  if (pathname === '/api/webhook') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      req.body = body;
      require('./api/webhook.js')(req, res);
    });
    return;
  }

  let safePath = path.normalize(path.join(PUBLIC_DIR, pathname));

  if (!safePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Acesso proibido');
    return;
  }

  if (fs.existsSync(safePath)) {
    const stat = fs.statSync(safePath);
    if (stat.isDirectory()) {
      safePath = path.join(safePath, 'index.html');
    }
  } else {
    if (fs.existsSync(safePath + '.html')) {
      safePath = safePath + '.html';
    } else if (fs.existsSync(path.join(safePath, 'index.html'))) {
      safePath = path.join(safePath, 'index.html');
    }
  }

  if (fs.existsSync(safePath) && fs.statSync(safePath).isFile()) {
    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(safePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>404 Não Encontrado</h1><p>A página solicitada não foi encontrada.</p>');
  }
}

function startServer(port) {
  const currentServer = http.createServer(requestHandler);
  currentServer.listen(port, () => {
    console.log('====================================================');
    console.log(`🚀 Servidor rodando em: http://localhost:${port}`);
    console.log(`🔗 Link de início: http://localhost:${port}/inicio/`);
    console.log('====================================================');
  });
  currentServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Porta ${port} em uso, tentando porta ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Erro no servidor:', err);
    }
  });
}

startServer(PORT);


