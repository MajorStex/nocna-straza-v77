'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright-core');
(async()=>{
 const executablePath=['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync);
 if(!executablePath)throw Error('Chromium required');
 const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 const contexts=[],errors=[],url='https://majorstex.github.io/nocna-straza-v97/';
 async function phone(name){
  const c=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});contexts.push(c);
  const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
  const response=await p.goto(url,{waitUntil:'domcontentloaded',timeout:30000});assert.equal(response?.status(),200,'public v97 page loads');
  await p.waitForFunction(()=>window.__nightWatch&&window.__NS97_POST&&window.__NS96_INVITES,{timeout:22000});
  await p.evaluate(()=>document.getElementById('ns82-guest')?.click());
  await p.evaluate(()=>document.getElementById('coopBtn').click());
  await p.evaluate(n=>document.getElementById('mpNameInput').value=n,name);
  return p;
 }
 try{
  const host=await phone('Nikola');
  await host.evaluate(()=>document.getElementById('hostBtn').click());
  await host.waitForFunction(()=>window.__nightWatch.NET.role==='host'&&window.__nightWatch.NET.phase==='lobby',{timeout:25000});
  const code=await host.evaluate(()=>window.__nightWatch.NET.code);
  assert.match(code,/^[A-HJ-NP-Z2-9]{6}$/);
  const guest=await phone('Milan');
  await guest.evaluate(code=>{document.getElementById('joinCode').value=code;document.getElementById('joinBtn').click()},code);
  await guest.waitForFunction(()=>{const n=window.__nightWatch.NET;return n.role==='guest'&&n.phase==='lobby'&&n.worldReady},{timeout:25000});
  await host.waitForFunction(()=>{const n=window.__nightWatch.NET;return n.clients.size===1&&n.worldReadyPlayers.get('p2')===true},{timeout:15000});
  const hostRoster=await host.evaluate(()=>{const n=window.__nightWatch.NET;return n.profiles.get('p2')?.name});
  assert.equal(hostRoster,'Milan','host sees the real player nickname');
  await guest.evaluate(()=>{const g=window.__nightWatch;if(!g.NET.localReady)document.getElementById('lobbyReadyBtn')?.click()});
  await host.waitForFunction(()=>window.__nightWatch.NET.readyPlayers.get('p2')===true,{timeout:10000});
  await host.evaluate(()=>{const g=window.__nightWatch;g.NET.forceRequest=true;if(!g.startLobbyMatch())throw Error('Host did not start match')});
  await guest.waitForFunction(()=>window.__nightWatch.NET.phase==='playing'&&window.__nightWatch.G.mode==='play',{timeout:25000});
  await host.evaluate(()=>{
   const g=window.__nightWatch;g.G.time=92;g.G.wave=6;g.G.kills=24;
   const h=g.G.players.find(p=>p.id==='p1'),guest=g.G.players.find(p=>p.id==='p2');
   if(!h||!guest)throw Error('Missing co-op players');
   h.runKills=16;h.runRevives=2;h.runKnockdowns=1;h.runWeaponDamage=400;
   guest.runKills=8;guest.runRevives=1;guest.runKnockdowns=2;guest.runWeaponDamage=270;
   if(!g.finishNetworkRound(false))throw Error('Could not finish multiplayer round');
  });
  await guest.waitForFunction(()=>{const g=window.__nightWatch;return g.NET.phase==='lobby'&&g.NET.ns97Results?.players?.length===2},{timeout:12000});
  const results=await Promise.all([host,guest].map(p=>p.evaluate(()=>{
   const n=window.__nightWatch.NET;return {phase:n.phase,round:n.round,result:n.ns97Results,visible:!document.getElementById('ns97Results').classList.contains('hidden')};
  })));
  assert.equal(results[0].visible,true);assert.equal(results[1].visible,true);
  assert.equal(results[0].result.kills,24);assert.equal(results[1].result.kills,24);
  assert.deepEqual(results[1].result.players.map(p=>[p.name,p.kills,p.revives]),[['Nikola',16,2],['Milan',8,1]]);
  console.log('LIVE_V97_RESULTS_SYNC=yes');
  await host.evaluate(()=>document.getElementById('ns97VoteYes').click());
  await guest.evaluate(()=>document.getElementById('ns97VoteNo').click());
  await host.waitForFunction(()=>window.__nightWatch.NET.ns97Results?.votes?.p2==='no',{timeout:8000});
  const blocked=await host.evaluate(()=>({phase:window.__nightWatch.NET.phase,startAt:window.__nightWatch.NET.ns97Results.startAt}));
  assert.equal(blocked.phase,'lobby');assert.equal(blocked.startAt,0,'no vote prevents new round');
  console.log('LIVE_V97_NO_VOTE_BLOCKS=yes');
  await guest.evaluate(()=>document.getElementById('ns97VoteYes').click());
  await host.waitForFunction(()=>window.__nightWatch.NET.ns97Results?.votes?.p2==='yes'&&window.__nightWatch.NET.ns97Results.startAt>0,{timeout:10000});
  await host.waitForFunction(()=>window.__nightWatch.NET.phase==='playing',{timeout:13000});
  await guest.waitForFunction(()=>window.__nightWatch.NET.phase==='playing',{timeout:13000});
  console.log('LIVE_V97_ALL_YES_REMATCH=yes');
  assert.deepEqual(errors.filter(e=>/ReferenceError|SyntaxError|TypeError/.test(e)),[],errors.join(' | '));
  console.log('PASS v97 real relay: nicknames, two-browser scoreboard, no-veto, unanimous automatic rematch, same lobby.');
 }finally{for(const c of contexts)await c.close().catch(()=>{});await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
