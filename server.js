import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { createHash, timingSafeEqual } from 'node:crypto';
import { beginOAuth, finishOAuth, getAccessToken, oauthConfigured } from './oauth.js';

const port=Number(process.env.PORT||3000), token=process.env.EBAY_VERIFICATION_TOKEN, endpoint=process.env.EBAY_NOTIFICATION_ENDPOINT, adminKey=process.env.EBAY_CONNECTOR_ADMIN_KEY;
const policyPath=new URL('./privacy.html',import.meta.url);
if(!token||!/^[A-Za-z0-9]{32,80}$/.test(token)){console.error('EBAY_VERIFICATION_TOKEN must be 32–80 alphanumeric characters');process.exit(1);}
if(!endpoint||!/^https:\/\//.test(endpoint)){console.error('EBAY_NOTIFICATION_ENDPOINT must be the exact public HTTPS notification URL');process.exit(1);}
function eq(a,b){return !!a&&!!b&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));}
function authorized(req){if(!adminKey)return false;const a=req.headers.authorization||'';if(a.startsWith('Bearer '))return eq(a.slice(7),adminKey);if(a.startsWith('Basic ')){try{return eq(Buffer.from(a.slice(6),'base64').toString().split(':').slice(1).join(':'),adminKey);}catch{return false;}}return false;}
function send(res,status,body,type='application/json; charset=utf-8'){res.writeHead(status,{'content-type':type,'cache-control':'no-store','x-content-type-options':'nosniff'});res.end(typeof body==='string'?body:JSON.stringify(body));}
const server=http.createServer(async(req,res)=>{const url=new URL(req.url||'/','http://localhost');
if(req.method==='GET'&&url.pathname==='/privacy'){try{const p=await readFile(policyPath);res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-cache'});res.end(p);}catch{send(res,500,'Privacy page unavailable','text/plain');}return;}
if(req.method==='GET'&&url.pathname==='/health'){send(res,200,{ok:true});return;}
if(req.method==='GET'&&url.pathname==='/'&&url.searchParams.has('challenge_code')){const code=url.searchParams.get('challenge_code');if(!code){send(res,400,{error:'missing challenge_code'});return;}const challengeResponse=createHash('sha256').update(code+token+endpoint,'utf8').digest('hex');send(res,200,{challengeResponse});return;}
if(req.method==='POST'&&url.pathname==='/'){let body='';req.setEncoding('utf8');req.on('data',c=>{body+=c;if(body.length>1000000)req.destroy();});req.on('end',()=>{try{JSON.parse(body);}catch{send(res,400,{error:'invalid JSON'});return;}res.writeHead(204);res.end();});return;}
if((url.pathname==='/connect'||url.pathname.startsWith('/api/'))&&!authorized(req)){res.writeHead(401,{'www-authenticate':'Basic realm=\"eBay Connector\", charset=\"UTF-8\"','cache-control':'no-store','content-type':'text/plain'});res.end('Connector admin key required.');return;}
if(req.method==='GET'&&url.pathname==='/connect'){try{res.writeHead(302,{'location':beginOAuth(),'cache-control':'no-store'});res.end();}catch(e){send(res,503,{error:e.message});}return;}
if(req.method==='GET'&&url.pathname==='/oauth/callback'){const err=url.searchParams.get('error');if(err){send(res,400,{error:'eBay authorization denied: '+err});return;}const code=url.searchParams.get('code'),state=url.searchParams.get('state');if(!code||!state){send(res,400,{error:'Missing OAuth code/state. Set this exact URL as RuName Auth Accepted URL.'});return;}try{const result=await finishOAuth(code,state);send(res,200,{connected:true,message:'eBay authorized; encrypted refresh token stored.',scopes:result.scopes,expiresIn:result.expiresIn});}catch(e){send(res,400,{error:e.message});}return;}
if(req.method==='GET'&&url.pathname==='/api/connection'){if(!oauthConfigured()){send(res,503,{connected:false,configured:false});return;}try{await getAccessToken();send(res,200,{connected:true,tokenRefresh:'ok'});}catch(e){send(res,200,{connected:false,error:e.message});}return;}
if(req.method==='GET'&&url.pathname==='/api/inventory'){try{const access=await getAccessToken();const r=await fetch('https://api.ebay.com/sell/inventory/v1/inventory_item?limit=100',{headers:{authorization:'Bearer '+access,'content-type':'application/json'}});send(res,r.status,await r.text());}catch(e){send(res,502,{error:e.message});}return;}
send(res,404,{error:'Not found'});});
server.listen(port,'0.0.0.0',()=>console.log('Listening on '+port));
