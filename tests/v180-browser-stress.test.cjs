'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {chromium}=require('playwright-core');
const client=fs.readFileSync('public/v140-net-mode.js','utf8');
// Compare spatial query against brute force on deterministic random positions,
// including rectangle and cell edges. Production API remains untouched.
const start=client.indexOf('let obstacleGridCache=null;'),end=client.indexOf('function moveLocal(',start);
assert(start>=0&&end>start);
const ctx=vm.createContext({});vm.runInContext(client.slice(start,end),ctx);
const obstacles=Array.from({length:150},(_,i)=>({x:(i*131)%4200,y:(i*199)%4200,w:15+i%200,h:16+i%90}));
const world={obstacles};
const hit=(o,x,y,r)=>{const a=Math.max(o.x,Math.min(o.x+o.w,x)),b=Math.max(o.y,Math.min(o.y+o.h,y));return (x-a)**2+(y-b)**2<r*r};
for(let i=0;i<4000;i++){
 const x=(i*89)%4200,y=(i*157)%4200,r=14+i%25;
 const all=obstacles.some(o=>hit(o,x,y,r));
 const selected=ctx.nearbyObstacles(world,x,y,r).some(o=>hit(o,x,y,r));
 assert.equal(selected,all,'spatial index must preserve exact collision');
}
console.log('4000 collision probes PASS');
(async()=>{
 const executablePath=['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync);
 const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
 const page=await browser.newPage({viewport:{width:832,height:384},deviceScaleFactor:3,isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setContent('<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body></body></html>');
 await page.evaluate(()=>{window.__NS110_BRIDGE={currentProfileLevel:()=>0,NET:{role:'',phase:'idle'},heroStyle:{weapon:'sword'},drawVillageHero:(g,x,y)=>{g.fillStyle='#a8c19d';g.fillRect(x-8,y-26,16,30)}}});
 for(const file of ['v154-goblin-renderer.js','v157-arena-scenery.js','v162-troll.js'])await page.addScriptTag({path:path.resolve('public',file)});
 // Harness-only injection into the real source: 200 AI enemies, six character
 // bodies, 85 visible drops. Never expose the fixture in production.
 const hook=`window.__stressSetup=()=>{
   if(!startSolo())throw Error('boot');
   LAB.enabled=true;LAB.godMode=true;LAB.customCount=200;
   for(let n=2;n<=6;n++){const id='p'+n;N.players.set(id,{...N.me,id,x:N.me.x+(n-3)*32,y:N.me.y+65,tx:N.me.x+(n-3)*32,ty:N.me.y+65,motion:null})}
   // Real production batch cap still applies; build two batches only in the QA fixture.
   const first=buildSoloWave(1,200,0);if(first.length!==160)throw Error('production batch cap changed');
   const extra=buildSoloWave(1,40,1).map((m,i)=>({...m,id:160+i}));
   const units=first.concat(extra);
   if(units.length!==200)throw Error('200 fixture not built: '+units.length);
   N.soloMobs=units;N.soloState='play';
   // Concentrate all units in view to test render plus crowd motion, unlike normal spawn.
   for(let i=0;i<units.length;i++){const m=units[i];m.x=N.me.x-380+i%25*30;m.y=N.me.y-135+Math.floor(i/25)*33;m.prevX=m.animX=m.x;m.prevY=m.animY=m.y}
   N.soloDrops=Array.from({length:85},(_,i)=>({id:i+1,x:N.me.x-350+i%17*40,y:N.me.y-100+Math.floor(i/17)*40,value:7,expires:99999}));
   N.me.damage=0;
   return {enemies:units.length,players:N.players.size};
 };`;
 const mark='window.NS140_ARENA={startHost';assert(client.includes(mark));
 await page.addScriptTag({content:client.replace(mark,hook+'\n'+mark)});
 const result=await page.evaluate(async()=>{
  const initial=window.__stressSetup(),api=window.NS140_ARENA;
  const samples=[],fps=[],start=performance.now();let previous=0,visible=0,minDpr=2;
  await new Promise(resolve=>{const loop=now=>{
   api.frame(now);if(previous&&now-start>2000)samples.push(now-previous);previous=now;
   const d=api.stabilityDiagnostics;visible=Math.max(visible,api.diagnostics.soloMobCount);
   minDpr=Math.min(minDpr,d.renderDpr);if(d.fps)fps.push(d.fps);
   if(now-start<10000)requestAnimationFrame(loop);else resolve();
  };requestAnimationFrame(loop)});
  samples.sort((a,b)=>a-b);
  const final=api.diagnostics,diag=api.stabilityDiagnostics;
  api.stop();
  return {initial,final:{enemies:final.soloMobCount,world:[final.worldWidth,final.worldHeight]},fps:diag.fps,frameP95:samples[Math.ceil(samples.length*.95)-1],minDpr,frameCount:samples.length,meanFrameCostMs:diag.meanFrameCostMs,qualityChanges:diag.qualityChanges};
 });
 console.log('V180 BROWSER STRESS',JSON.stringify(result));
 assert.deepEqual(result.initial,{enemies:200,players:6});assert.deepEqual(result.final.world,[4200,4200]);
 assert(result.final.enemies>100,'stress workload must stay active');
 assert(result.frameCount>20&&Number.isFinite(result.frameP95),'frames actually measured');
 assert.deepEqual(errors,[],'no browser runtime errors');
 // CI performance varies by runner. Report the 60-FPS target separately;
 // do not label a functional pass as a verified physical-phone FPS result.
 console.log('60 FPS TARGET',result.fps>=59&&result.frameP95<=20?'MET IN CI':'NOT MET IN CI');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
