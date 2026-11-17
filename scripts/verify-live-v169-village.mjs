// V169: fail closed unless the permanent game Worker serves the exact latest Village + voice files.
// Read-only: never creates rooms, transmits microphone data, or writes persistent game state.
import fs from 'node:fs';
import crypto from 'node:crypto';
const url='https://nocna-straza-v77.stefanstevic1996.workers.dev/';
const relay='https://nocna-straza-relay.stefanstevic1996.workers.dev/';
const files=['v115-village.js','v165-classic-voice.js'];
const digest=data=>crypto.createHash('sha256').update(data).digest('hex');
const expected=Object.fromEntries(files.map(file=>[file,digest(fs.readFileSync('public/'+file))]));
let reason='unavailable';
for(let attempt=1;attempt<=16;attempt++){
 try{
  const marker='&verify='+encodeURIComponent(process.env.GITHUB_SHA||'main')+'-'+attempt;
  const home=await fetch(url+'?v170='+attempt,{headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(16000)});
  if(!home.ok)throw Error('game home HTTP '+home.status);
  const html=await home.text();
  const localRelease=fs.readFileSync('public/index.html','utf8').match(/<meta name="ns-release" content="(\d+)"/)?.[1];
  if(localRelease&&!html.includes('<meta name="ns-release" content="'+localRelease+'">'))throw Error('Public homepage still serves a stale release');
  for(const file of files){const ui=file==='v115-village.js'?170:169;
   if(!html.includes(file+'?v=166&amp;ui='+ui))throw Error('HTML is still referencing old '+file)}
  const checks=await Promise.all(files.map(async file=>{
   const response=await fetch(url+file+'?v=166&ui='+(file==='v115-village.js'?170:169)+marker,{headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(16000)});
   if(!response.ok)throw Error(file+' HTTP '+response.status);
   const found=digest(Buffer.from(await response.arrayBuffer()));
   if(found!==expected[file])throw Error(file+' not deployed: '+found.slice(0,12)+' != '+expected[file].slice(0,12));
   return [file,found.slice(0,12)];
  }));
  const backend=await fetch(relay+'health?ui=170-'+attempt,{signal:AbortSignal.timeout(16000)}).then(r=>r.json());
  if(backend.arenaBuild!==168||backend.arenaXp!==true||backend.arenaWorld?.w!==4200)
    throw Error('V168 arena was lost: '+JSON.stringify(backend));
  console.log('V170 LIVE VERIFIED: SAME PERMANENT GAME WORKER · VILLAGE + VOICE SHA256 MATCH · V168 WORLD AND EXP STILL PRESENT '+JSON.stringify(Object.fromEntries(checks)));
  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
   '### ✅ V170 live · existing Noćna Straža link\n\nVillage and voice SHA-256 match the exact GitHub release; V168 4200 × 4200 XP relay is unchanged.\n');
  process.exit(0);
 }catch(error){reason=String(error);console.log('V170 live probe '+attempt+': '+reason)}
 if(attempt<16)await new Promise(resolve=>setTimeout(resolve,6500));
}
throw new Error('V170 not confirmed live: '+reason);
