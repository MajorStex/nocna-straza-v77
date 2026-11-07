'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{chromium}=require('playwright-core');
(async()=>{
 const binary=['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync);
 if(!binary)throw Error('Chromium browser required');
 const browser=await chromium.launch({headless:true,executablePath:binary,args:['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files']});
 try{
  for(const width of [360,412]){
   const context=await browser.newContext({viewport:{width,height:820},isMobile:true,hasTouch:true});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('file://'+path.resolve(__dirname,'../public/index.html'),{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.__nightWatch&&window.__NS99_TEAM,{timeout:20000});
   await page.evaluate(()=>document.getElementById('ns82-guest')?.click());
   const result=await page.evaluate(()=>{
    const g=window.__nightWatch;g.startGame({specialMode:'normal'});const a=g.G;
    a.mobs=[];a.wave=1;
    let randomBefore=0;
    for(let w=1;w<20;w++){a.wave=w;for(let k=0;k<25;k++){const m=g.spawnEnemy();if(m?.type==='rotfiend')randomBefore++}}
    const early=g.spawnRotfiend();
    a.mobs=[];a.wave=19;a.waveClock=10000;
    g.update(.03);
    const firstWave=a.wave,first=a.mobs.filter(m=>m.type==='rotfiend');
    const firstCount=first.length,firstId=first[0]?.id;
    for(let i=0;i<15;i++){g.spawnRotfiend();g.spawnEnemy()}
    const sameWave=a.mobs.filter(m=>m.type==='rotfiend'&&!m.dead).length;
    if(first[0])first[0].dead=true;
    const deadFirstAgain=g.spawnRotfiend();
    a.wave=21;a.mobs=[];
    const later=g.spawnRotfiend();
    for(let i=0;i<50;i++)g.spawnEnemy();
    const duringOther=a.mobs.filter(m=>m.type==='rotfiend').length;
    a.mobs=[];a.wave=29;a.waveClock=10000;
    g.update(.03);
    const secondWave=a.wave;
    const second=a.mobs.filter(m=>m.type==='rotfiend');
    const secondCount=second.length,secondId=second[0]?.id;
    g.spawnRotfiend();const secondDuplicate=a.mobs.filter(m=>m.type==='rotfiend').length;
    a.wave=31;a.mobs=[];const after30=g.spawnRotfiend();
    for(let i=0;i<80;i++)g.spawnEnemy();
    const randomLate=a.mobs.filter(m=>m.type==='rotfiend').length;
    const tracked=[...a.ns100RotfiendWaves].sort((x,y)=>x-y);
    g.startGame({specialMode:'normal'});
    const reset=a.ns100RotfiendWaves.size;
    return {randomBefore,early:!!early,firstWave,firstCount,firstId,sameWave,deadFirstAgain:!!deadFirstAgain,later:!!later,duringOther,secondWave,secondCount,secondId,secondDuplicate,after30:!!after30,randomLate,tracked,reset};
   });
   assert.equal(result.randomBefore,0,'never random before wave20');
   assert.equal(result.early,false,'forced early rotfiend blocked');
   assert.equal(result.firstWave,20,'wave progression advances to 20');
   assert.equal(result.firstCount,1,'exactly one Rotfiend on wave20');
   assert.equal(result.sameWave,1,'repeated spawns cannot add a second Rotfiend');
   assert.equal(result.deadFirstAgain,false,'cannot respawn on same wave after death');
   assert.equal(result.later,false,'no Rotfiend on wave21');
   assert.equal(result.duringOther,0,'no random Rotfiend on wave21');
   assert.equal(result.secondWave,30,'wave progression advances to 30');
   assert.equal(result.secondCount,1,'exactly one Rotfiend on wave30');
   assert.equal(result.secondDuplicate,1,'cannot spawn more than one on wave30');
   assert.equal(result.after30,false,'no Rotfiend on wave31');
   assert.equal(result.randomLate,0,'no random Rotfiend on wave31');
   assert.deepEqual(result.tracked,[20,30]);
   assert.equal(result.reset,0,'new game resets occurrence tracking');
   assert.deepEqual(errors.filter(e=>/SyntaxError|ReferenceError|TypeError/.test(e)),[],errors.join(' | '));
   console.log('PASS V100 Rotfiend only at wave20 and wave30, one each, never random, no repeat after kill, reset works · '+width+'px');
   await context.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
