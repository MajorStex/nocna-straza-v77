'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core');
const html=fs.readFileSync(path.resolve(__dirname,'../public/index.html'),'utf8');
const village=fs.readFileSync(path.resolve(__dirname,'../public/v115-village.js'),'utf8');
assert.match(html,/<title>Night Watch v141 — Noćna Straža<\/title>/);
assert.match(html,/VERZIJA V141 · VILLAGE SERVER UP/);
assert.match(html,/v115-village\.js\?v=141/);
assert.match(village,/id="ns141Server"/);
assert.match(village,/id="ns141Training"/);
assert.match(village,/const TRAINING_SPAWNS=/);
assert.match(village,/function villageOnline\(\)/);
assert.match(village,/pendingAutoRoom='HOST'/);
assert.match(village,/get serverUp\(\)\{return villageOnline\(\)\}/);
assert.match(village,/if\(trainingStrike\(now\)\)return true/);
assert.doesNotMatch(village.slice(village.indexOf('// V141:'),village.indexOf('let opened=')),/localStorage\.setItem|awardMP|coopXP|G\.kills/);
new Function(village);
(async()=>{
 const bin=['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync);
 assert.ok(bin,'Chrome is required for mobile Village QA');
 const browser=await chromium.launch({headless:true,executablePath:bin,
  args:['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files']});
 try{
  for(const [width,height] of [[360,844],[412,844],[832,384]]){
   const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('file://'+path.resolve(__dirname,'../public/index.html')+'?village-test=1',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.NS109_VILLAGE?.opened,{timeout:16000});
   const before=await page.evaluate(()=>{
    const api=window.NS109_VILLAGE;
    document.getElementById('ns141Training').click();
    const t=api.test;
    const mobi=t.practice.mobs[0]; // local-only practice target, no network state.
    const moves=[[mobi.x,mobi.y],[mobi.x-28,mobi.y],[mobi.x+24,mobi.y]];
    const accessible=moves.some(([x,y])=>t.testMove(x,y));
    const attacked=accessible&&t.attack();
    const practiceEnabled=t.practice.on;
    const host=document.getElementById('hostBtn');
    host.onclick=()=>{window.__v141HostClicked=true};
    const started=api.startServer();
    return {practice:practiceEnabled,accessible,attacked,started,hostClicked:!!window.__v141HostClicked,
      closed:!api.opened,serverUp:api.serverUp};
   });
   console.log('V141_STAGING',width,before,errors);
   assert.ok(before.practice&&before.accessible&&before.attacked,'Village solo practice hit works');
   assert.ok(before.started&&before.hostClicked&&before.closed,'Village starts existing host flow once');
   assert.equal(before.serverUp,false,'not allowed to advertise server UP before relay connects');
   const online=await page.evaluate(()=>{
    const api=window.NS109_VILLAGE,net=window.__NS110_BRIDGE.NET;
    net.role='host';net.hostId='p1';net.localId='p1';net.phase='lobby';net.code='ABCDEF';net.peer={_connected:true,_socket:{readyState:1}};
    api.onLobbyUI();api.frame(performance.now()+60);
    return {opened:api.opened,up:api.serverUp,code:api.roomCode,
      label:document.getElementById('ns109Info')?.textContent,
      practice:api.test.practice.on,readyButton:document.getElementById('ns109Classic')?.textContent};
   });
   console.log('V141_LOBBY',width,online,errors);
   assert.ok(online.opened&&online.up&&online.code==='ABCDEF','lobby persists during Village');
   assert.match(online.label,/SERVER UP · ABCDEF/);
   assert.equal(online.practice,true,'training remains available while the room is hosted');
   assert.match(online.readyButton,/LOBI|LOBBY/);
   const reconnect=await page.evaluate(()=>{
    const api=window.NS109_VILLAGE,net=window.__NS110_BRIDGE.NET;
    net.peer._connected=false;net.peer._socket.readyState=3;
    api.frame(performance.now()+50);
    const down={up:api.serverUp,label:document.getElementById('ns109Info').textContent};
    net.peer._connected=true;net.peer._socket.readyState=1;
    api.frame(performance.now()+105);
    const back={up:api.serverUp,label:document.getElementById('ns109Info').textContent};
    net.clients.set('p2',{open:true,send(){}});
    net.profiles.set('p2',{name:'Drugar',level:7});
    api.frame(performance.now()+170);
    return {down,back,count:document.getElementById('ns109Info').textContent,
      join:document.getElementById('ns141Join').textContent};
   });
   console.log('V141_RECONNECT_JOIN',width,reconnect,errors);
   assert.equal(reconnect.down.up,false,'disconnect must never advertise SERVER UP');
   assert.match(reconnect.down.label,/POVEZUJEM|RECONNECTING/);
   assert.equal(reconnect.back.up,true,'actual Cloudflare OPEN must restore UP');
   assert.match(reconnect.count,/2\/6/,'join changes roster without leaving Village');
   assert.match(reconnect.join,/Igrač se pridružio|Player joined/);
   assert.deepEqual(errors.filter(e=>/SyntaxError|ReferenceError|TypeError/.test(e)),[],'runtime exceptions');
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
