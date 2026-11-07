'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright-core');
(async()=>{
 const bin=['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync);if(!bin)throw Error('No Chromium');
 const browser=await chromium.launch({headless:true,executablePath:bin,args:['--no-sandbox','--disable-dev-shm-usage']});
 const contexts=[],errors=[],local=process.env.NS99_USE_LOCAL==='1',url=local?'file://'+path.resolve(__dirname,'../public/index.html'):'https://majorstex.github.io/nocna-straza-v99/';
 async function phone(name){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});contexts.push(context);
  const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
  const r=await p.goto(url,{waitUntil:'domcontentloaded',timeout:30000});if(!local)assert.equal(r?.status(),200);
  await p.waitForFunction(()=>!!window.__nightWatch&&!!window.__NS99_TEAM,{timeout:25000});
  assert.match(await p.title(),/Night Watch v99|Noćna Straža v99/);
  await p.evaluate(()=>document.getElementById('ns82-guest')?.click());
  await p.evaluate(()=>document.getElementById('coopBtn').click());
  await p.evaluate(name=>document.getElementById('mpNameInput').value=name,name);
  return p;
 }
 try{
  const host=await phone('Aleksa99');
  await host.evaluate(()=>document.getElementById('hostBtn').click());
  await host.waitForFunction(()=>window.__nightWatch.NET.role==='host'&&window.__nightWatch.NET.phase==='lobby',{timeout:30000});
  const code=await host.evaluate(()=>window.__nightWatch.NET.code);
  const guest=await phone('Milan99');
  await guest.evaluate(code=>{document.getElementById('joinCode').value=code;document.getElementById('joinBtn').click()},code);
  await guest.waitForFunction(()=>window.__nightWatch.NET.role==='guest'&&window.__nightWatch.NET.phase==='lobby'&&window.__nightWatch.NET.worldReady,{timeout:30000});
  await host.waitForFunction(()=>window.__nightWatch.NET.worldReadyPlayers.get('p2')===true,{timeout:20000});
  await host.evaluate(()=>{const g=window.__nightWatch;g.NET.forceRequest=true;if(!g.startLobbyMatch())throw Error('Host could not start')});
  await guest.waitForFunction(()=>window.__nightWatch.NET.phase==='playing'&&window.__nightWatch.G.mode==='play',{timeout:20000});
  const markets=await host.evaluate(()=>window.__nightWatch.props.filter(p=>p.type==='market').length);
  assert.ok(markets<=2,'max two burger bars');
  // Freeze the entire authoritative run for p2's upgrade, with live relay delivery.
  await host.evaluate(()=>{const g=window.__nightWatch,p=g.G.players.find(x=>x.id==='p2');if(!p)throw Error('Missing guest');g.coopXP(p,p.xpNeed+30)});
  await host.waitForFunction(()=>window.__NS99_TEAM.currentLevel?.id==='p2'&&window.__NS99_TEAM.frozen(),{timeout:4000});
  await guest.waitForFunction(()=>window.__NS99_TEAM.frozen()&&window.__nightWatch.G.quickChoice?.remote===true,{timeout:4000});
  const timeBefore=await host.evaluate(()=>window.__nightWatch.G.time);
  await guest.locator('#quickChoiceItems button').first().click({force:true,timeout:1500});
  await host.waitForFunction(()=>!window.__NS99_TEAM.frozen(),{timeout:4500});
  await guest.waitForFunction(()=>!window.__NS99_TEAM.frozen(),{timeout:4500});
  assert.ok(await host.evaluate(()=>window.__nightWatch.G.players.find(p=>p.id==='p2').level)>=2,'guest level credited');
  console.log('LIVE_UPGRADE_SHARED_3S=yes; waveTime='+timeBefore);
  // A vote is not a forced pause: both players must approve.
  await guest.evaluate(()=>{if(!window.__NS99_TEAM.request('pause'))throw Error('Unable to request pause')});
  await host.waitForFunction(()=>window.__NS99_TEAM.ballot?.kind==='pause',{timeout:7000});
  assert.equal(await host.evaluate(()=>window.__NS99_TEAM.frozen()),false,'single guest cannot force pause');
  await host.evaluate(()=>window.__NS99_TEAM.guestVote('yes'));
  await host.waitForFunction(()=>window.__NS99_TEAM.manualPaused&&window.__NS99_TEAM.frozen(),{timeout:4000});
  await guest.waitForFunction(()=>window.__NS99_TEAM.frozen(),{timeout:4000});
  console.log('LIVE_UNANIMOUS_PAUSE=yes');
  await host.evaluate(()=>{if(!window.__NS99_TEAM.request('resume'))throw Error('Unable to request resume')});
  await guest.waitForFunction(()=>window.__NS99_TEAM.frozen()&&window.__NS99_TEAM.state().seq>=0,{timeout:5000});
  await guest.waitForFunction(()=>!!document.getElementById('ns99PauseYes')&&!document.getElementById('ns99PauseYes').classList.contains('hidden'),{timeout:5000});
  await guest.evaluate(()=>document.getElementById('ns99PauseYes').click());
  await host.waitForFunction(()=>!window.__NS99_TEAM.frozen(),{timeout:4500});
  await guest.waitForFunction(()=>!window.__NS99_TEAM.frozen(),{timeout:4500});
  console.log('LIVE_UNANIMOUS_RESUME=yes');
  await host.evaluate(()=>window.__NS99_TEAM.visibility(true));
  await guest.waitForFunction(()=>window.__NS99_TEAM.frozen(),{timeout:4500});
  await host.evaluate(()=>window.__NS99_TEAM.visibility(false));
  await guest.waitForFunction(()=>!window.__NS99_TEAM.frozen(),{timeout:4500});
  console.log('LIVE_HOST_SCREEN_LOCK_STANDBY=yes');
  assert.deepEqual(errors.filter(x=>/SyntaxError|ReferenceError|TypeError/.test(x)),[],errors.join('\n'));
  console.log('PASS V99 real Cloudflare relay: two phones, two bars, team level pause, voting pause/resume, host lock recovery');
 }finally{for(const c of contexts)await c.close().catch(()=>{});await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
