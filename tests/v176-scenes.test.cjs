'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {chromium}=require('playwright-core');
(async()=>{const bin=['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync);const browser=await chromium.launch({executablePath:bin,headless:true,args:['--no-sandbox','--allow-file-access-from-files','--disable-dev-shm-usage']});
try{for(const width of [360,412]){const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('file://'+path.resolve('public/index.html')+'?creator-test=1',{waitUntil:'domcontentloaded'});
await page.waitForFunction(()=>!!window.NS176_SCENES&&!!window.NS171_CREATOR);
async function open(){await page.evaluate(()=>{document.querySelector('#ns82-auth')?.remove();document.querySelector('#ns50MenuCreate').open=true});await page.locator('#ns171CharacterBtn').click();await page.locator('[data-tab=test]').click()}
await open();await page.locator('#ns175LabMode').selectOption('scene');await page.locator('[data-action=restart]').click();
await page.locator('#ns175Relations summary').click();await page.locator('[data-relation-a=red][data-relation-b=blue]').selectOption('hostile');
await page.locator('#ns174PlacePanel summary').click();await page.locator('#ns174PlaceMode').selectOption('still');
const canvas=page.locator('#ns171Canvas'),b=await canvas.boundingBox(),sc=Math.min(b.width/780,b.height/500);
for(let i=0;i<12;i++){await page.locator('#ns174Faction').selectOption(i%2?'blue':'red');await page.locator('[data-action=placeActor]').click();await canvas.click({position:{x:(b.width-780*sc)/2+(95+(i%6)*105)*sc,y:(b.height-500*sc)/2+(145+Math.floor(i/6)*215)*sc}})}
await page.locator('#ns176ScenePanel summary').click();await page.locator('#ns176SceneName').fill('Dvanaest strazara');await page.locator('[data-action=sceneSave]').click();const id=await page.locator('#ns176SavedScene').inputValue();assert(id);
const data=await page.evaluate(()=>NS176_SCENES.list(NS171_CREATOR.clean,NS174_AI,NS175_FACTIONS)[0]);assert.equal(data.actors.length,12);assert.equal(data.relations['blue|red'],'hostile');
await page.waitForFunction(()=>NS171_CREATOR.test.performance.fps>0);const perf=await page.evaluate(()=>NS171_CREATOR.test.performance);assert(perf.ms<50&&perf.fps>5);await page.locator('[data-action=close]').click();
await page.reload({waitUntil:'domcontentloaded'});await open();await page.locator('#ns176ScenePanel summary').click();await page.locator('#ns176SavedScene').selectOption(id);await page.locator('[data-action=sceneLoad]').click();
const sim=await page.evaluate(()=>NS171_CREATOR.test.simulation);assert.equal(sim.mode,'scene');assert.equal(sim.mobs.length,12);assert.equal(sim.relations['blue|red'],'hostile');assert(sim.mobs.every(m=>m.ai.mode==='still'&&Math.abs(m.homeX-m.x)<.01&&Math.abs(m.homeY-m.y)<.01));assert.equal(sim.hp,sim.maxHp);
await page.locator('[data-action=sceneDelete]').click();assert.equal(await page.evaluate(()=>NS176_SCENES.list(NS171_CREATOR.clean,NS174_AI,NS175_FACTIONS).length),0);
await page.locator('[data-action=close]').click();assert(!errors.length,errors.join('\n'));console.log('V176 SCENE PASS',width,JSON.stringify({actors:12,fps:perf.fps,simulationMs:perf.ms,restored:true,relations:true}));await page.close();
}}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});