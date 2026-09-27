import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

const token = '0123456789abcdefghijklmnopqrstuv';
const endpoint = 'https://example.invalid/';

test('challenge response follows eBay SHA-256 format; health and notifications respond', async () => {
  const port = 31245;
  const child = spawn(process.execPath, ['server.js'], {
    env: { ...process.env, PORT: String(port), EBAY_VERIFICATION_TOKEN: token, EBAY_NOTIFICATION_ENDPOINT: endpoint },
    stdio: 'ignore'
  });
  try {
    const base = `http://127.0.0.1:${port}`;
    let ready = false;
    for (let i = 0; i < 40; i++) {
      try { const r = await fetch(`${base}/health`); if (r.ok) { ready = true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.equal(ready, true, 'server starts and health responds');
    const code = 'test-challenge';
    const response = await fetch(`${base}/?challenge_code=${encodeURIComponent(code)}`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /application\/json/);
    assert.deepEqual(await response.json(), { challengeResponse: createHash('sha256').update(code + token + endpoint).digest('hex') });
    const post = await fetch(base, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ test: true }) });
    assert.equal(post.status, 204);
    const bad = await fetch(base, { method: 'POST', body: 'not-json' });
    assert.equal(bad.status, 400);
  } finally { child.kill('SIGTERM'); }
});

test('missing or invalid secrets fail closed', async () => {
  const child = spawn(process.execPath, ['server.js'], { env: { ...process.env, EBAY_VERIFICATION_TOKEN: 'too-short', EBAY_NOTIFICATION_ENDPOINT: endpoint }, stdio: 'ignore' });
  const [code] = await once(child, 'exit');
  assert.equal(code, 1);
});
