'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core');
(async()=>{
 const bin=['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync);
 if(!bin)throw Error('Missing Chromium executable');
 const browser=await chromium.launch({headless:true,executablePath:bin,
  args:['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files']});
 try{
  for(const width of [360,412]){
   const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto('file://'+path.resolve(__dirname,'../public/index.html')+'?temple-preview=1',
    {waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.__nightWatch?.G.mode==='play',{timeout:30000});
   const started=await page.evaluate(()=>{
    const api=window.__nightWatch,n=api.NET,g=api.G;
    n.role='host';n.phase='playing';n.localId='p1';n.hostId='p1';n.code='ABCDEF';
    n.clients.clear();n.round=1;
    api.startGame({specialMode:'normal'});
    g.mobs=[];g.wave=39;g.waveClock=70;g.paused=false;
    const p=g.players[0];p.hp=p.maxHp=500;p.invul=4;
    return {mode:g.mode,wave:g.wave};
   });
   assert.equal(started.mode,'play');
   await page.waitForFunction(()=>{
    const g=window.__nightWatch?.G;
    return g?.wave>=40&&g?.ns135WolfSpawned&&g?.mobs.some(m=>m.type==='werewolfAlpha');
   },{timeout:12000});
   const state=await page.evaluate(()=>{
    const game=window.__nightWatch,g=game.G;
    const boss=g.mobs.find(m=>m.type==='werewolfAlpha'&&!m.dead);
    const pups=g.mobs.filter(m=>m.type==='werewolf'&&!m.dead);
    const canvas=document.getElementById('gameCanvas');
    return {wave:g.wave,boss:!!boss,bossHp:boss?.hp,pack:pups.length,
      visibleCanvas:canvas?.width>0&&canvas?.height>0,
      renderOk:!!game.draw,version:document.title,
      wolfFlag:g.ns135WolfSpawned};
   });
   assert.equal(state.wave,40,width+': must be wave 40');
   assert.equal(state.boss,true,width+': alpha spawned');
   assert.ok(state.pack>=2,width+': 2 or more smaller werewolves');
   assert.ok(state.visibleCanvas,width+': canvas initialized');
   assert.equal(state.wolfFlag,true);
   assert.match(state.version,/v\\d+/,'browser version stays current');
   await page.waitForTimeout(400);
   assert.deepEqual(errors.filter(x=>/TypeError|ReferenceError|SyntaxError|RangeError/.test(x)),[],
    width+': runtime errors '+errors.join(' | '));
   console.log('V135 BROWSER PASS '+width+'px: wave 40, alpha + '+state.pack+
    ' pups, game canvas, scripted one-time spawn, no runtime exceptions');
   await context.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
