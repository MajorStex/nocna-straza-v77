'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const html=read('public/index.html'),village=read('public/v115-village.js');
assert.ok(html.includes('window.NS109_VILLAGE.frame(ts);'),'Village shares main game animation loop');
assert.ok(village.includes('VILLAGE_TARGET_MS=1000/60'),'60 FPS pacing target');
assert.ok(village.includes('villageFrameCredit'),'fractional frame pacing supports 90/120Hz screens');
assert.ok(!village.includes('villageFrameId=requestAnimationFrame('),'must not schedule second animation loop');
assert.ok(!village.includes('now-lastVillagePaint>=30'),'must not cap at 30 FPS');
assert.ok(village.includes("SHOW_PERF=new URLSearchParams(location.search).has('village-fps')"),'diagnostic FPS overlay is opt-in');
for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi))if(!/\bsrc=/.test(m[1]))new Function(m[2]);
new Function(village);
console.log('V119 syntax and single-rAF checks PASS');
(async()=>{
 const {chromium}=require('playwright-core');
 const binary=['/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);
 const browser=await chromium.launch({headless:true,executablePath:binary,args:['--no-sandbox','--allow-file-access-from-files','--disable-dev-shm-usage']});
 try{
  for(const width of [360,412]){
   const page=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
   const errors=[];page.on('pageerror',e=>errors.push(String(e)));
   await page.goto('file://'+path.resolve(__dirname,'../public/index.html')+'?village-test=1&village-fps=1',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.__VILLAGE_PREVIEW_STATUS?.open===true,{timeout:14000});
   await page.waitForTimeout(1100);
   async function sample(){
    const first=await page.evaluate(()=>({t:performance.now(),frames:window.NS109_VILLAGE.test.debug.frames}));
    await page.waitForTimeout(2400);
    const last=await page.evaluate(()=>({t:performance.now(),...window.NS109_VILLAGE.test.debug}));
    return {fps:Math.round((last.frames-first.frames)*1000/(last.t-first.t)),last};
   }
   const solo=await sample();
   assert.ok(solo.fps>=48,'Solo Village FPS must be clearly better than 30 FPS: '+JSON.stringify(solo));
   assert.ok(solo.last.fps>0&&solo.last.targetFps===60,'FPS meter must report real frames '+JSON.stringify(solo));
   const joined=await page.evaluate(()=>{
    const bridge=window.__NS110_BRIDGE,net=bridge.NET;
    net.role='host';net.phase='lobby';net.localId='p1';
    for(let n=2;n<=6;n++)net.clients.set('p'+n,{open:true,send(){}});
    return bridge.currentLobbyRoster().length;
   });
   assert.equal(joined,6,'Simulated six-person lobby');
   await page.waitForTimeout(500);
   const full=await sample();
   assert.ok(full.fps>=44,'Six-player Village FPS fell too far: '+JSON.stringify(full));
   assert.equal(errors.length,0,'Browser exceptions '+errors.join(' | '));
   console.log('V119 MOBILE FPS PASS',width,JSON.stringify({solo:solo.fps,soloReported:solo.last.fps,sixPlayers:full.fps,sixReported:full.last.fps,drawMs:full.last.averageDrawMs,maxDrawMs:full.last.maxDrawMs,cache:full.last.staticBuilds}));
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
