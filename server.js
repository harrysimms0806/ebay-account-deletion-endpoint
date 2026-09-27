import http from 'node:http';
import { createHash } from 'node:crypto';

const port = Number(process.env.PORT || 3000);
const token = process.env.EBAY_VERIFICATION_TOKEN;
const endpoint = process.env.EBAY_NOTIFICATION_ENDPOINT;

if (!token || !/^[A-Za-z0-9]{32,80}$/.test(token)) {
  console.error('EBAY_VERIFICATION_TOKEN must be 32–80 alphanumeric characters');
  process.exit(1);
}
if (!endpoint || !/^https:\/\//.test(endpoint)) {
  console.error('EBAY_NOTIFICATION_ENDPOINT must be the exact public HTTPS notification URL');
  process.exit(1);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');

  if (req.method === 'GET' && url.pathname === '/' && url.searchParams.has('challenge_code')) {
    const code = url.searchParams.get('challenge_code');
    if (!code) { res.writeHead(400); res.end(); return; }
    const challengeResponse = createHash('sha256')
      .update(code + token + endpoint, 'utf8')
      .digest('hex');
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ challengeResponse }));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/') {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1_000_000) { req.destroy(); }
    });
    req.on('end', () => {
      // Acknowledge valid JSON without persisting or logging the user-data payload.
      try { JSON.parse(body); } catch { res.writeHead(400); res.end(); return; }
      res.writeHead(204);
      res.end();
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('ok');
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(port, '0.0.0.0', () => console.log(`Listening on ${port}`));
