'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core');
const html=fs.readFileSync(path.resolve(__dirname,'../public/index.html'),'utf8');
assert.match(html,/<title>Night Watch v136 — Noćna Straža<\/title>/);
assert.match(html,/get\('wave40-preview'\)==='1'/);
assert.match(html,/function ns136StartWave40Preview\(\)/);
assert.match(html,/G\.runType='wave40Preview'/);
assert.match(html,/G\.wave=39/);
assert.match(html,/G\.debugRun=true/);
assert.match(html,/G\.waveClock=Math\.max\(0,Number\(cfgSettings\.waveDuration\|\|27\)-8\)/);
assert.match(html,/G\.runType!=='wave40Preview'&&G\.spawnClock>=/);
(async()=>{
 const bin=['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync);
 if(!bin)throw Error('No Chromium installed');
 const browser=await chromium.launch({headless:true,executablePath:bin,
 args:['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files']});
 try{
  for(const width of [360,412]){
   const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto('file://'+path.resolve(__dirname,'../public/index.html')+'?wave40-preview=1',
    {waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.__nightWatch?.G.runType==='wave40Preview'&&window.__nightWatch.G.wave===39,{timeout:15000});
   const before=await page.evaluate(()=>{const {G,NET}=window.__nightWatch;
     return {wave:G.wave,runType:G.runType,debugRun:G.debugRun,role:NET.role,
      remaining:27-G.waveClock,bosses:G.mobs.filter(m=>m.type==='werewolfAlpha').length};});
   assert.equal(before.wave,39);
   assert.equal(before.debugRun,true);
   assert.equal(before.role,'');
   assert.equal(before.bosses,0);
   assert.ok(before.remaining<=12,'starts close to next wave');
   await page.waitForFunction(()=>{
    const g=window.__nightWatch?.G;
    return g?.wave===40&&g?.ns135WolfSpawned&&g?.mobs.some(m=>m.type==='werewolfAlpha'&&!m.dead);
   },{timeout:18500});
   const after=await page.evaluate(()=>{const {G,NET}=window.__nightWatch;
      return {wave:G.wave,runType:G.runType,role:NET.role,bosses:G.mobs.filter(m=>m.type==='werewolfAlpha'&&!m.dead).length,
       wolves:G.mobs.filter(m=>m.type==='werewolf'&&!m.dead).length,debugRun:G.debugRun,canvas:document.getElementById('gameCanvas')?.width||0};});
   assert.equal(after.wave,40);
   assert.equal(after.runType,'wave40Preview');
   assert.equal(after.bosses,1);
   assert.ok(after.wolves>=2,'small pack appears with boss');
   assert.ok(after.canvas>0,'game renders');
   assert.equal(after.debugRun,true,'no permanent rewards');
   await page.waitForTimeout(400);
   assert.deepEqual(errors.filter(x=>/TypeError|ReferenceError|SyntaxError|RangeError/.test(x)),[],errors.join(' | '));
   console.log('V136 LINK PREVIEW PASS '+width+'px: direct wave 39 -> 40, '+after.wolves+' wolf pups, one alpha, solo no rewards');
   await context.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
