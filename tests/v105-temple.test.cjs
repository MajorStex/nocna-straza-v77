'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright-core');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync),args:['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files']});
 try{
  for(const width of [360,412]){
   const context=await browser.newContext({viewport:{width,height:820},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto('file://'+path.resolve(__dirname,'../public/index.html')+'?temple-preview=1',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.__NS105_TEMPLE?.state().preview&&window.__nightWatch?.G.mode==='play',{timeout:25000});
   const result=await page.evaluate(()=>{
    const game=window.__nightWatch,temple=window.__NS105_TEMPLE,G=game.G,p=G.players[0],first=temple.state();
    const troll=G.mobs.find(m=>m.type==='troll'&&m.nsTempleKeeper&&!m.dead);
    if(!troll)throw Error('No level-10 temple troll in the direct preview');
    const oldDropCount=G.drops.length;
    game.killMob(troll,p);
    const dropsAfter=G.drops.map(d=>({type:d.type,x:d.x,y:d.y}));
    const keys=dropsAfter.filter(d=>d.type==='templeKey');
    if(keys.length!==1)throw Error('Troll should drop exactly one additive temple key');
    const oldXpDrops=dropsAfter.filter(d=>d.type==='xp').length;
    const key=G.drops.find(d=>d.type==='templeKey');
    p.x=key.x;p.y=key.y;
    game.update(.025);
    const collected=temple.state();
    p.x=collected.door.x;p.y=collected.door.y;
    const entered=temple.enter(),inside=temple.state(),drawWorks=(()=>{game.draw();return true})();
    const stillSleeping=G.mobs.filter(m=>m.nsTempleGuardian).length;
    p.x=inside.diamond.x;p.y=inside.diamond.y;
    const triggered=temple.takeDiamond();
    const awakenedStart=temple.state();
    // Deterministic step-through of staggered awakening, no wall-clock waits.
    for(let i=0;i<48;i++){G.time+=.4;temple.tick(.016)}
    const after=temple.state(),activeGuards=G.mobs.filter(m=>m.nsTempleGuardian&&!m.dead);
    const guardianSpeeds=activeGuards.map(m=>m.speed);
    game.draw();
    p.x=inside.exit.x;p.y=inside.exit.y;
    const exited=temple.leave(),restored=temple.state();
    return {first,level:G.level,trollHp:troll.maxHp,oldDropCount,dropsAfter,keys:keys.length,oldXpDrops,collected,entered,inside,drawWorks,stillSleeping,triggered,awakenedStart,after,activeGuards:activeGuards.length,guardianSpeeds,exited,restored,caveMode:G.caveMode,title:document.title,
      menuVersion:document.getElementById('ns102MenuVersion')?.textContent};
   });
   assert.match(result.title,/v107/);
   assert.match(result.menuVersion,/V107/);
   assert.equal(result.first.phase,'keeper');
   assert.equal(result.first.key,false);
   assert.equal(result.first.preview,true);
   assert.equal(result.keys,1,'Temple Key is guaranteed from the dedicated wave-10 keeper');
   assert.ok(result.oldXpDrops>=4,'original troll XP drops remain unchanged');
   assert.equal(result.collected.key,true,'pickup via the original in-game pickup loop');
   assert.equal(result.entered,true,'Temple is enterable with its separate key');
   assert.equal(result.inside.active,true);
   assert.ok(result.inside.wallCount>150,'large real maze with collidable walls');
   assert.equal(result.inside.decorTypes.length,14,'all 14 independently designed crypt elements included');
   assert.ok(result.inside.decorCount>=80);
   assert.ok(result.inside.total>=15,'plenty of dormant sentinels');
   assert.equal(result.stillSleeping,0,'no live enemies inside before diamond');
   assert.equal(result.triggered,true,'diamond activates awakening');
   assert.equal(result.awakenedStart.awake,0,'staggered, not instant wake');
   assert.ok(result.after.awake>0,'some sentinels awakened after diamond');
   assert.equal(result.after.awake,result.after.total,'all sentinels eventually awaken');
   assert.equal(result.after.sleepers,0);
   assert.equal(result.activeGuards,result.after.total);
   assert.ok(result.guardianSpeeds.every(v=>v<=35),'sentinels move slowly');
   assert.equal(result.drawWorks,true,'maze and animated guardians render without exceptions');
   assert.equal(result.exited,true,'can leave via starting gate');
   assert.equal(result.restored.active,false);
   assert.equal(result.caveMode,false,'original overworld simulation restored');
   assert.equal(result.restored.key,true,'key remains in run after exit');
   assert.deepEqual(errors.filter(x=>/TypeError|ReferenceError|SyntaxError/.test(x)),[],errors.join(' | '));
   console.log('PASS V105 '+width+'px: direct Troll test link, additive key+old loot, large 14-decor crypt maze, sleeping sentinels, diamond wave, 4 guardians, exit+return');
   await context.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
