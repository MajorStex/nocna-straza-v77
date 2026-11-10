'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.resolve(__dirname,'../',p),'utf8');
const game=read('public/index.html'),village=read('public/v115-village.js');
for(const needle of ['const villageVisible=window.NS109_VILLAGE?.opened','if(villageVisible){','VERZIJA V122','v115-village.js?v=121'])assert.ok(game.includes(needle),needle);
for(const needle of ['function findVillagePath(','function blockedVillage(','function updateVillageTravel(','function villageStaticLayer(','function villageFrame(now)','const layer=villageStaticLayer()','smoothAvatars.get(p.id)'])assert.ok(village.includes(needle),needle);
assert.ok(!village.includes('const heartbeat=setInterval('),'Old 75ms Village render interval removed');
for(const m of game.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi))if(!/\bsrc=/.test(m[1]))new Function(m[2]);
new Function(village);
assert.ok(village.includes('VILLAGE_TARGET_MS=1000/60')&&village.includes('frame:villageFrame')&&!village.includes('villageFrameId=requestAnimationFrame('),'Village shares rAF and targets 60');
console.log('V122 static check PASS');
(async()=>{
 const {chromium}=require('playwright-core');
 const browser=await chromium.launch({headless:true,executablePath:['/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync),args:['--no-sandbox','--allow-file-access-from-files','--disable-dev-shm-usage']});
 try{
  for(const width of [360,412]){
   const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
   const errors=[];page.on('pageerror',e=>errors.push(String(e)));
   await page.goto('file://'+path.resolve(__dirname,'../public/index.html')+'?village-test=1',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.__VILLAGE_PREVIEW_STATUS?.open===true,{timeout:12000});
   let state=await page.evaluate(()=>{
    const api=window.NS109_VILLAGE;
    const destination=api.test.buildings.find(b=>b.id==='hall');
    const goal={x:destination.x,y:destination.y+destination.h/2+26};
    const route=api.test.route(goal.x,goal.y);
    return {goal,routeLength:route?.length||0,walkable:!api.test.blocked(api.test.position.x,api.test.position.y),launched:api.test.go(goal.x,goal.y)};
   });
   assert.ok(state.walkable&&state.launched&&state.routeLength>3,'Navigation must find a clear route '+JSON.stringify(state));
   const samples=[];for(let i=0;i<22;i++){
    await page.waitForTimeout(190);
    samples.push(await page.evaluate(()=>{
     const a=window.NS109_VILLAGE.test,p=a.position;return {x:p.x,y:p.y,blocked:a.blocked(p.x,p.y)};
    }));
   }
   assert.ok(samples.every(x=>!x.blocked),'Hero phased through house '+JSON.stringify(samples));
   const last=samples.at(-1);
   assert.ok(Math.hypot(last.x-state.goal.x,last.y-state.goal.y)<16,
    'Auto-walk must reach building without getting stuck '+JSON.stringify({state,last}));
   const current=await page.evaluate(()=>{
    const a=window.NS109_VILLAGE.test;
    a.route(755,255);
    return {stats:a.debug,canvas:document.querySelector('#ns109Scene').getBoundingClientRect().width};
   });
   assert.ok(current.stats.frames>=25,'Village animation should run smoothly '+JSON.stringify(current));
   assert.equal(current.stats.staticBuilds,1,'Background must be cached '+JSON.stringify(current));
   assert.equal(errors.length,0,'Runtime errors: '+errors.join(' | '));
   console.log('V122 MOBILE PASS',width,JSON.stringify({x:last.x,y:last.y,frames:current.stats.frames,cache:current.stats.staticBuilds,paths:current.stats.paths}));
   await page.close();
  }
 }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exitCode=1});
