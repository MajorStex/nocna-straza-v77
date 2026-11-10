'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core');
const base='file://'+path.resolve(__dirname,'../public/index.html')+'?village-test=1';
const tests=[
 {id:'hall',selector:'#ns109Pane',title:'HALL OF FAME'},
 {id:'guardian',selector:'#ns109Pane',title:'GUARDIAN BASE'},
 {id:'academy',selector:'#ns109Pane',title:'HERO ACADEMY'},
 {id:'chat',selector:'#ns109Pane',title:'VILLAGE TAVERN'},
 {id:'shop',selector:'#nsShopPanel',title:'SHOP'},
 {id:'armory',selector:'#nsArmoryPanel',title:'ARMORY'},
];
(async()=>{
 const binary=['/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);
 const browser=await chromium.launch({headless:true,executablePath:binary,args:['--no-sandbox','--allow-file-access-from-files','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:360,height:844},isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  for(const entry of tests){
   await page.goto(base+'&village-fps=1',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.__VILLAGE_PREVIEW_STATUS?.open===true,{timeout:16000});
   const started=await page.evaluate(id=>window.NS109_VILLAGE.test.visit(id),entry.id);
   assert.ok(started,'Click-to-visit path should exist for '+entry.id);
   await page.waitForFunction(selector=>{
    const n=document.querySelector(selector);
    return n&&!n.classList.contains('ns109Hidden')&&!n.classList.contains('hidden');
   },entry.selector,{timeout:15000});
   const visible=await page.locator(entry.selector).isVisible();
   assert.ok(visible,'Real building menu must become visible: '+entry.id);
   const info=await page.evaluate(({id,selector})=>{
    const p=document.querySelector(selector),a=window.NS109_VILLAGE.test;
    return {id,title:p?.textContent?.slice(0,130)||'',position:a.position,door:a.debug.nearDoor,hidden:p.className, fps:a.debug.fps};
   },entry);
   assert.ok(info.title.toUpperCase().includes(entry.title),'Wrong building menu '+JSON.stringify(info));
   assert.ok(info.door===entry.id,'Hero did not actually approach the correct doorway '+JSON.stringify(info));
   console.log('V120 HOUSE PASS',entry.id,JSON.stringify(info));
  }
  // Direct thumb/key movement must trigger the real doorway, without needing a canvas tap.
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__VILLAGE_PREVIEW_STATUS?.open===true,{timeout:16000});
  assert.equal(await page.evaluate(()=>window.NS109_VILLAGE.test.testMove(454,297)),true);
  await page.keyboard.down('ArrowUp');
  await page.waitForFunction(()=>!document.querySelector('#ns109Pane')?.classList.contains('ns109Hidden'),{timeout:2500});
  await page.keyboard.up('ArrowUp');
  assert.ok((await page.locator('#ns109Pane').innerText()).includes('GUARDIAN BASE'),'Manual approach opened wrong building');
  console.log('V120 MANUAL DOOR PASS');
  // Account setup dialogs are independent of the Village. Exercise the pane close handler directly.
  await page.evaluate(()=>document.getElementById('ns109PaneBack').click());
  await page.waitForTimeout(330);
  assert.equal(await page.locator('#ns109Pane').isVisible(),false,'Proximity should not continuously reopen after closing a menu');
  assert.equal(await page.locator('#ns120Door').isVisible(),true,'Door interaction button should remain available');
  await page.evaluate(()=>document.getElementById('ns120Door').click());
  assert.equal(await page.locator('#ns109Pane').isVisible(),true,'Interaction button must reopen the building');
  assert.ok(errors.length===0,'JS errors '+errors.join(' | '));
  const perf=await page.evaluate(()=>window.NS109_VILLAGE.test.debug);
  console.log('V120 MANUAL REOPEN PASS',JSON.stringify({fps:perf.fps,frames:perf.frames,staticBuilds:perf.staticBuilds}));
  await page.close();
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
