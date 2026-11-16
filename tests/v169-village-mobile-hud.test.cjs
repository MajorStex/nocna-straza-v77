'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core');
const ROOT=path.resolve(__dirname,'../public');
const village=fs.readFileSync(path.join(ROOT,'v115-village.js'),'utf8');
const voice=fs.readFileSync(path.join(ROOT,'v165-classic-voice.js'),'utf8');
const arena=fs.readFileSync(path.join(ROOT,'v140-net-mode.js'),'utf8');
for(const code of [village,voice,arena])new Function(code);
assert(village.includes('ns169More')&&village.includes('ns169Menu'));
assert(voice.includes('hideVillagePopup'));
assert(arena.includes('w:4200,h:4200'),'V168 New Zone world must remain Classic-sized');
assert(arena.includes('function drawArenaXpCrystals'),'V168 crystal rendering must survive Village changes');
(async()=>{
 const bin=['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync);
 if(!bin)throw Error('Chrome required for mobile Village UI checks');
 const browser=await chromium.launch({headless:true,executablePath:bin,args:['--no-sandbox','--allow-file-access-from-files','--disable-dev-shm-usage']});
 try{
  for(const [width,height] of [[320,700],[360,844],[393,852],[412,915],[832,394]]){
   const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('file://'+path.join(ROOT,'index.html')+'?village-test=1',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.NS109_VILLAGE?.opened,{timeout:16000});
   const get=()=>page.evaluate(()=>{
    const rect=id=>{
     const el=document.getElementById(id),r=el?.getBoundingClientRect();
     return r?{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom,hidden:el.hidden||getComputedStyle(el).display==='none'}:null;
    };
    const quick=[...document.querySelectorAll('#ns109Bottom>button')].map(e=>e.id);
    return {viewport:[innerWidth,innerHeight],scrollWidth:document.documentElement.scrollWidth,
     top:rect('ns109Top'),bottom:rect('ns109Bottom'),stage:rect('ns109Stage'),menu:rect('ns169Menu'),
     chat:rect('ns109Chat'),training:rect('ns141Training'),more:rect('ns169More'),
     attack:rect('ns138Attack'),dodge:rect('ns117Dodge'),dest:rect('ns109Destinations'),
     classic:rect('ns109Classic'),quick};
   });
   const initial=await get();
   assert.deepEqual(initial.quick,['ns109Chat','ns141Training','ns169More'],'only three quick actions');
   assert.equal(initial.menu.hidden,true,'more menu stays hidden until requested');
   assert(initial.dest.w>0&&initial.classic.w>0,'travel and lobby controls available');
   assert(initial.scrollWidth<=width+1,'no horizontal overflow '+width);
   if(width<=600){
    assert(initial.top.h<114,'header must not obscure world: '+JSON.stringify(initial.top));
    assert(initial.bottom.h<75,'single row footer: '+JSON.stringify(initial.bottom));
    assert(initial.stage.h>=height*.65,'world should occupy majority of screen '+JSON.stringify(initial.stage));
    assert(initial.attack.bottom<=initial.stage.bottom+1&&initial.dodge.bottom<=initial.stage.bottom+1,'actions inside map');
    assert(initial.attack.right<=width+1&&initial.dodge.x>=-1,'attacks within viewport');
   }
   await page.locator('#ns169More').click();
   const opened=await get();
   assert.equal(opened.menu.hidden,false,'secondary menu opens');
   assert(opened.menu.x>=0&&opened.menu.right<=width+1,'menu fits phone');
   for(const id of ['ns144Fx','ns109Results','ns109Global','ns109Sparta','ns109Voices'])
    assert(await page.locator('#'+id).isVisible(),id+' reachable inside menu');
   await page.locator('#ns144Fx').click();
   assert.equal((await get()).menu.hidden,true,'selecting secondary action closes the menu');
   await page.locator('#ns169More').click();
   await page.locator('#ns169Scrim').click({position:{x:5,y:5}});
   assert.equal((await get()).menu.hidden,true,'outside tap closes the menu');
   await page.locator('#ns169More').click();
   await page.keyboard.press('Escape');
   assert.equal((await get()).menu.hidden,true,'Escape closes menu');
   // Voice popup is tested without touching permissions or contacting the relay.
   await page.evaluate(()=>{
    window.NS165_CLASSIC_VOICE?.install?.();
    const pop=document.getElementById('ns165VillagePopup');
    pop.hidden=false;pop.setAttribute('aria-hidden','false');
   });
   const popup=await page.evaluate(()=>{
    const e=document.getElementById('ns165VillagePopup'),r=e.getBoundingClientRect();
    const btn=document.getElementById('ns165VillageVoiceClose');
    return {top:r.top,right:r.right,bottom:r.bottom,height:r.height,button:!!btn};
   });
   assert(popup.button&&popup.height<310,'compact popup and explicit close button');
   assert(popup.right<=width+1&&popup.top>=0,'popup inside phone viewport');
   if(width<=600)assert(popup.bottom<initial.attack.y-20,'mic popup must not block attack button');
   await page.locator('#ns165VillageVoiceClose').click();
   assert.equal(await page.evaluate(()=>document.getElementById('ns165VillagePopup').hidden),true,'X closes mic popup');
   assert.deepEqual(errors.filter(e=>/SyntaxError|ReferenceError|TypeError/.test(e)),[],'browser errors');
   console.log('V169 VILLAGE MOBILE HUD PASS '+width+'x'+height,JSON.stringify({
    header:Math.round(initial.top.h),footer:Math.round(initial.bottom.h),
    map:Math.round(initial.stage.h),popup:Math.round(popup.height),quick:initial.quick}));
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
