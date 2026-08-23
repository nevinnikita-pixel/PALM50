const crypto=require('crypto');
const PRODUCTS={
 royal_hand:{title:'Royal Palm',description:'Royal Palm cosmetic skin',stars:99,permanent:true},
 meme_reactions:{title:'Meme Pack',description:'PALM 50 meme reactions pack',stars:59,permanent:true},
 vip_reactions:{title:'VIP Pack',description:'PALM 50 VIP reactions pack',stars:79,permanent:true},
 palm_plus_monthly:{title:'PALM PLUS',description:'PALM PLUS for 30 days',stars:199,permanent:false}
};
function json(res,status,body){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(body))}
function env(n){const v=process.env[n];if(!v)throw new Error('Missing environment variable: '+n);return v}
function body(req){if(req.body&&typeof req.body==='object')return Promise.resolve(req.body);return new Promise((ok,no)=>{let s='';req.on('data',c=>s+=c);req.on('end',()=>{try{ok(s?JSON.parse(s):{})}catch{no(new Error('Invalid JSON'))}});req.on('error',no)})}
function validateInitData(initData){
 const token=env('TELEGRAM_BOT_TOKEN'); if(!initData)throw new Error('Telegram initData is required');
 const p=new URLSearchParams(initData), got=p.get('hash'); if(!got)throw new Error('Telegram initData hash missing'); p.delete('hash');
 const check=[...p.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>k+'='+v).join('\n');
 const secret=crypto.createHmac('sha256','WebAppData').update(token).digest();
 const exp=crypto.createHmac('sha256',secret).update(check).digest('hex');
 const a=Buffer.from(exp,'hex'),b=Buffer.from(got,'hex'); if(a.length!==b.length||!crypto.timingSafeEqual(a,b))throw new Error('Invalid Telegram initData');
 const auth=Number(p.get('auth_date')||0); if(!auth||Math.abs(Date.now()/1000-auth)>86400)throw new Error('Telegram initData expired');
 const u=JSON.parse(p.get('user')||'{}'); if(!u.id)throw new Error('Telegram user missing'); return u;
}
async function tg(method,payload){const r=await fetch('https://api.telegram.org/bot'+env('TELEGRAM_BOT_TOKEN')+'/'+method,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload||{})});const d=await r.json();if(!r.ok||!d.ok)throw new Error(d.description||'Telegram error');return d.result}
function h(prefer){const k=env('SUPABASE_SERVICE_ROLE_KEY');const x={apikey:k,Authorization:'Bearer '+k,'Content-Type':'application/json'};if(prefer)x.Prefer=prefer;return x}
function url(p){return env('SUPABASE_URL').replace(/\/$/,'')+'/rest/v1/'+p}
async function sel(p){const r=await fetch(url(p),{headers:h()});const t=await r.text(),d=t?JSON.parse(t):null;if(!r.ok)throw new Error(d?.message||'Supabase '+r.status);return d}
async function ins(table,row){const r=await fetch(url(table),{method:'POST',headers:h('return=representation'),body:JSON.stringify(row)});const t=await r.text(),d=t?JSON.parse(t):null;if(!r.ok)throw new Error(d?.message||'Supabase '+r.status);return Array.isArray(d)?d[0]:d}
async function patch(p,row){const r=await fetch(url(p),{method:'PATCH',headers:h('return=representation'),body:JSON.stringify(row)});const t=await r.text(),d=t?JSON.parse(t):null;if(!r.ok)throw new Error(d?.message||'Supabase '+r.status);return Array.isArray(d)?d[0]:d}
function product(id){if(!PRODUCTS[id])throw new Error('Unknown product');return PRODUCTS[id]}
module.exports={PRODUCTS,json,body,validateInitData,tg,sel,ins,patch,product};
