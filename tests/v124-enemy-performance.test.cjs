'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core');
const src=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
assert.ok(src.includes('VERZIJA V129 · BUILD WATERMARK'),'Current release V124');
for(const marker of ['ns124NeighborScratch','ns124EarlyGridExit','if(!hadOverlap)','neighborScratchSize:ns124NeighborScratch.length']){
 assert.ok(src.includes(marker),'Missing allocation optimization '+marker);
}
for(const match of src.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi))if(!/\bsrc=/.test(match[1]))new Function(match[2]);
const start=src.indexOf('const MOB_CELL=80,ENEMY_BUBBLE=16;let mobGrid='),end=src.indexOf('// v4.0 Boss phase controller.',start);
assert.ok(start>0&&end>start);
const mobs=Array.from({length:50},(_,i)=>({id:i+1,x:200+i*250,y:350,r:13,dead:false}));
const e=new Function('G','canStepClear',src.slice(start,end)+
 '\nreturn {buildMobGrid,getNearbyMobs,separateMobBodies,stats:()=>({builds:ns123GridBuilds,earlyExits:ns124EarlyGridExit,buckets:ns123BucketsNew})};')({mobs},()=>true);
e.separateMobBodies();
assert.equal(e.stats().builds,1,'Uncontested mobs should require one grid pass');
assert.equal(e.stats().earlyExits,1,'An unused 2-pass collision job was not skipped');
const a=mobs[2],b=mobs[3];b.x=a.x+5;b.y=a.y;
e.separateMobBodies();
assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>=a.r*.93+b.r*.93+16-.01,
 'Dense collision separation no longer respects original body spacing');
const before=e.stats();
for(let n=0;n<150;n++){e.separateMobBodies();if(n%4===0){a.x+=2;b.x+=2}}
const after=e.stats();
assert.ok(after.earlyExits>50,'Collision early-exit not exercised');
assert.ok(after.buckets<=60,'Scratch pool leaked new buckets '+JSON.stringify(after));
console.log('V124 ENEMY PHYSICS 150x REUSE PASS',JSON.stringify({before,after}));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:['/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync),args:['--no-sandbox','--allow-file-access-from-files','--disable-dev-shm-usage']});
 try{
  for(const width of [360,412]){
   const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
   const errors=[];page.on('pageerror',x=>errors.push(x.message));
   await page.goto('file://'+path.resolve(__dirname,'../public/index.html')+'?village-test=1',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.__VILLAGE_PREVIEW_STATUS?.open,{timeout:14000});
   await page.evaluate(()=>{
     window.NS109_VILLAGE.close();const w=window.__nightWatch;
     w.startGame();
     // No-overlap scenario: light combat should avoid redundant AI passes.
     const p=w.G.players[0];
     for(let i=0;i<12;i++)w.addMob('goblin',p.x-650+(i%6)*250,p.y-600+Math.floor(i/6)*900);
   });
   await page.waitForTimeout(2100);
   const state=await page.evaluate(()=>({mode:window.__nightWatch.G.mode,perf:window.__NS123_PERF(),fps:window.__NS94_FX.stats()}));
   assert.equal(state.mode,'play','Combat mode failed');
   assert.ok(state.perf.earlyGridExits>2,'AI skips not seen on mobile');
   assert.equal(errors.length,0,'Browser errors '+errors);
   console.log('V124 PHONE LIGHT COMBAT PASS',width,JSON.stringify(state));
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});