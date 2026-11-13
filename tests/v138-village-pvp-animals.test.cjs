'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core');
const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
const village=fs.readFileSync(path.join(__dirname,'../public/v115-village.js'),'utf8');
assert.match(html,/<title>Night Watch v138 — Noćna Straža<\/title>/);
assert.match(html,/v115-village\.js\?v=138/,'full game must load fresh village asset');
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
   assert.ok(ground.attackButton,'mobile attack button required');
   const first=await page.evaluate(()=>{
    const api=window.NS109_VILLAGE,a=api.test,pig=a.animals.find(o=>o.kind==='pig');
    const moved=a.testMove(pig.x,pig.y),G=window.__NS110_BRIDGE.G,
      before=[G.kills,G.runKills,G.xp];
    const hit=a.attack(),after=a.animals.find(o=>o.id===pig.id);
    return {moved,hit,hp:after.hp,before,afterStats:[G.kills,G.runKills,G.xp],id:pig.id};
   });
   assert.equal(first.moved,true);assert.equal(first.hit,true);
   assert.equal(first.hp,1,'first swing wounds a pig');
   assert.deepEqual(first.afterStats,first.before,'animals cannot grant game rewards');
   await page.waitForTimeout(725);
   const second=await page.evaluate(id=>{
    const a=window.NS109_VILLAGE.test,G=window.__NS110_BRIDGE.G,
      before=[G.kills,G.runKills,G.xp],hit=a.attack(),
      pig=a.animals.find(o=>o.id===id);
    return {hit,hiddenUntil:pig.deadUntil,hp:pig.hp,afterStats:[G.kills,G.runKills,G.xp],before};
   },first.id);
   assert.equal(second.hit,true);assert.ok(second.hiddenUntil>Date.now()+10000,'pig respawns after temporary KO');
   assert.deepEqual(second.afterStats,second.before,'second animal hit grants zero stats');
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
