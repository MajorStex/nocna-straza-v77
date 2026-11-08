'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright-core');
(async()=>{
 const bin=['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync);
 const browser=await chromium.launch({headless:true,executablePath:bin,args:['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files']});
 const contexts=[],errors=[],root='file://'+path.resolve(__dirname,'../public/index.html');
 async function phone(label,url=root){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});contexts.push(context);
  const page=await context.newPage();page.on('pageerror',e=>errors.push(label+': '+e.message));
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>!!window.__nightWatch&&!!window.NS82_CLOUD,{timeout:20000});
  await page.evaluate(()=>document.getElementById('ns82-guest')?.click());
  return page;
 }
 try{
  const host=await phone('host');
  await host.locator('#coopBtn').click({timeout:8000});
  await host.locator('#hostBtn').click({timeout:8000});
  await host.waitForFunction(()=>window.__nightWatch?.NET.phase==='lobby'&&window.__nightWatch.NET.role==='host',{timeout:30000});
  const code=await host.evaluate(()=>window.__nightWatch.NET.code);
  assert.match(code,/^[A-HJ-NP-Z2-9]{6}$/);
  const guest=await phone('guest');
  await guest.locator('#coopBtn').click({timeout:8000});
  await guest.locator('#joinCode').fill(code);
  await guest.locator('#joinBtn').click();
  await guest.waitForFunction(()=>window.__nightWatch.NET.phase==='lobby'&&window.__nightWatch.NET.worldReady,{timeout:30000});
  await host.waitForFunction(()=>window.__nightWatch.NET.clients.size===1&&window.__nightWatch.NET.clients.has('p2'),{timeout:18000});
  assert.equal(await guest.evaluate(()=>window.__nightWatch.NET.localId),'p2');
  console.log('LIVE_JOIN: '+code+' p2 was assigned exactly once.');
  // Real browser restart: localStorage retains identity. A room code invite joins automatically.
  await guest.goto(root+'?join='+code,{waitUntil:'domcontentloaded'});
  await guest.waitForFunction(()=>!!window.NS82_CLOUD&&!!window.__NS107_LINK_JOIN,{timeout:15000});
  await guest.evaluate(()=>document.getElementById('ns82-guest')?.click());
  await guest.waitForFunction(()=>window.__nightWatch.NET.phase==='lobby'&&window.__nightWatch.NET.worldReady,{timeout:35000});
  const after=await host.evaluate(()=>({ids:[...window.__nightWatch.NET.clients.keys()],profiles:[...window.__nightWatch.NET.profiles.keys()]}));
  assert.deepEqual(after.ids,['p2'],'Rejoining via invite link must not create duplicate p3');
  console.log('LIVE_REJOIN_LOBBY: same p2 slot reused, link auto-filled and connected.');
  await host.evaluate(()=>{const g=window.__nightWatch;g.NET.forceRequest=true;if(!g.startLobbyMatch())throw Error('Could not launch co-op')});
  await guest.waitForFunction(()=>window.__nightWatch.NET.phase==='playing'&&window.__nightWatch.G.mode==='play',{timeout:20000});
  await host.evaluate(()=>{const g=window.__nightWatch;if(!window.__NS99_TEAM.beginShop('p2','guild',7))throw Error('Shop selection did not start')});
  await host.waitForFunction(()=>!document.getElementById('ns107WaitOverlay').classList.contains('hidden'),{timeout:3000});
  await guest.waitForFunction(()=>window.__NS99_TEAM.frozen(),{timeout:5500});
  assert.equal(await guest.evaluate(()=>document.getElementById('ns107WaitOverlay').classList.contains('hidden')),true,'Chooser must not see waiting overlay');
  await host.evaluate(()=>{if(!window.__NS99_TEAM.finishShop('p2','guild'))throw Error('Shop did not finish')});
  await guest.waitForFunction(()=>!window.__NS99_TEAM.frozen(),{timeout:6500});
  console.log('LIVE_SHOP: team freezes and resumes with correct chooser HUD');
  await guest.goto(root+'?join='+code,{waitUntil:'domcontentloaded'});
  await guest.waitForFunction(()=>!!window.NS82_CLOUD&&!!window.__NS107_LINK_JOIN,{timeout:15000});
  await guest.evaluate(()=>document.getElementById('ns82-guest')?.click());
  await guest.waitForFunction(()=>window.__nightWatch.NET.phase==='playing'&&window.__nightWatch.NET.localId==='p2'&&window.__nightWatch.NET.lastSnapSeq>0,{timeout:35000});
  const unique=await host.evaluate(()=>({ids:[...window.__nightWatch.NET.clients.keys()],players:window.__nightWatch.G.players.filter(p=>p.id==='p2').length}));
  assert.deepEqual(unique.ids,['p2']);
  assert.equal(unique.players,1,'Resumed player must not duplicate host-authored hero');
  console.log('LIVE_RESUME_PLAYING: same p2 hero and host state restored after page exit');
  assert.deepEqual(errors.filter(x=>/ReferenceError|TypeError|SyntaxError/.test(x)),[],errors.join('\n'));
 }finally{await Promise.all(contexts.map(c=>c.close().catch(()=>{})));await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
