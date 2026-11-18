'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright-core');
const src=fs.readFileSync('public/v140-net-mode.js','utf8');
(async()=>{const executablePath=['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync);assert(executablePath);const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});try{
for(const [width,height] of [[360,844],[832,384]]){
 const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:2,isMobile:true,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setContent('<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body></body></html>');
 await page.evaluate(()=>{window.__awards=0;window.__NS110_BRIDGE={currentProfileLevel:()=>0,NET:{role:'',phase:'idle'},heroStyle:{weapon:'sword'},drawVillageHero(){},arenaSoloBegin:()=>({}),arenaSoloFinish(t,s){window.__awards++;return {heroXp:s.blocked?0:16,points:0,coins:s.blocked?0:6,level:1,inside:16,need:60,free:0,heroName:'Guardian'}},arenaSoloCancel(){}}});
 const hook=`window.__endFixture={die(){N.me.hp=0;N.me.kills=18;N.resultActiveTicks=2250;N.me.xpCollected=16;frame(performance.now());},state(){return {phase:N.phase,stats:N.soloResult?.stats,awards:window.__awards}},victory(){N.rule.victory=true;frame(performance.now())}}`;
 const mark='window.NS140_ARENA={startHost';assert(src.includes(mark));await page.addScriptTag({content:src.replace(mark,hook+';\n'+mark)});
 assert(await page.evaluate(()=>window.NS140_ARENA.startSolo()));
 await page.evaluate(()=>window.__endFixture.die());
 const overlay=page.locator('#ns206Results');assert(await overlay.isVisible());assert.match(await overlay.innerText(),/STRAŽAR JE PAO/);assert.match(await overlay.innerText(),/01:15/);
 const state=await page.evaluate(()=>window.__endFixture.state());assert.equal(state.phase,'solo_ended');assert.equal(state.stats.kills,18);assert.equal(state.awards,1);
 await page.evaluate(()=>window.NS140_ARENA.frame(performance.now()));assert.equal(await page.evaluate(()=>window.__awards),1);
 const card=overlay.locator('.ns206Card'),box=await card.boundingBox();assert(box.x>=-1&&box.y>=-1&&box.x+box.width<=width+1&&box.y+box.height<=height+1,'result card must fit mobile viewport');
 await overlay.getByRole('button',{name:'PONOVO IGRAJ'}).tap();assert(await overlay.isHidden());assert(await page.evaluate(()=>window.NS140_ARENA.active));
 await page.evaluate(()=>window.__endFixture.victory());assert(await overlay.isVisible());assert.match(await overlay.innerText(),/POBEDA/);assert.equal(await page.evaluate(()=>window.__awards),2);
 await overlay.getByRole('button',{name:'NADOGRADI HEROJA'}).tap();assert(await overlay.isHidden());assert.equal(await page.evaluate(()=>window.NS140_ARENA.busy),false);assert.deepEqual(errors,[]);
 await page.close();console.log('V206 results/retry/victory mobile PASS',width,height);
}
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
