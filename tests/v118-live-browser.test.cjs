'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('playwright-core');
const base='https://nocna-straza-v77.stefanstevic1996.workers.dev';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:['/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync),args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const width of [360,412]){
   const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
   const errors=[];page.on('pageerror',e=>errors.push(String(e)));
   const response=await page.goto(base+'/?village-test=1&village-fps=1&v=120',{waitUntil:'domcontentloaded',timeout:30000});
   assert.equal(response.status(),200,'Live page HTTP 200');
   await page.waitForFunction(()=>window.__VILLAGE_PREVIEW_STATUS?.open===true,{timeout:16000});
   const initial=await page.evaluate(()=>{
    const a=window.NS109_VILLAGE.test,b=a.buildings.find(x=>x.id==='hall');
    const goal={x:b.x,y:b.y+b.h/2+26};
    return {title:document.title,release:document.getElementById('ns102MenuVersion')?.textContent||'',authentic:window.__VILLAGE_PREVIEW_STATUS.authenticHero,goal,route:a.route(goal.x,goal.y)?.length||0,start:a.position,started:a.go(goal.x,goal.y)};
   });
   assert.ok(initial.release.includes('V120')&&initial.authentic&&initial.route>3&&initial.started,'Live site must include V120 Village navigation '+JSON.stringify(initial));
   await page.waitForTimeout(4400);
   const after=await page.evaluate(()=>{const a=window.NS109_VILLAGE.test,p=a.position;return {p,blocked:a.blocked(p.x,p.y),debug:a.debug,fpsBadge:document.getElementById('ns119Fps')?.textContent||''}});
   assert.ok(!after.blocked&&Math.hypot(after.p.x-initial.goal.x,after.p.y-initial.goal.y)<16,
    'Live Village player should arrive without sticking '+JSON.stringify({initial,after}));
   assert.equal(after.debug.staticBuilds,1,'Live background cached');
   assert.ok(after.debug.fps>=48&&after.fpsBadge.includes('FPS'),'Live Village must reach approximately 60 FPS '+JSON.stringify({width,fps:after.debug.fps,overlay:after.fpsBadge}));
   assert.equal(errors.length,0,'Live browser errors '+errors.join(' | '));
   console.log('LIVE V120 PASS',width,JSON.stringify({title:initial.title,x:after.p.x,y:after.p.y,frames:after.debug.frames,fps:after.debug.fps}));
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
