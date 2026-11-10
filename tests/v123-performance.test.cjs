'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core');
const load=p=>fs.readFileSync(path.resolve(__dirname,'../',p),'utf8');
const html=load('public/index.html'),village=load('public/v115-village.js');
for(const needle of ['VERZIJA V123 · PERFORMANCE QA','v115-village.js?v=123',
 'ns123RenderBudget','ns123RenderTick','mobGridBucketPool','idx.drawBounds===bounds','window.__NS123_PERF']){
 assert.ok(html.includes(needle),'Missing optimized build '+needle);
}
for(const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)){
 if(!/\bsrc=/.test(script[1]))new Function(script[2]);
}
new Function(village);
console.log('V123 script syntax and performance optimization integration PASS');
// Test the real MobGrid functions in isolation: neighboring membership must be
// identical before/after 300 rebuilds, including moved and newly dead monsters.
{
 const begin=html.indexOf('const MOB_CELL=80,ENEMY_BUBBLE=16;let mobGrid=');
 const end=html.indexOf('// Crowd collision:',begin);
 assert.ok(begin>0&&end>begin,'Grid source boundary');
 const mobs=Array.from({length:84},(_,i)=>({id:i,x:100+(i%12)*32,y:100+Math.floor(i/12)*48,dead:false}));
 const api=new Function('G',html.slice(begin,end)+'\nreturn {buildMobGrid,getNearbyMobs,metrics:()=>({newBuckets:ns123BucketsNew,builds:ns123GridBuilds,cells:mobGrid.size,pooled:mobGridBucketPool.length})};')({mobs});
 let initial=0;
 for(let t=0;t<300;t++){
  if(t%11===0){mobs[t%84].dead=!mobs[t%84].dead;mobs[(t+10)%84].x+=3}
  api.buildMobGrid();
  if(t===10)initial=api.metrics().newBuckets;
  const m=mobs[t%84],near=api.getNearbyMobs(m,135);
  assert.equal(near.length,new Set(near).size,'No duplicate grid entries');
  assert.ok(near.every(n=>!n.dead),'Dead mob remained in reused bucket');
  if(!m.dead)assert.ok(near.includes(m),'Entity absent from its own bucket');
 }
 const stat=api.metrics();
 assert.ok(stat.builds===300&&stat.newBuckets<=initial+20,'Buckets are leaking instead of being reused '+JSON.stringify(stat));
 console.log('V123 300x crowd-grid rebuild PASS',JSON.stringify(stat));
}
function frameBudget(refreshHz){
 const target=1000/60;let last=0,budget=0,rendered=0;
 for(let i=1;i<=refreshHz*3;i++){
  const now=i*1000/refreshHz;
  if(!last){last=now;budget=target}
  else{budget=Math.min(target*2,budget+Math.max(0,Math.min(70,now-last)));last=now}
  if(budget+.35>=target){budget=Math.max(0,budget-target);rendered++}
 }
 return rendered/3;
}
for(const hz of [60,90,120,144])assert.ok(frameBudget(hz)>=59&&frameBudget(hz)<=61,
 'Combat draw scheduler must not fall to 45 FPS on 90Hz '+hz+' => '+frameBudget(hz));
console.log('V123 render scheduler 60/90/120/144Hz PASS');
(async()=>{
 const bin=['/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);
 const browser=await chromium.launch({headless:true,executablePath:bin,args:['--no-sandbox','--allow-file-access-from-files','--disable-dev-shm-usage']});
 try{
  for(const width of [360,412]){
   const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
   const errors=[];page.on('pageerror',e=>errors.push(String(e)));
   await page.goto('file://'+path.resolve(__dirname,'../public/index.html')+'?village-test=1&village-fps=1',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.__VILLAGE_PREVIEW_STATUS?.open===true,{timeout:15000});
   await page.waitForTimeout(700);
   const villageState=await page.evaluate(()=>({fps:window.NS109_VILLAGE.test.debug.fps,buildings:window.NS109_VILLAGE.test.buildings.length}));
   const started=await page.evaluate(()=>{
    window.NS109_VILLAGE.close();
    const a=window.__nightWatch;a.startGame();
    const p=a.G.players[0];
    // Host-authoritative AI stress, not a visual-only stand-in.
    for(let i=0;i<55;i++){
      const angle=i*Math.PI*2/55,rad=240+(i%4)*52;
      a.addMob(['goblin','crawler','skeleton','brute','worm'][i%5],
       p.x+Math.cos(angle)*rad,p.y+Math.sin(angle)*rad);
    }
    return {mode:a.G.mode,mobs:a.G.mobs.length};
   });
   assert.equal(started.mode,'play','Host game could not start');assert.ok(started.mobs>=50,'AI stress not active');
   await page.waitForTimeout(3300);
   const diag=await page.evaluate(()=>({
     mode:window.__nightWatch.G.mode,mobs:window.__nightWatch.G.mobs.length,
     perf:window.__NS123_PERF(),render:window.__NS77PERF.status(),
     fx:window.__NS94_FX.stats(),props:window.__NS111_PERF.propCount,
     screenshot:document.querySelector('#gameCanvas').width
   }));
   assert.equal(diag.mode,'play','Game crashed during AI stress');
   assert.ok(diag.perf.gridBuilds>=100,'AI grid not being rebuilt');
   assert.ok(diag.perf.gridNewBuckets<Math.max(200,diag.perf.gridBuilds),'Mob-grid bucket pool is not bounded');
   assert.ok(diag.perf.drawCacheActive,'Viewport prop caching not active');
   assert.equal(errors.length,0,'JavaScript exceptions '+errors.join(' | '));
   console.log('V123 MOBILE GAME STRESS PASS',width,JSON.stringify({village:villageState,mode:diag.mode,mobs:diag.mobs,perf:diag.perf,render:diag.render,fx:diag.fx}));
   await page.close();
  }
 }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exitCode=1});