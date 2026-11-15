'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright-core');
const dir=path.resolve(__dirname,'../public');
const live=fs.readFileSync(path.join(dir,'v159-live-voice.js'),'utf8');
const arena=fs.readFileSync(path.join(dir,'v140-net-mode.js'),'utf8');
const village=fs.readFileSync(path.join(dir,'v115-village.js'),'utf8');
const whole=fs.readFileSync(path.join(dir,'index.html'),'utf8');
for(const s of [live,arena,village])new Function(s);
assert.match(whole,/v159-live-voice\.js\?v=159/,'game loads new voice module');
assert.ok(whole.indexOf('v159-live-voice.js')<whole.indexOf('v140-net-mode.js'));
assert.match(arena,/id="ns159TalkBtn"/,'one-tap voice toggle in optimized multiplayer');
assert.match(arena,/id="ns159LiveHear"/,'separate live voice receive opt out');
assert.match(village,/id="ns159VillageTalk"/,'Village also has movable voice toggle');
assert.match(whole,/if\(data\.t==='ns159Rtc'\)/,'Village host routes authenticated WebRTC');
const server=http.createServer((req,res)=>{
 res.setHeader('Content-Type',req.url==='/v159-live-voice.js'?'text/javascript':'text/html');
 res.end(req.url==='/v159-live-voice.js'?live:
 '<!doctype html><html><body><button id="mic">Mic</button>'+
 '<script src="/v159-live-voice.js"></script></body></html>');
});
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,
  executablePath:['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync),
  args:['--no-sandbox','--disable-dev-shm-usage',
   '--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream',
   '--autoplay-policy=no-user-gesture-required']});
 try{
  const ctx=await browser.newContext({viewport:{width:360,height:740},
   isMobile:true,hasTouch:true,permissions:['microphone']});
  const pages=new Map(),signals=[],errors=[];
  for(const id of ['p1','p2']){
   const page=await ctx.newPage();pages.set(id,page);
   page.on('pageerror',e=>errors.push(id+': '+e.message));
   await page.exposeBinding('relaySignal',async({page:sender},payload)=>{
    const from=[...pages].find(([,p])=>p===sender)?.[0];
    if(!from||payload.t!=='rtc')throw Error('audio data on the game channel');
    const recipient=pages.get(payload.to);
    signals.push({from,to:payload.to,kind:payload.kind,size:JSON.stringify(payload).length});
    if(recipient&&payload.to!==from)await recipient.evaluate(packet=>{
     window.NS159_LIVE.receive(packet);
    },{...payload,from}).catch(()=>{});
   });
   await page.goto(origin);
   await page.evaluate(id=>{
    window.NS152_AUDIO={sound:true};
    window.fakeSocket={readyState:1,bufferedAmount:0,
     send(raw){void window.relaySignal(JSON.parse(raw))}};
    window.NS159_LIVE.attach(window.fakeSocket,id,['p1','p2'],who=>
      who===id?{x:0,y:0}:{x:4000,y:0},()=>{});
    document.querySelector('#mic').onclick=()=>void window.NS159_LIVE.toggle();
   },id);
  }
  for(const [id,page] of pages){
   await page.waitForFunction(()=>window.NS159_LIVE.status().connected===1,
    null,{timeout:25000});
   const state=await page.evaluate(()=>({
    stats:window.NS159_LIVE.stats,state:window.NS159_LIVE.status()
   }));
   assert.equal(state.state.micCaptured,false,'no microphone opens without tapping '+id);
   assert.equal(state.state.talking,false);
   assert.equal(state.stats.remoteStreams,1,'one remote media track '+id);
  }
  await pages.get('p1').locator('#mic').click();
  await pages.get('p1').waitForFunction(()=>window.NS159_LIVE.status().talking===true,
   null,{timeout:12000});
  const liveP1=await pages.get('p1').evaluate(()=>({
   state:window.NS159_LIVE.status(),stats:window.NS159_LIVE.stats,
   near:window.NS159_LIVE.attenuation(0),
   middle:window.NS159_LIVE.attenuation(490),
   far:window.NS159_LIVE.attenuation(4000)}));
  assert.equal(liveP1.state.micCaptured,true,'microphone starts after click');
  assert.equal(liveP1.stats.micStarts,1);
  assert.equal(liveP1.near,1);
  assert.ok(liveP1.middle>.42&&liveP1.middle<.45);
  assert.ok(liveP1.far>=.11&&liveP1.far<.111,'distance never fully mutes remote player');
  await pages.get('p1').locator('#mic').click();
  await pages.get('p1').waitForFunction(()=>!window.NS159_LIVE.status().micCaptured,
   null,{timeout:7000});
  const muted=await pages.get('p1').evaluate(()=>({
   state:window.NS159_LIVE.status(),stats:window.NS159_LIVE.stats}));
  assert.equal(muted.state.talking,false);
  assert.equal(muted.stats.micStops,1,'turning off actually releases microphone');
  assert.equal(muted.state.connected,1,'microphone off does not disconnect voice peers');
  const hear=await pages.get('p2').evaluate(()=>{
   window.NS159_LIVE.setListening(false);
   return window.NS159_LIVE.status();
  });
  assert.equal(hear.listen,false,'listen preference can be switched off');
  assert.ok(signals.every(x=>x.size<14000&&['ready','offer','answer','ice'].includes(x.kind)),
   'network channel contains signaling ONLY, not raw audio');
  assert.deepEqual(errors,[],'no mobile WebRTC page errors');
  console.log('V159 REAL WEBRTC 2 PHONE PASS: encrypted peer connection, real fake-device microphone, tap on/off, remote track, 11% floor, no audio data in gameplay packets');
  console.log('V159 SIGNALS '+JSON.stringify({
   count:signals.length,byType:Object.fromEntries([...new Set(signals.map(x=>x.kind))]
    .map(kind=>[kind,signals.filter(x=>x.kind===kind).length])),
   maxPacketBytes:Math.max(...signals.map(x=>x.size))}));
  for(const page of pages.values())await page.evaluate(()=>window.NS159_LIVE.stop());
  await ctx.close();
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1})
 .finally(()=>server.close());
