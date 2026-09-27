import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const EBAY_AUTH = 'https://auth.ebay.com/oauth2/authorize';
const EBAY_TOKEN = 'https://api.ebay.com/identity/v1/oauth2/token';
const scopes = (process.env.EBAY_OAUTH_SCOPES || 'https://api.ebay.com/oauth/api_scope/sell.inventory').split(/\s+/).filter(Boolean);
const clientId = process.env.EBAY_CLIENT_ID;
const clientSecret = process.env.EBAY_CLIENT_SECRET;
const ruName = process.env.EBAY_RUNAME;
const encryptionKey = process.env.EBAY_TOKEN_ENCRYPTION_KEY;
const tokenFile = process.env.EBAY_TOKEN_FILE || '/data/ebay-refresh-token.enc';
const states = new Map();

export function oauthConfigured() {
  return Boolean(clientId && clientSecret && ruName && encryptionKey && /^[A-Fa-f0-9]{64}$/.test(encryptionKey));
}
export function oauthStatus() {
  return { configured: oauthConfigured(), connected: false, scopes };
}
export function beginOAuth() {
  if (!oauthConfigured()) throw new Error('OAuth not configured. Set EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, EBAY_RUNAME and a 64-hex-char EBAY_TOKEN_ENCRYPTION_KEY.');
  const state = randomBytes(32).toString('hex');
  states.set(state, Date.now() + 10 * 60 * 1000);
  const u = new URL(EBAY_AUTH);
  u.searchParams.set('client_id', clientId);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('redirect_uri', ruName);
  u.searchParams.set('scope', scopes.join(' '));
  u.searchParams.set('state', state);
  return u.toString();
}
function keyBytes() { return Buffer.from(encryptionKey, 'hex'); }
export async function finishOAuth(code, state) {
  const expires = states.get(state);
  states.delete(state);
  if (!expires || expires < Date.now()) throw new Error('OAuth state missing, expired, or invalid. Restart at /connect.');
  const basic = Buffer.from(clientId + ':' + clientSecret).toString('base64');
  const body = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: ruName });
  const response = await fetch(EBAY_TOKEN, { method: 'POST', headers: { authorization: 'Basic ' + basic, 'content-type': 'application/x-www-form-urlencoded' }, body });
  if (!response.ok) throw new Error('eBay token exchange failed with HTTP ' + response.status);
  const data = await response.json();
  if (!data.refresh_token) throw new Error('eBay did not return a refresh token; check RuName and scopes.');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyBytes(), iv);
  const ciphertext = Buffer.concat([cipher.update(data.refresh_token, 'utf8'), cipher.final()]);
  const payload = [iv.toString('hex'), cipher.getAuthTag().toString('hex'), ciphertext.toString('hex')].join(':');
  await mkdir(path.dirname(tokenFile), { recursive: true, mode: 0o700 });
  await writeFile(tokenFile, payload, { mode: 0o600 });
  return { scopes: data.scope || scopes.join(' '), expiresIn: data.expires_in };
}
async function readRefreshToken() {
  const [ivHex, tagHex, ciphertextHex] = (await readFile(tokenFile, 'utf8')).trim().split(':');
  const decipher = createDecipheriv('aes-256-gcm', keyBytes(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextHex, 'hex')), decipher.final()]).toString('utf8');
}
export async function getAccessToken() {
  if (!oauthConfigured()) throw new Error('OAuth configuration missing.');
  const refreshToken = await readRefreshToken();
  const basic = Buffer.from(clientId + ':' + clientSecret).toString('base64');
  const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken, scope: scopes.join(' ') });
  const response = await fetch(EBAY_TOKEN, { method: 'POST', headers: { authorization: 'Basic ' + basic, 'content-type': 'application/x-www-form-urlencoded' }, body });
  if (!response.ok) throw new Error('eBay token refresh failed with HTTP ' + response.status);
  const data = await response.json();
  return data.access_token;
}
