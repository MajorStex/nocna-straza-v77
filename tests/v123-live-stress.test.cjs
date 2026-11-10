'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('playwright-core');
const url='https://nocna-straza-v77.stefanstevic1996.workers.dev/?v=123&mp-stress-qa=1';
(async()=>{
 const bin=['/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);
 const browser=await chromium.launch({headless:true,executablePath:bin,args:['--no-sandbox','--disable-dev-shm-usage']});
 const contexts=[],pages=[],errors=[];
 try{
  for(let i=0;i<4;i++){
   const context=await browser.newContext({viewport:{width:i%2?412:360,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
   contexts.push(context);
   const page=await context.newPage();pages.push(page);
   page.on('pageerror',e=>errors.push('P'+i+':'+e.message));
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:35000});
   await page.waitForFunction(()=>window.__nightWatch&&window.__NS123_PERF&&window.NS109_VILLAGE,{timeout:22000});
  }
  const host=pages[0],guests=pages.slice(1);
  await host.evaluate(()=>{document.getElementById('coopBtn').click();document.getElementById('hostBtn').click()});
  await host.waitForFunction(()=>{const n=window.__NS110_BRIDGE.NET;return n.role==='host'&&n.phase==='lobby'&&n.code.length===6},{timeout:30000});
  const room=await host.evaluate(()=>window.__NS110_BRIDGE.NET.code);
  console.log('V123 LIVE 4-PARTY HOST',room);
  await Promise.all(guests.map(async guest=>{
   await guest.evaluate(code=>{document.getElementById('coopBtn').click();document.getElementById('joinCode').value=code;document.getElementById('joinBtn').click()},room);
   await guest.waitForFunction(code=>{const n=window.__NS110_BRIDGE.NET;return n.phase==='lobby'&&n.role==='guest'&&n.code===code},room,{timeout:35000});
  }));
  await host.waitForFunction(()=>window.__NS110_BRIDGE.currentLobbyRoster().length===4,null,{timeout:30000});
  // The lobby appears before world transfer finishes. Never click a disabled
  // Ready button: doing so races map synchronization and creates false failures.
  await Promise.all(guests.map(g=>g.waitForFunction(()=>{
   const n=window.__NS110_BRIDGE.NET,b=document.getElementById('lobbyReadyBtn');
   return n.phase==='lobby'&&n.worldReady&&b&&!b.disabled;
  },null,{timeout:40000})));
  await Promise.all(guests.map(g=>g.evaluate(()=>document.getElementById('lobbyReadyBtn').click())));
  await host.waitForFunction(()=>{
   const b=window.__NS110_BRIDGE,n=b.NET;
   return b.currentLobbyRoster().length===4&&b.currentLobbyRoster().every(p=>p.ready)&&
     [...n.worldReadyPlayers.values()].filter(Boolean).length>=3;
  },{timeout:25000});
  const beforeStart=await host.evaluate(()=>{
   const a=window.__NS110_BRIDGE,n=a.NET,button=document.getElementById('lobbyStartBtn');
   return {buttonDisabled:button.disabled,ready:a.currentLobbyRoster().map(p=>({id:p.id,ready:p.ready})),
     synced:[...n.worldReadyPlayers.entries()],localReady:n.localReady};
  });
  console.log('V123 LOBBY READY DIAGNOSTIC',JSON.stringify(beforeStart));
  // Check whether an out-of-date host UI is hiding an otherwise-ready room.
  await host.evaluate(()=>window.__nightWatch.renderLobby());
  await host.waitForFunction(()=>{const b=document.getElementById('lobbyStartBtn');return b&&!b.disabled},null,{timeout:9000});
  await host.evaluate(()=>document.getElementById('lobbyStartBtn').click());
  await Promise.all(pages.map(p=>p.waitForFunction(()=>window.__NS110_BRIDGE.NET.phase==='playing'&&window.__nightWatch.G.mode==='play',{timeout:30000})));
  console.log('V123 FOUR REAL PLAYERS IN GAME',room);
  // Stress the real host AI with many nearby active monsters. No mocked
  // WebSockets or fake FPS; guest snapshots pass through the live relay.
  const spawned=await host.evaluate(()=>{
   const w=window.__nightWatch,p=w.G.players[0];
   for(const q of w.G.players){q.maxHp=5000;q.hp=5000;q.attackCD=99999}
   for(let i=0;i<57;i++){
    const angle=i*Math.PI*2/57,radius=220+(i%4)*63;
    w.addMob(['goblin','crawler','skeleton','brute','worm'][i%5],
      p.x+Math.cos(angle)*radius,p.y+Math.sin(angle)*radius);
   }
   return {count:w.G.mobs.length,hostRoom:w.NET.code};
  });
  assert.ok(spawned.count>=50&&spawned.hostRoom===room,'Mob stress setup failed '+JSON.stringify(spawned));
  const before=await Promise.all(pages.map(p=>p.evaluate(()=>({
    time:performance.now(),count:window.__NS112_MP_DIAG().snapshot,phase:window.__NS110_BRIDGE.NET.phase
  }))));
  // Input, snapshots, render and AI run concurrently for multiple seconds.
  await Promise.all(guests.map(g=>g.keyboard.down('ArrowRight')));
  await new Promise(r=>setTimeout(r,900));
  await Promise.all(guests.map(g=>g.keyboard.up('ArrowRight')));
  await new Promise(r=>setTimeout(r,9600));
  const diag=await Promise.all(pages.map(p=>p.evaluate(()=>{
   const w=window.__nightWatch,n=window.__NS110_BRIDGE.NET;
   return {phase:n.phase,room:n.code,mode:w.G.mode,time:w.G.time,
      mobs:w.G.mobs.length,players:w.G.players.length,paused:w.G.paused,teamFrozen:window.__NS99_TEAM?.frozen?.()||false,
      diagnostics:window.__NS112_MP_DIAG(),render:window.__NS77PERF.status(),
      frame:window.__NS94_FX.stats(),cpu:window.__NS123_PERF(),
      heap:performance.memory?.usedJSHeapSize||0};
  })));
  for(let i=0;i<diag.length;i++){
   assert.equal(diag[i].phase,'playing','Player '+i+' lost phase '+JSON.stringify(diag[i]));
   assert.equal(diag[i].room,room,'Player '+i+' changed rooms');
   assert.ok(diag[i].time>4,'World clock not progressing on player '+i);
   if(i>0)assert.ok(diag[i].diagnostics.snapshot.hz>=2||diag[i].diagnostics.snapshot.periodMs>0,
     'Guest '+i+' did not receive snapshots '+JSON.stringify(diag[i].diagnostics));
  }
  assert.ok(diag[0].diagnostics.snapshot.packets>=12,'Host did not send snapshots');
  assert.ok(diag[0].cpu.gridBuilds>=100,'Host grid CPU stress did not execute');
  assert.ok(diag[0].cpu.gridNewBuckets<1000,'AI bucket pool ran away '+JSON.stringify(diag[0].cpu));
  assert.ok(errors.length<=2,'JavaScript pageerrors: '+errors.join(' | '));
  console.log('V123 LIVE FOUR-PLAYER HEAVY COMBAT PASS',JSON.stringify({
    room,baseline:before,mobs:spawned.count,players:diag.map((d,i)=>({
       id:i,phase:d.phase,fps:d.diagnostics.fps,renderMs:d.render.drawMs,quality:d.frame.tier,
       snapshot:d.diagnostics.snapshot,netBuffer:d.diagnostics.hostBufferBytes,
       mobs:d.mobs,time:Math.round(d.time*10)/10,paused:d.paused,frozen:d.teamFrozen,grid:d.cpu,heapMB:Math.round(d.heap/1048576)
    })),errors
  }));
  // A missing guest should never crash the host or break remaining clients.
  await pages[3].close();await new Promise(r=>setTimeout(r,1700));
  const departure=await host.evaluate(()=>({phase:window.__NS110_BRIDGE.NET.phase,
    clients:[...window.__NS110_BRIDGE.NET.clients.values()].filter(x=>x?.open).length}));
  assert.equal(departure.phase,'playing','Guest departure broke host run');
  assert.ok(departure.clients<=2,'Disconnected guest never left roster '+JSON.stringify(departure));
  console.log('V123 LIVE GUEST LEAVE SURVIVES PASS',JSON.stringify(departure));
 }finally{
  await Promise.all(contexts.map(c=>c.close().catch(()=>{})));
  await browser.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1});