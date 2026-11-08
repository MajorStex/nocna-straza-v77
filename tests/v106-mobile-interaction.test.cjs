'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright-core');
(async()=>{
 const executablePath=['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync);
 if(!executablePath)throw Error('Chromium not installed on runner');
 const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files']});
 try{
  for(const width of [360,412]){
   const ctx=await browser.newContext({viewport:{width,height:820},isMobile:true,hasTouch:true});
   const page=await ctx.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto('file://'+path.resolve(__dirname,'../public/index.html')+'?temple-preview=1',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.__NS105_TEMPLE?.state().preview&&window.__nightWatch?.G.mode==='play',{timeout:25000});
   const initial=await page.evaluate(()=>{
    window.__NS93_MAGIC.renderHud();
    const dock=document.getElementById('ns93SpellDock'),toggle=document.getElementById('ns106SpellToggle');
    return {toggleVisible:toggle.getClientRects().length>0,closed:dock.classList.contains('ns106Closed'),
     hiddenList:getComputedStyle(document.getElementById('ns93SpellList')).display==='none',
     version:document.getElementById('ns102MenuVersion').textContent};
   });
   assert.equal(initial.closed,true);
   assert.equal(initial.hiddenList,true);
   assert.equal(initial.toggleVisible,true);
   await page.waitForFunction(()=>document.getElementById('ns82-auth')?.hidden===true,{timeout:7000});
   assert.match(initial.version,/V106/);
   await page.locator('#ns106SpellToggle').click({timeout:5000});
   const opened=await page.evaluate(()=>({expanded:document.getElementById('ns106SpellToggle').getAttribute('aria-expanded'),
    hidden:getComputedStyle(document.getElementById('ns93SpellList')).display==='none'}));
   assert.equal(opened.expanded,'true');assert.equal(opened.hidden,false);
   await page.locator('#ns106SpellToggle').click();
   assert.equal(await page.evaluate(()=>document.getElementById('ns93SpellDock').classList.contains('ns106Closed')),true);
   const before=await page.evaluate(()=>{
    const g=window.__nightWatch, G=g.G,original=G.players[0];
    G.paused=true;g.NET.role='guest';g.NET.phase='playing';g.NET.localId='p2';g.NET.round=1;
    G.players=[{...original,id:'p1',dead:true,reviveCount:0},{...original,id:'p2',dead:false,reviveCount:0}];
    G.reviveRemoteProgress={};G.reviveSuppressed=new Set();G.reviveIntent={};G.reviveActive={};
    window.ns106Packets=[];g.NET.conn={open:true,send:p=>window.ns106Packets.push(p)};
    g.setReviveHeld(true);
    return {packets:window.ns106Packets.slice(),target:g.reviveCandidate(G.players[1])?.id};
   });
   assert.equal(before.target,'p1');
   assert.equal(before.packets[0]?.t,'reviveHold');
   assert.equal(before.packets[0]?.held,true);
   await page.waitForTimeout(280);
   const heartbeat=await page.evaluate(()=>{
    window.__nightWatch.updateReviveHUD();
    const sent=window.ns106Packets.slice();
    window.__nightWatch.setReviveHeld(false);
    return sent;
   });
   assert.ok(heartbeat.length>=2,'Guest must keep sending revive hold heartbeats');
   assert.equal(heartbeat.at(-1).held,true);
   assert.equal(heartbeat.at(-1).target,'p1');
   assert.ok(errors.filter(e=>/TypeError|ReferenceError|SyntaxError/.test(e)).length===0,errors.join(' | '));
   console.log('PASS V106 '+width+'px: collapsed powers, show/hide, nearby fallen teammate, repeated revive hold frames');
   await ctx.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
