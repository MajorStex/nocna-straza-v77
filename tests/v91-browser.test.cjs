'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright-core');
(async()=>{
 const executablePath=['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(p=>fs.existsSync(p));
 if(!executablePath)throw Error('Browser not present on runner');
 const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const width of [360,412]){
   const context=await browser.newContext({viewport:{width,height:800},deviceScaleFactor:1,isMobile:true,hasTouch:true});
   const page=await context.newPage();
   const runtimeErrors=[];
   page.on('pageerror',error=>runtimeErrors.push(String(error.message||error)));
   const res=await page.goto('https://majorstex.github.io/nocna-straza-v91/',{waitUntil:'domcontentloaded',timeout:30000});
   assert.equal(res.status(),200,'public game HTTP 200');
   await page.waitForFunction(()=>!!window.__nightWatch&&!!window.__NS91,{timeout:25000});
   assert.match(await page.title(),/Night Watch v91/);
   assert.equal(await page.locator('#gameCanvas').count(),1);
   assert.equal(await page.locator('#nsAchievementsBtn').count(),1);
   const state=await page.evaluate(()=>{
    const game=window.__nightWatch,ach=window.__NS91;
    game.startGame({specialMode:'normal'});
    if(game.G.mode!=='play')return {error:'Game did not start'};
    const p=game.G.players[0];
    game.G.kills=99;
    const mob=game.addMob('crawler',p.x+90,p.y+90);mob.hp=1;
    game.killMob(mob,p);
    const gear=game.NSX.armory.inventory.find(it=>it.uid?.includes('ns91_')&&it.uid.endsWith('_k100'));
    return {gameMode:game.G.mode,kills:game.G.kills,team:game.G.players.length,badge:ach.owned('k100'),mask:ach.getMask(),gear:gear&&{rarity:gear.rarity,template:gear.template},language:document.documentElement.lang};
   });
   assert.equal(state.gameMode,'play','solo starts in browser');
   assert.equal(state.kills,100,'solo actual kill callback');
   assert.equal(state.team,1,'one solo player');
   assert.equal(state.badge,true,'100 kill badge persisted');
   assert.equal(state.mask&1,1,'badge host mask updated');
   assert.equal(state.gear?.rarity,'common','common equipment awarded');
   assert.equal(state.gear?.template,'scout_wrap','correct reward');
   const genuineErrors=runtimeErrors.filter(x=>/ReferenceError|SyntaxError|is not defined|Cannot read properties of undefined|NS91/i.test(x));
   assert.deepEqual(genuineErrors,[],'no game script exceptions: '+genuineErrors.join(' | '));
   console.log('PASS mobile Chromium '+width+'px: public v91 loaded, started solo, kill 100, unique common gear and achievement');
   await context.close();
  }
 } finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
