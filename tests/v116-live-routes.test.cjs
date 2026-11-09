'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright-core');
const worker='https://nocna-straza-v77.stefanstevic1996.workers.dev';
const start=()=>chromium.launch({headless:true,executablePath:['/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync),args:['--no-sandbox','--disable-dev-shm-usage']});
(async()=>{
 const browser=await start();
 try{
  for(const width of [360,412]){
   const ctx=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true});
   const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
   await page.goto(worker+'/village-test/?lang=sr',{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForFunction(()=>!!window.__VILLAGE_PREVIEW_STATUS,{timeout:10000});
   const village=await page.evaluate(()=>({status:window.__VILLAGE_PREVIEW_STATUS,stage:document.querySelector('#ns109Scene')?.getBoundingClientRect().width,pane:!!document.querySelector('#ns109Pane'),full:!!document.querySelector('#return')}));
   assert.ok(village.status.open,'Live Village auto-open failed: '+JSON.stringify(village)+' '+errors);
   assert.equal(village.status.buildings,7,'7 village destinations');
   assert.equal(village.status.sheep,4,'four sheep');
   assert.ok(village.stage>200,'real Village canvas visible on mobile');
   assert.ok(village.full,'return-to-game link');
   await page.locator('#ns109Scene').click({position:{x:100,y:180}});
   await page.waitForTimeout(150);
   assert.ok(errors.length===0,'Village page errors: '+errors.join(' | '));
   console.log('LIVE VILLAGE PASS',width,JSON.stringify(village));

   await page.goto(worker+'/?cave-test=1',{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForSelector('#ns115CavePreview',{timeout:15000});
   const version=await page.locator('#ns102MenuVersion').innerText();
   assert.ok(version.includes('V116'),'Live Worker not upgraded: '+version);
   const caveBtn=page.locator('#ns115CavePreview');
   await caveBtn.evaluate(btn=>btn.click());
   await page.waitForTimeout(550);
   const cave=await page.evaluate(()=>({mode:window.__nightWatch?.G?.mode,caveMode:window.__nightWatch?.G?.caveMode,players:window.__nightWatch?.G?.players?.length,previewButton:!!document.querySelector('#ns115CavePreview')}));
   assert.equal(cave.mode,'play','Cave test must start actual game: '+JSON.stringify(cave));
   assert.equal(cave.caveMode,true,'Cave test must enter rope cave: '+JSON.stringify(cave));
   console.log('LIVE CAVE PASS',width,JSON.stringify(cave));
   await ctx.close();
  }
 }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exitCode=1});
