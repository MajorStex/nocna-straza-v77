// V168 read-only permanent Worker verification: no secrets, production writes or fake green checks.
import fs from 'node:fs';
import crypto from 'node:crypto';
const game='https://nocna-straza-v77.stefanstevic1996.workers.dev/';
const relay='https://nocna-straza-relay.stefanstevic1996.workers.dev/';
const files=['v140-net-mode.js','v157-arena-scenery.js','v152-arena-audio.js'];
const hash=v=>crypto.createHash('sha256').update(v).digest('hex');
const expect=Object.fromEntries(files.map(name=>[name,hash(fs.readFileSync('public/'+name))]));
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let lastProblem='';
for(let attempt=1;attempt<=15;attempt++){
 try{
  const check='?v168='+encodeURIComponent(process.env.GITHUB_SHA||'main')+'-'+attempt;
  const res=await fetch(game+check,{headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(20000)});
  if(!res.ok)throw new Error('Game homepage HTTP '+res.status);
  const html=await res.text();
  for(const name of files)if(!html.includes('./'+name+'?v=168'))
   throw new Error('Public HTML not yet referencing fresh '+name+'?v=168');
  if(!html.includes('Night Watch v166'))throw Error('Original Classic release accidentally modified');
  const [source,health]=await Promise.all([
   Promise.all(files.map(name=>fetch(game+name+check,{headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(20000)})
      .then(async r=>{if(!r.ok)throw Error(name+' HTTP '+r.status);return [name,hash(Buffer.from(await r.arrayBuffer()))]}))),
   fetch(relay+'health'+check,{signal:AbortSignal.timeout(20000)}).then(r=>r.json())
  ]);
  const actual=Object.fromEntries(source);
  for(const name of files)if(actual[name]!==expect[name])
    throw Error(name+' hash mismatch: live '+actual[name].slice(0,12)+' GitHub '+expect[name].slice(0,12));
  if(health.arenaBuild!==168||health.arenaWorld?.w!==4200||health.arenaXp!==true)
   throw Error('Relay is not running V168+ 4200 world/EXP: '+JSON.stringify(health));
  console.log('V168 LIVE VERIFIED: SAME PERMANENT WORKER, NEW ZONE+SCENERY+AUDIO SHA256 MATCH, RELAY BUILD 168',
    JSON.stringify(Object.fromEntries(source.map(([n,h])=>[n,h.slice(0,12)]))));
  if(process.env.GITHUB_STEP_SUMMARY){
   fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    '### ✅ V168 New Zone LIVE on existing Noćna Straža URL\n\n'+game+
    '\n\n4200×4200, blue XP crystals, local sound. Exact SHA-256 matches GitHub on all three assets. Relay build 168 confirmed.\n');
  }
  process.exit(0);
 }catch(e){lastProblem=String(e);console.log('V168 live check '+attempt+': '+lastProblem)}
 if(attempt<15)await pause(8000);
}
throw new Error('V168 game NOT VERIFIED LIVE despite GitHub merge: '+lastProblem);
