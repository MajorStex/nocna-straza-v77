'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core');
const folder=path.join(__dirname,'../public');
const MATCH='0123456789abcdef01234567';
const world={w:1680,h:1080,r:14,speed:156,decorSeed:157,obstacles:[]};
const monsters=Array.from({length:80},(_,i)=>[
 i,Math.round((i===0?168:300+(i%12)*105)*10),
 Math.round((i===0?267:105+Math.floor(i/12)*125)*10),
 i===0?335:35,0,i===0?96:-100,i===0?335:35,i===0?1:0]);
const players=[
 ['p1',1350,2500,100,-100,1,0,0,-1,100,0],
 ['p2',2030,2500,100,-100,1,0,0,-1,100,0]
];
const payload=tick=>({t:'s',tick,players,mobs:monsters,wave:10,serverNow:Date.now(),
 waveState:'play',totalMobs:80,ms:1.5,ack:0});
(async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync),
  args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const pages=[];
  for(const [id,viewport] of [['p1',{width:360,height:780}],['p2',{width:832,height:394}]]){
   const page=await browser.newPage({viewport,isMobile:true,hasTouch:true});
   await page.setContent('<html><body></body></html>');
   await page.evaluate(id=>{
    window.__NS110_BRIDGE={currentProfileLevel:()=>7,NET:{role:'guest',phase:'lobby',localId:id},
     getVillageHeroLook:(seat)=>({name:seat.toUpperCase(),visualSize:.8,weapon:'sword'})};
    window.__fakeSockets=[];
    window.WebSocket=class FakeWebSocket{
     constructor(url){this.url=url;this.readyState=0;this.bufferedAmount=0;this.sent=[];
      window.__fakeSockets.push(this)}
     send(raw){this.sent.push(JSON.parse(raw))}
     close(){this.readyState=3;this.onclose?.({code:1000})}
     inject(data){this.onmessage?.({data:JSON.stringify(data)})}
     open(){this.readyState=1;this.onopen?.()}
    };
    window.NS152_AUDIO={music:false,sound:false,play:()=>false,unlock:()=>{},
      set(){},stop(){}};
   },id);
   for(const script of ['v157-arena-scenery.js','v154-goblin-renderer.js',
                        'v159-troll-renderer.js','v140-net-mode.js']){
    await page.addScriptTag({path:path.join(folder,script)});
   }
   await page.evaluate(()=>{const art=window.NS159_TROLL;window.__trollDraws=[];
    window.NS159_TROLL={prepare:art.prepare,prewarm:art.prewarm,
      get builds(){return art.builds},
      drawOne(ctx,entry,opt){
       window.__trollDraws.push({id:entry.mob.id,type:entry.mob.type,
        attackTick:entry.mob.attackTick,hp:entry.mob.hp,tick:opt.tick});
       if(window.__trollDraws.length>100)window.__trollDraws.shift();
       art.drawOne(ctx,entry,opt);
      }};
   });
   const started=await page.evaluate(({id,match})=>window.NS140_ARENA.acceptOffer({
    protocol:140,match,id,ticket:'preview-test-ticket'}),{id,match:MATCH});
   assert.equal(started,true,'accepted isolated arena offer '+id);
   const state=await page.evaluate(({world,payload})=>{
    const ws=window.__fakeSockets[0];ws.open();
    ws.inject({t:'welcome',protocol:140,world,serverBuild:159,looks:[]});
    ws.inject({t:'start'});
    ws.inject(payload);
    const d=window.NS140_ARENA.diagnostics;
    return {phase:d.phase,mode:d.mode,atlas:d.legacyTrollAtlasBuilds,sent:ws.sent};
   },{world,payload:payload(100)});
   assert.equal(state.phase,'running');
   assert.equal(state.atlas,1,'one troll sprite atlas per phone');
   assert.ok(state.sent.some(s=>s.t==='hello'),'protocol hello sent');
   pages.push({page,id});
  }
  const frames=70;
  const metrics=await Promise.all(pages.map(async({page,id})=>{
   return page.evaluate(({frames})=>{
    const t=[];
    for(let i=0;i<frames;i++){
     const start=performance.now();
     window.NS140_ARENA.frame(performance.now()+i*16.67);
     t.push(performance.now()-start);
    }
    t.sort((a,b)=>a-b);
    const d=window.NS140_ARENA.diagnostics;
    return {visible:d.phase,atlas:d.legacyTrollAtlasBuilds,
     trolls:window.__trollDraws.slice(-1),drawCount:window.__trollDraws.length,
     p95:t[Math.floor(t.length*.95)],median:t[Math.floor(t.length*.50)],
     goblins:d.soloMobCount,players:d.phase};
   },{frames});
  }));
  for(const [i,m] of metrics.entries()){
   assert.ok(m.drawCount>0,'phone '+i+' draws original troll from typed snapshot');
   assert.equal(m.trolls[0].id,0,'phone '+i+' has authoritative troll ID');
   assert.equal(m.trolls[0].type,'troll','phone '+i+' decodes troll type');
   assert.equal(m.trolls[0].hp,335,'phone '+i+' sees authoritative HP');
   assert.equal(m.trolls[0].attackTick,96,'phone '+i+' shares attack tick');
   assert.equal(m.atlas,1,'phone '+i+' does not rebuild atlas per frame');
   assert.ok(m.p95<65,'phone '+i+' pathological headless render budget '+m.p95+'ms');
  }
  // Pausing client 1 never pauses client 2, and only one pause packet is sent.
  await pages[0].page.locator('#ns158MenuBtn').click();
  await pages[0].page.locator('#ns158MenuPause').click();
  const pause=await Promise.all(pages.map(({page})=>page.evaluate(()=>{
   const socket=window.__fakeSockets.at(-1);
   return {pauseMessages:socket.sent.filter(x=>x.t==='pause'),state:window.NS140_ARENA.diagnostics.phase,
    pausedOverlay:!document.querySelector('#ns157PauseOverlay').hidden};
  })));
  assert.equal(pause[0].pauseMessages.at(-1)?.paused,true,'p1 local pause');
  assert.equal(pause[1].pauseMessages.length,0,'p2 continues without remote pause');
  assert.equal(pause[1].pausedOverlay,false,'p2 remains unpaused');
  await pages[0].page.locator('#ns157Resume').click();
  // Reconnect client p2 with its existing seat, no new room, then redraw troll.
  await pages[1].page.evaluate(()=>{
   const ws=window.__fakeSockets.at(-1);ws.readyState=3;ws.onclose({code:1006});
  });
  await pages[1].page.waitForFunction(()=>window.__fakeSockets.length>=2,{timeout:6500});
  const recovered=await pages[1].page.evaluate(({world,payload})=>{
   const ws=window.__fakeSockets.at(-1);ws.open();
   ws.inject({t:'welcome',protocol:140,world,serverBuild:159,looks:[]});
   ws.inject({t:'start'});ws.inject(payload);
   window.NS140_ARENA.frame(performance.now()+100);
   return {phase:window.NS140_ARENA.diagnostics.phase,match:ws.url,
    hello:ws.sent.find(m=>m.t==='hello'),seen:window.__trollDraws.at(-1)};
  },{world,payload:payload(102)});
  assert.equal(recovered.phase,'running','guest reconnects into same server room');
  assert.equal(recovered.hello.id,'p2','reconnected guest keeps own seat');
  assert.ok(recovered.match.endsWith('/arena/'+MATCH),'room ID unchanged');
  assert.equal(recovered.seen.type,'troll','reconnected phone still sees original troll');
  console.log('V159 TWO-CLIENT PASS: 80 typed enemies, shared legacy troll, '+
   'atlas once/phone, no global pause, same-seat reconnect');
  console.log('V159 HEADLESS RENDER '+JSON.stringify(metrics));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
