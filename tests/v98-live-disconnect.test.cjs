'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright-core');
(async()=>{
 const executablePath=['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync);
 if(!executablePath)throw Error('Chromium required');
 const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 const contexts=[],errors=[],url='https://majorstex.github.io/nocna-straza-v98/';
 async function phone(name){
  const c=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});contexts.push(c);
  const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
  const res=await p.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
  assert.equal(res?.status(),200,'v98 public page exists');
  await p.waitForFunction(()=>window.__nightWatch&&window.__NS93_MAGIC&&window.__NS97_POST,{timeout:20000});
  assert.match(await p.title(),/Night Watch v98/);
  await p.evaluate(()=>document.getElementById('ns82-guest')?.click());
  await p.evaluate(()=>document.getElementById('coopBtn').click());
  await p.evaluate(name=>document.getElementById('mpNameInput').value=name,name);
  return p;
 }
 try{
  const host=await phone('Host98');
  await host.evaluate(()=>document.getElementById('hostBtn').click());
  await host.waitForFunction(()=>{let n=window.__nightWatch.NET;return n.role==='host'&&n.phase==='lobby'},{timeout:25000});
  const code=await host.evaluate(()=>window.__nightWatch.NET.code);
  const guest=await phone('Guest98');
  await guest.evaluate(code=>{document.getElementById('joinCode').value=code;document.getElementById('joinBtn').click()},code);
  await guest.waitForFunction(()=>{const n=window.__nightWatch.NET;return n.role==='guest'&&n.phase==='lobby'&&n.worldReady},{timeout:25000});
  await host.waitForFunction(()=>{const n=window.__nightWatch.NET;return n.clients.size===1&&n.worldReadyPlayers.get('p2')},{timeout:12000});
  await host.evaluate(()=>{
   const g=window.__nightWatch;g.NET.forceRequest=true;
   if(!g.startLobbyMatch())throw Error('Failed to start multiplayer match');
  });
  await guest.waitForFunction(()=>window.__nightWatch.NET.phase==='playing'&&window.__nightWatch.G.mode==='play',{timeout:20000});
  const before=await host.evaluate(()=>{
   const g=window.__nightWatch,n=g.NET,h=g.G.players.find(p=>p.id==='p1'),remote=g.G.players.find(p=>p.id==='p2');
   if(!h||!remote)throw Error('Missing remote player');
   g.NSX.progress.hasRope=true;
   remote.x=h.x+450;remote.y=h.y+380;
   const test={type:'cave',x:h.x,y:h.y,id:989900,state:'ready',done:false,rewarded:false};
   window.__v98CaveTest=test;
   return {blocked:g.NSX.enterCaveEvent(test)===false,connected:n.clients.get('p2')?.open===true};
  });
  assert.equal(before.connected,true);assert.equal(before.blocked,true,'connected guest must approach entrance');
  await guest.close();
  await host.waitForFunction(()=>window.__nightWatch.NET.clients.size===0,{timeout:15000});
  const after=await host.evaluate(()=>{
   const g=window.__nightWatch,n=g.NET,h=g.G.players.find(p=>p.id==='p1'),old=g.G.players.find(p=>p.id==='p2');
   if(!old||old.dead)throw Error('Disconnected player should remain for reconnection');
   const entered=g.NSX.enterCaveEvent(window.__v98CaveTest),inCave=g.G.caveMode;
   h.x=852;h.y=718;
   g.NSX.caveTick();
   const exited=!g.G.caveMode&&g.NSX.progress.cave.active===false;
   window.__NS93_MAGIC.renderHud();
   const dock=document.getElementById('ns93SpellDock');
   const activeMana=!dock.classList.contains('hidden');
   document.getElementById('coopPanel').classList.remove('hidden');
   document.getElementById('controls').classList.add('hidden');
   window.__NS93_MAGIC.renderHud();
   return {entered,inCave,exited,activeMana,hiddenInLobby:dock.classList.contains('hidden'),remaining:n.clients.size,ghostStillTracked:!!old};
  });
  assert.equal(after.entered,true,'last connected player may enter cave');
  assert.equal(after.inCave,true);
  assert.equal(after.exited,true,'last connected player may exit cave');
  assert.equal(after.activeMana,true,'mana in gameplay');
  assert.equal(after.hiddenInLobby,true,'mana hidden in matchmaking');
  assert.equal(after.ghostStillTracked,true,'player preserved for reconnect');
  assert.deepEqual(errors.filter(e=>/ReferenceError|SyntaxError|TypeError/.test(e)),[],errors.join(' | '));
  console.log('PASS v98 live Cloudflare relay: two players, connected teammate blocks cave, one disconnects, remaining host enters/exits alone, mana hidden in lobby.');
 }finally{for(const c of contexts)await c.close().catch(()=>{});await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
