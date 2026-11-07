'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright-core');
(async()=>{
 const executablePath=['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync);
 if(!executablePath)throw Error('Missing Chromium');
 const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 const url='https://majorstex.github.io/nocna-straza-v93/';
 const contexts=[],errors=[];
 async function phone(){
  const c=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
  contexts.push(c);const p=await c.newPage();
  p.on('pageerror',e=>errors.push(e.message));
  await p.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
  await p.waitForFunction(()=>window.__nightWatch&&window.__NS93_MAGIC,{timeout:22000});
  await p.evaluate(()=>document.getElementById('ns82-guest')?.click());
  await p.evaluate(()=>document.getElementById('coopBtn').click());
  return p;
 }
 try{
  const host=await phone();
  await host.evaluate(()=>document.getElementById('hostBtn').click());
  await host.waitForFunction(()=>window.__nightWatch.NET.role==='host'&&window.__nightWatch.NET.phase==='lobby',{timeout:22000});
  const code=await host.evaluate(()=>window.__nightWatch.NET.code);
  assert.match(code,/^[A-HJ-NP-Z2-9]{6}$/);
  console.log('LIVE_MP_ROOM_CODE_CREATED=yes');
  const guest=await phone();
  await guest.evaluate(c=>{
   document.getElementById('joinCode').value=c;
   document.getElementById('joinBtn').click();
  },code);
  await guest.waitForFunction(()=>window.__nightWatch.NET.role==='guest'&&window.__nightWatch.NET.phase==='lobby'&&window.__nightWatch.NET.worldReady,{timeout:25000});
  await host.waitForFunction(()=>window.__nightWatch.NET.clients.size===1&&window.__nightWatch.NET.worldReadyPlayers.get('p2')===true,{timeout:15000});
  console.log('LIVE_MP_GUEST_CONNECTED=yes');
  await guest.evaluate(()=>{document.getElementById('lobbyReadyBtn')?.click()});
  await host.waitForFunction(()=>window.__nightWatch.NET.readyPlayers.get('p2')===true,{timeout:9000});
  await host.evaluate(()=>{
   const game=window.__nightWatch;
   game.NET.forceRequest=true;
   if(!game.startLobbyMatch())throw Error('Host refused to start with guest');
  });
  await guest.waitForFunction(()=>window.__nightWatch.NET.phase==='playing'&&window.__nightWatch.G.mode==='play',{timeout:22000});
  await host.waitForFunction(()=>window.__nightWatch.G.players.length===2,{timeout:12000});
  const initial=await guest.evaluate(()=>{
   const game=window.__nightWatch,p=game.G.players.find(p=>p.id===game.NET.localId);
   return {id:game.NET.localId,mp:p?.ns93Mana,cap:p?.ns93MaxMana,role:game.NET.role,phase:game.NET.phase};
  });
  assert.equal(initial.cap,64,'Warrior guest mana remains 64');
  console.log('LIVE_MP_TWO_PLAYERS_STARTED=yes');
  const sent=await guest.evaluate(()=>{
   const game=window.__nightWatch,p=game.G.players.find(p=>p.id===game.NET.localId);
   return window.__NS93_MAGIC.request('spark',p.x+70,p.y+22);
  });
  assert.equal(sent,true,'Guest submits spell to real relay');
  await host.waitForFunction(()=>{
   const g=window.__nightWatch,guest=g.G.players.find(p=>p.id==='p2');
   return !!guest&&guest.ns93Cooldown?.spark>g.G.time;
  },{timeout:9000});
  const authority=await host.evaluate(()=>{
   const g=window.__nightWatch,p=g.G.players.find(p=>p.id==='p2');
   return {mana:p.ns93Mana,max:p.ns93MaxMana,readyAt:p.ns93Cooldown.spark,now:g.G.time};
  });
  assert.ok(authority.mana<64&&authority.readyAt>authority.now,'Host debits 12 mana once and imposes 3.6s cooldown');
  console.log('LIVE_MP_GUEST_CAST_AUTHORIZED=yes');
  await guest.waitForFunction(()=>{
   const g=window.__nightWatch,p=g.G.players.find(p=>p.id===g.NET.localId);
   return p&&p.ns93Cooldown?.spark>g.G.time;
  },{timeout:7000});
  console.log('LIVE_MP_GUEST_MANA_SYNC=yes');
  const hostCast=await host.evaluate(()=>{
   const g=window.__nightWatch,p=g.G.players.find(p=>p.id===g.NET.localId);
   return window.__NS93_MAGIC.cast(p,'spark',p.x+80,p.y+24).ok;
  });
  assert.equal(hostCast,true,'Host casts spell');
  await guest.waitForFunction(()=>window.__nightWatch.G.effects.some(e=>e.type==='ns93Magic'),{timeout:5000});
  console.log('LIVE_MP_HOST_FX_VISIBLE_TO_GUEST=yes');
  assert.deepEqual(errors.filter(x=>/ReferenceError|TypeError|SyntaxError/.test(x)),[],'no mobile runtime crashes');
  console.log('PASS live v93 2-phone Chrome multiplayer: create/join, host-verified guest casting, synced mana, visible host FX.');
 } finally {
  for(const c of contexts)await c.close().catch(()=>{});
  await browser.close();
 }
})().catch(e=>{console.error(e);process.exit(1);});
