'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('playwright-core');
const url='https://nocna-straza-v77.stefanstevic1996.workers.dev/?v=124&six-player-qa=1';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:['/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync),args:['--no-sandbox','--disable-dev-shm-usage']});
 const contexts=[],pages=[],errors=[];
 try{
  for(let i=0;i<6;i++){
   const ctx=await browser.newContext({viewport:{width:i%2?360:412,height:740},isMobile:true,hasTouch:true,deviceScaleFactor:1});
   contexts.push(ctx);const p=await ctx.newPage();pages.push(p);
   p.on('pageerror',e=>errors.push('P'+i+':'+e.message));
   await p.goto(url,{waitUntil:'domcontentloaded',timeout:35000});
   await p.waitForFunction(()=>window.__nightWatch&&window.NS109_VILLAGE,{timeout:16000});
  }
  const host=pages[0];
  await host.evaluate(()=>{document.getElementById('coopBtn').click();document.getElementById('hostBtn').click()});
  await host.waitForFunction(()=>window.__NS110_BRIDGE.NET.phase==='lobby',null,{timeout:30000});
  const room=await host.evaluate(()=>window.__NS110_BRIDGE.NET.code);
  assert.ok(room.length===6);
  for(let i=1;i<6;i++){
   const g=pages[i];
   await g.evaluate(code=>{document.getElementById('coopBtn').click();document.getElementById('joinCode').value=code;document.getElementById('joinBtn').click()},room);
   await g.waitForFunction(code=>{
    const n=window.__NS110_BRIDGE.NET;
    return n.role==='guest'&&n.phase==='lobby'&&n.code===code&&n.worldReady;
   },room,{timeout:45000});
   await g.evaluate(()=>{const n=window.__NS110_BRIDGE.NET;if(!n.localReady)document.getElementById('lobbyReadyBtn').click()});
   await host.waitForFunction(count=>window.__NS110_BRIDGE.currentLobbyRoster().length===count,i+1,{timeout:12000});
   console.log('V124 REAL 6-PLAYER ROOM FILLED',i+1,'/',6);
  }
  await host.waitForFunction(()=>{
   const b=window.__NS110_BRIDGE,n=b.NET,roster=b.currentLobbyRoster();
   return roster.length===6&&roster.every(p=>p.ready)&&roster.slice(1).every(p=>n.worldReadyPlayers.get(p.id));
  },null,{timeout:20000});
  const readiness=await host.evaluate(()=>{
   const b=window.__NS110_BRIDGE;return {code:b.NET.code,players:b.currentLobbyRoster().map(p=>({id:p.id,ready:p.ready})),synced:[...b.NET.worldReadyPlayers.entries()]};
  });
  assert.equal(readiness.players.length,6);
  await host.evaluate(()=>{window.__nightWatch.renderLobby();document.getElementById('lobbyStartBtn').click()});
  await Promise.all(pages.map(p=>p.waitForFunction(code=>{
   const n=window.__NS110_BRIDGE.NET;
   return n.phase==='playing'&&n.code===code&&window.__nightWatch.G.mode==='play';
  },room,{timeout:30000})));
  await new Promise(r=>setTimeout(r,3500));
  const stats=await Promise.all(pages.map(p=>p.evaluate(()=>{
   const b=window.__NS110_BRIDGE;
   return {role:b.NET.role,phase:b.NET.phase,code:b.NET.code,round:b.NET.round,diag:window.__NS112_MP_DIAG(),
     mobs:window.__nightWatch.G.mobs.length,fps:window.__NS94_FX.stats().estimatedFps};
  })));
  assert.ok(stats.every(x=>x.phase==='playing'&&x.code===room),'Players diverged after start '+JSON.stringify(stats));
  assert.ok(stats.slice(1).every(x=>x.diag.snapshot.periodMs>0||x.diag.snapshot.hz>0),
   'One of five guests did not receive host snapshots '+JSON.stringify(stats));
  assert.equal(errors.length,0,'Page script errors '+errors.join(' | '));
  console.log('V124 LIVE SIX PLAYER LOBBY + START + SNAPSHOTS PASS',JSON.stringify({room,readiness,stats,errors}));
 }finally{
  await Promise.all(contexts.map(c=>c.close().catch(()=>{})));
  await browser.close();
 }
})().catch(err=>{console.error(err);process.exitCode=1});