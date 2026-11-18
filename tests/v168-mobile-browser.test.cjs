'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core');
(async()=>{
 const bin=['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync);
 if(!bin)throw Error('Chrome/Chromium required');
 const browser=await chromium.launch({headless:true,executablePath:bin,
  args:['--no-sandbox','--allow-file-access-from-files','--disable-dev-shm-usage']});
 try{
  for(const width of [360,412]){
   const page=await browser.newPage({viewport:{width,height:800},isMobile:true,hasTouch:true});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('file://'+path.resolve(__dirname,'../public/index.html')+'?v168-demo=1',{waitUntil:'domcontentloaded'});
   const boot=await page.evaluate(()=>{
    const api=window.NS140_ARENA;
    const started=api?.startSolo?.()===true;
    if(started)for(let i=0;i<10;i++)api.frame(performance.now()+i*34);
    const d=api?.diagnostics||{};
    const exp=document.querySelector('#ns168XpHud');
    const text=document.querySelector('#ns168XpText');
    const canvas=document.querySelector('#ns140Canvas');
    return {started,world:[d.worldWidth,d.worldHeight],xp:[d.runLevel,d.runXp,d.runXpNeed],
     xpVisible:exp&&!exp.hidden,xpText:text?.textContent||'',canvas:[canvas?.width||0,canvas?.height||0],
     scenery:d.treeColliderCount+d.rockColliderCount,spawns:d.soloMobCount};
   });
   assert.equal(boot.started,true,'solo New Zone must start');
   assert.deepEqual(boot.world,[4200,4200]);
   assert.deepEqual(boot.xp,[1,0,160]);
   assert(boot.xpVisible,'XP bar visible in mobile arena');
   assert(boot.xpText.includes('NIVO 1'));
   assert(boot.canvas[0]>0&&boot.canvas[1]>0,'world renders on Android viewport');
   assert(boot.scenery>=120);
   assert(boot.spawns>=3&&boot.spawns<=12,'V211 first wave starts with a small bounded active group');
   // Observe real elapsed simulation, not a fast-forward frame that could hide startup stalls.
   await page.waitForFunction(()=>window.NS140_ARENA.diagnostics.soloMobCount>3,null,{timeout:10000});
   const reinforced=await page.evaluate(()=>window.NS140_ARENA.diagnostics);
   assert(reinforced.soloMobCount<=12,'wave-one active cap');
   assert(!errors.some(e=>/SyntaxError|ReferenceError|TypeError/.test(e)),'browser runtime error '+errors.join(','));
   console.log('V168 MOBILE CHROMIUM PASS',width+'px',JSON.stringify(boot));
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
