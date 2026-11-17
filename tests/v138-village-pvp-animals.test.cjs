'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core');
const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
const village=fs.readFileSync(path.join(__dirname,'../public/v115-village.js'),'utf8');
const buildVersion=Number(html.match(/<title>Night Watch v(\d+)(?: TEST)? — Noćna Straža<\/title>/)?.[1]||0);
assert.ok(buildVersion>=138,'V138+ features require a release build v138 or newer');
const villageAsset=html.match(/v115-village\.js\?v=(\d+)/);
assert(villageAsset,'full game must load fresh Village release asset');
assert.equal(Number(villageAsset[1]),buildVersion,'Village asset cache version must equal the current game version');
assert.match(village,/VILLAGE_W=1660,VILLAGE_H=960/);
assert.match(village,/id:'barn'/);
assert.match(village,/function villageStrike\(id\)/);
assert.match(village,/function villageRespawn\(id,seq\)/);
assert.match(village,/function applyVillageState\(data\)/);
assert.match(village,/function animalPos\(o,ms=Date\.now\(\)\)/);
assert.match(village,/function showBarnPvP\(\)/);
assert.match(village,/if\(data\.t==='ns138PvpToggle'\)toggleVillagePvp\(assigned\)/);
assert.match(village,/if\(now-prev\.at<85\)return true/,'movement net rate-limit preserved');
assert.match(village,/const VILLAGE_TARGET_MS=1000\/60/,'single 60 FPS game clock');
assert.ok(!village.includes('villageFrameId=requestAnimationFrame('),'no second animation loop');
new Function(village);
for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi))
 if(!/\bsrc=/.test(m[1]))new Function(m[2]);
(async()=>{
 const bin=['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync);
 if(!bin)throw Error('No Chromium installed');
 const browser=await chromium.launch({headless:true,executablePath:bin,
  args:['--no-sandbox','--allow-file-access-from-files','--disable-dev-shm-usage']});
 try{
  for(const width of [360,412]){
   const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
   const errors=[];page.on('pageerror',e=>errors.push(String(e)));
   await page.goto('file://'+path.resolve(__dirname,'../public/index.html')+'?village-test=1&lang=sr',
    {waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.__VILLAGE_PREVIEW_STATUS?.open===true,{timeout:16000});
   await page.evaluate(()=>document.querySelector('#ns82-auth')?.remove());
   await page.waitForTimeout(450);
   const ground=await page.evaluate(()=>{
    const api=window.NS109_VILLAGE, a=api.test,
      buildings=a.buildings,barn=buildings.find(b=>b.id==='barn'),
      sheep=a.animals.filter(o=>o.kind==='sheep').length,
      pigs=a.animals.filter(o=>o.kind==='pig').length;
    const overlaps=buildings.flatMap((b,i)=>buildings.slice(i+1).filter(c=>
      Math.abs(b.x-c.x)<(b.w+c.w)/2+35&&Math.abs(b.y-c.y)<(b.h+c.h)/2+35).map(c=>b.id+':'+c.id));
    const route=a.route(barn.x,barn.y+barn.h/2+26);
    return {world:a.world,buildings:buildings.length,sheep,pigs,overlaps,
      routeLength:route?.length??-1,cached:a.debug.staticBuilds,attackButton:!!document.querySelector('#ns138Attack')};
   });
   assert.deepEqual(ground.world,{width:1660,height:960});
   assert.equal(ground.buildings,9);
   assert.equal(ground.sheep,7);assert.equal(ground.pigs,5);
   assert.deepEqual(ground.overlaps,[],'cottage spacing '+JSON.stringify(ground.overlaps));
   assert.ok(ground.routeLength>0,'walking path to barn must exist');

   assert.equal(ground.attackButton,false,'V170 Village uses auto-attack, no manual button');
   const before=await page.evaluate(()=>{
    const a=window.NS109_VILLAGE.test,pig=a.animals.find(o=>o.kind==='pig');
    const moved=a.testMove(pig.x,pig.y),G=window.__NS110_BRIDGE.G;
    return {moved,id:pig.id,before:[G.kills,G.runKills,G.xp]};
   });
   assert.equal(before.moved,true);
   await page.waitForFunction(id=>{
    const pig=window.NS109_VILLAGE.test.animals.find(o=>o.id===id);
    return pig.hp===1;
   },before.id,{timeout:2500});
   const first=await page.evaluate(id=>{
    const pig=window.NS109_VILLAGE.test.animals.find(o=>o.id===id);
    const G=window.__NS110_BRIDGE.G;
    return {id,hp:pig.hp,afterStats:[G.kills,G.runKills,G.xp]};
   },before.id);
   assert.equal(first.hp,1,'proximity auto-attack damages pig');
   assert.deepEqual(first.afterStats,before.before,'animal hits grant no run rewards');
   await page.waitForFunction(id=>{
    const pig=window.NS109_VILLAGE.test.animals.find(o=>o.id===id);
    return pig.deadUntil>Date.now()+10000;
   },before.id,{timeout:4000});
   const second=await page.evaluate(id=>{
    const pig=window.NS109_VILLAGE.test.animals.find(o=>o.id===id);
    const G=window.__NS110_BRIDGE.G;
    return {hiddenUntil:pig.deadUntil,hp:pig.hp,stats:[G.kills,G.runKills,G.xp]};
   },before.id);
   assert.ok(second.hiddenUntil>Date.now()+10000,'pig temporarily despawns after automatic melee');
   assert.deepEqual(second.stats,before.before,'automatic attacks grant zero stats');
   const crate=await page.evaluate(()=>{
    const a=window.NS109_VILLAGE.test,c=a.crates[0];
    return {id:c.id,moved:a.testMove(c.x,c.y)};
   });
   assert.equal(crate.moved,true,'walk to Village crate');
   await page.waitForFunction(id=>window.NS109_VILLAGE.test.crates.find(c=>c.id===id).hp<3,
     crate.id,{timeout:3000});
   await page.locator('#ns141Training').click();
   const training=await page.evaluate(()=>{
    const a=window.NS109_VILLAGE.test,m=a.practice.mobs[0];
    return {id:m.id,moved:a.testMove(m.x,m.y)};
   });
   assert.equal(training.moved,true,'walk to practice enemy');
   await page.waitForFunction(id=>window.NS109_VILLAGE.test.practice.mobs.find(m=>m.id===id).hp<3,
     training.id,{timeout:3000});
   const barn=await page.evaluate(()=>{
    const b=window.__NS110_BRIDGE,net=b.NET,a=window.NS109_VILLAGE.test;
    net.role='host';net.phase='lobby';net.localId='p1';net.code='TESTXX';
    const house=a.buildings.find(x=>x.id==='barn');
    const moved=a.testMove(house.x,house.y+house.h/2+26);
    const toggle=a.togglePvp(),p=a.pvp.find(x=>x.id==='p1');
    a.barn();
    return {moved,toggle,opted:p?.opted,hp:p?.hp,pane:document.querySelector('#ns109Pane')?.textContent||''};
   });
   assert.equal(barn.moved,true);
   assert.equal(barn.toggle,true);
   assert.equal(barn.opted,true);assert.equal(barn.hp,100);
   assert.ok(barn.pane.includes('PVP')||barn.pane.includes('PvP'),'barn panel must explain opt-in');
   assert.ok(!errors.length,'Village browser errors: '+errors.join(' | '));
   console.log('V138 VILLAGE PASS '+width+'px',JSON.stringify({ground,animal:first,barn:{toggle:barn.toggle,opted:barn.opted}}));
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
