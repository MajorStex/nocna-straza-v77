'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core');
const base=path.resolve(__dirname,'../public');
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
const voice=fs.readFileSync(path.join(base,'v159-hero-voices.js'),'utf8');
const net=fs.readFileSync(path.join(base,'v140-net-mode.js'),'utf8');
assert.match(html,/v159-hero-voices\.js\?v=159/,'voice module loaded in game before New Zone');
assert.ok(html.indexOf('v159-hero-voices.js')<html.indexOf('v140-net-mode.js'));
assert.match(html,/getHeroVoiceClip:kind=>VoiceClips\.clips\.get\(kind\)/,'use the actual Hero Editor recordings');
assert.match(html,/getHeroVoicePreference:=>|getHeroVoicePreference:\(\)=>/,'respect legacy voice consent');
assert.match(net,/ns159MenuShare/);assert.match(net,/ns159MenuHear/);assert.match(net,/ns159MenuVoiceTest/);
assert.match(net,/V\(\)\?\.receive\(m\)/);
for(const script of [voice,net])new Function(script);
(async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync),
  args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const viewport of [{width:360,height:780},{width:832,height:394}]){
   const page=await browser.newPage({viewport,isMobile:true,hasTouch:true});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.setContent('<html><body><button id="activate">Audio</button></body></html>');
   await page.evaluate(()=>{
    // A real, short 8kHz mono PCM WAV clip. No external media/network.
    const rate=8000,samples=3200,b=new Uint8Array(samples+44),v=new DataView(b.buffer);
    const put=(at,s)=>{for(let i=0;i<s.length;i++)b[at+i]=s.charCodeAt(i)};
    put(0,'RIFF');v.setUint32(4,b.length-8,true);put(8,'WAVE');put(12,'fmt ');
    v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);
    v.setUint32(24,rate,true);v.setUint32(28,rate,true);v.setUint16(32,1,true);v.setUint16(34,8,true);
    put(36,'data');v.setUint32(40,samples,true);
    for(let i=0;i<samples;i++)b[i+44]=Math.floor(128+35*Math.sin(i*.07));
    window.clip=new Blob([b],{type:'audio/wav'});
    window.prefs={share:true,hear:true,volume:.52};
    window.__NS110_BRIDGE={
     getHeroVoiceClip:kind=>kind==='start'||kind==='preview'?window.clip:null,
     prepareHeroVoiceClip:async x=>x,
     getHeroVoicePreference:()=>window.prefs};
    window.NS152_AUDIO={sound:true};
    window.sockets=[];
    window.socket=()=>{const s={readyState:1,bufferedAmount:0,sent:[],
     send(raw){this.sent.push(JSON.parse(raw))}};window.sockets.push(s);return s};
   });
   await page.addScriptTag({path:path.join(base,'v159-hero-voices.js')});
   await page.locator('#activate').click();
   const data=await page.evaluate(async()=>{
    const v=window.NS159_VOICES,ws=window.socket();
    v.attach(ws,'p1',id=>id==='p1'?{x:0,y:0}:{x:4000,y:0});
    const started=await v.emit('start');
    const first=ws.sent.slice();
    const prepared=first.filter(f=>f.t==='vp'),cues=first.filter(f=>f.t==='vc');
    const uploaded=prepared.reduce((n,p)=>n+atob(p.data).length,0);
    v.stop();
    const remote=window.socket();
    v.attach(remote,'p2',id=>id==='p2'?{x:0,y:0}:{x:4000,y:0});
    // Cue-only after a lost asset triggers a request for cached original audio.
    v.receive({...cues[0],from:'p1'});
    const requests=remote.sent.filter(f=>f.t==='vn');
    for(const f of prepared)v.receive({...f,from:'p1'});
    v.receive({...cues[0],from:'p1'});
    const received=v.stats;
    const near=v.attenuation(0),middle=v.attenuation(490),far=v.attenuation(4000);
    v.stop();
    window.prefs.share=false;
    const local=window.socket();v.attach(local,'p1',()=>({x:0,y:0}));
    const selfOnly=await v.emit('start');
    const localPackets=local.sent.length;v.stop();
    return {started,prepared:prepared.length,cues:cues.length,uploaded,
     requests:requests.length,requestOwner:requests[0]?.owner,
     cache:received.cache,receivedBytes:received.receivedBytes,
     near,middle,far,selfOnly,localPackets,
     chunkLimit:prepared.every(f=>f.data.length<=5500&&JSON.stringify(f).length<6200)};
   });
   assert.equal(data.started,true);
   assert.equal(data.cues,1,'one small cue for first speaker event');
   assert.equal(data.prepared,1,'tiny clip sends one chunk on first event');
   assert.equal(data.uploaded,3244,'clip bytes must arrive intact');
   assert.equal(data.requests,1,'late receiver requests a missing hero clip once');
   assert.equal(data.requestOwner,'p1');
   assert.equal(data.cache,1,'remote cached original clip exactly once');
   assert.equal(data.receivedBytes,3244);
   assert.equal(data.near,1);assert.ok(data.middle>.42&&data.middle<.46);
   assert.ok(data.far>=.11&&data.far<.111,'far voice must remain faintly audible');
   assert.equal(data.selfOnly,true,'local own voice available even when sharing off');
   assert.equal(data.localPackets,0,'sharing off must not send any clip or cue');
   assert.equal(data.chunkLimit,true);
   assert.deepEqual(errors,[],'mobile browser exception-free');
   console.log('V159 HERO VOICE '+viewport.width+'x'+viewport.height+
    ' PASS: original editor WAV, one-time asset, cached receiver, late request, consent off, 11% distance floor');
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
