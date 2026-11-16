// Verify the permanent Workers.dev game really serves the GitHub main assets.
// Read-only probe; does not touch Cloudflare credentials or player data.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const base='https://nocna-straza-v77.stefanstevic1996.workers.dev';
const localFile=readFileSync('public/v165-classic-voice.js');
const expected=createHash('sha256').update(localFile).digest('hex');
const title=readFileSync('public/index.html','utf8').match(/<title>Night Watch v(\d+)/)?.[1];
if(!title)throw new Error('Could not identify GitHub game version');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let last='';
for(let i=1;i<=15;i++){
 try{
  const query='?git-sync-check='+encodeURIComponent(process.env.GITHUB_SHA||'latest')+'-'+i;
  const [htmlRes,voiceRes]=await Promise.all([
   fetch(base+'/'+query,{headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(20000)}),
   fetch(base+'/v165-classic-voice.js'+query,{headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(20000)})
  ]);
  if(!htmlRes.ok||!voiceRes.ok)throw Error('Worker HTTP '+htmlRes.status+', asset HTTP '+voiceRes.status);
  const html=await htmlRes.text(),voice=Buffer.from(await voiceRes.arrayBuffer());
  const actual=createHash('sha256').update(voice).digest('hex');
  const liveVersion=html.match(/<title>Night Watch v(\d+)/)?.[1]||'unknown';
  console.log('Attempt '+i+': version '+liveVersion+', lobby CSS asset '+(actual===expected?'MATCH':'DIFFERENT'));
  if(actual===expected&&liveVersion===title&&html.includes('v165-classic-voice.js?v=166')){
   console.log('LIVE VERIFIED: permanent Worker serves correct V'+title+' and fixed lobby CSS, hash '+expected.slice(0,12));
   if(process.env.GITHUB_STEP_SUMMARY){
    const {appendFileSync}=await import('node:fs');
    appendFileSync(process.env.GITHUB_STEP_SUMMARY,
     '### ✅ Permanent game Worker updated and verified\n\n'+base+'/\n\nV'+title+'; mobile lobby JavaScript hash matches GitHub main.\n');
   }
   process.exit(0);
  }
  last='Live version '+liveVersion+', asset hash '+actual.slice(0,12)+' expected '+expected.slice(0,12);
 }catch(e){last=String(e);console.log('Attempt '+i+': '+last)}
 if(i<15)await wait(10000);
}
throw new Error('Permanent Worker NOT VERIFIED. GitHub updated, but Cloudflare production differs. '+last);
