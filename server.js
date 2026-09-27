import http from 'node:http';
import { createHash, timingSafeEqual } from 'node:crypto';

const port = Number(process.env.PORT || 3000);
const token = process.env.EBAY_VERIFICATION_TOKEN;
const endpoint = process.env.EBAY_NOTIFICATION_ENDPOINT;
if (!token || !endpoint) { console.error('Set EBAY_VERIFICATION_TOKEN and EBAY_NOTIFICATION_ENDPOINT'); process.exit(1); }

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  if (req.method === 'GET' && url.searchParams.has('challenge_code')) {
    const code = url.searchParams.get('challenge_code');
    const challengeResponse = createHash('sha256').update(code + token + endpoint, 'utf8').digest('hex');
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ challengeResponse }));
    return;
  }
  if (req.method === 'POST' && url.pathname === '/') {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', chunk => { body += chunk; if (body.length > 1_000_000) req.destroy(); });
    req.on('end', () => {
      // Notifications are acknowledged without persisting payload or eBay user data.
      try { JSON.parse(body); } catch { res.writeHead(400); res.end(); return; }
      res.writeHead(204); res.end();
    });
    return;
  }
  if (req.method === 'GET' && url.pathname === '/health') { res.writeHead(200, { 'content-type': 'text/plain' }); res.end('ok'); return; }
  res.writeHead(404); res.end();
});
server.listen(port, '0.0.0.0', () => console.log(`Listening on ${port}`));
