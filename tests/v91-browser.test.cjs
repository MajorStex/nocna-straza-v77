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
    const beforeTeam=game.G.players.length;
    let multiplayer=null;
    if(innerWidth>=400){
      const net=game.NET,received=[];
      for(let i=2;i<=6;i++){
        const id='p'+i;
        game.G.players.push({...p,id,x:p.x+i*25,y:p.y+i*15,perks:{},perkTimers:{},dead:false});
        net.clients.set(id,{open:true,bufferSize:0,peer:'test-peer-'+i,send(packet){if(packet?.t==='snapshot')received.push({id,packet});}});
      }
      net.role='host';net.phase='playing';net.localId='p1';net.round=1;
      game.sendSnapshot();
      multiplayer={clients:received.length,allPlayers:received.map(x=>x.packet.p?.length),masks:received.map(x=>x.packet.a91),bytes:received.map(x=>JSON.stringify(x.packet).length)};
    }
    return {gameMode:game.G.mode,kills:game.G.kills,team:beforeTeam,badge:ach.owned('k100'),mask:ach.getMask(),gear:gear&&{rarity:gear.rarity,template:gear.template},language:document.documentElement.lang,multiplayer};
   });
   assert.equal(state.gameMode,'play','solo starts in browser');
   assert.equal(state.kills,100,'solo actual kill callback');
   assert.equal(state.team,1,'one solo player');
   assert.equal(state.badge,true,'100 kill badge persisted');
   assert.equal(state.mask&1,1,'badge host mask updated');
   assert.equal(state.gear?.rarity,'common','common equipment awarded');
   assert.equal(state.gear?.template,'scout_wrap','correct reward');
   if(width>=400){
     assert.equal(state.multiplayer?.clients,5,'host sent to all five simulated guests');
     assert.deepEqual(state.multiplayer?.allPlayers,[6,6,6,6,6],'six players in each snapshot');
     assert.deepEqual(state.multiplayer?.masks,[1,1,1,1,1],'achievement badge mask synchronized to every guest');
     assert.ok(state.multiplayer?.bytes.every(n=>n>250&&n<150000),'bounded snapshot payload size');
   }
   const genuineErrors=runtimeErrors.filter(x=>/ReferenceError|SyntaxError|is not defined|Cannot read properties of undefined|NS91/i.test(x));
   assert.deepEqual(genuineErrors,[],'no game script exceptions: '+genuineErrors.join(' | '));
   console.log('PASS mobile Chromium '+width+'px: public v91, solo kill 100, Common gear'+(width>=400?', five guest snapshots / six players':'') );
   await context.close();
  }
 } finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
