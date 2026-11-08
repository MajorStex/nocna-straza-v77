'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.resolve(__dirname,'../public/v109/index.html'),'utf8');
const village=fs.readFileSync(path.resolve(__dirname,'../public/v109-village.js'),'utf8');
for(const [i,m] of [...source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m=>!/\bsrc=|type=["']module/i.test(m[1])).entries())
 assert.doesNotThrow(()=>new vm.Script(m[2],{filename:'v109-inline-'+i}));
assert.doesNotThrow(()=>new vm.Script(village,{filename:'v109-village.js'}));
for(const marker of ['window.NS109_VILLAGE?.onMessage?.(data,assigned)','window.NS109_SPARTA?.appearance','ns109_village_pref','ns109Move','ns109State','ns109Emote','Math.hypot','hero academy','spartaClaim','spartaEquipped','NS97_POST.vote','coopVoiceAvailable()','/api/leaderboard?period=all'])
 assert.ok((source+' '+village).toLowerCase().includes(marker.toLowerCase()),'Missing marker '+marker);
assert.match(source,/required:107/);
assert.match(source,/Night Watch v109 Village Preview/);
assert.ok(!village.includes('localStorage.setItem("payment') && !village.includes('getUserMedia('));
assert.match(village,/leaderCache&&now-lastLeaderboard<300000/);
assert.match(village,/now-lastLeaderRequest<60000/);
assert.match(village,/NET\.phase==='lobby'/);
assert.match(village,/kills<300/);
assert.match(village,/const heartbeat=setInterval\(/);
console.log('V109 static: pass (legacy protocol, syntax, no unsafe global-score writes, limits, cosmetics).');
(async()=>{
 const {chromium}=require('playwright-core');
 const chrome=['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync);
 assert.ok(chrome,'A Chromium browser must be installed for visual QA');
 const browser=await chromium.launch({headless:true,executablePath:chrome,args:['--no-sandbox','--allow-file-access-from-files','--disable-dev-shm-usage']});
 try{
  for(const [w,h] of [[360,844],[412,844],[780,650]]){
   const ctx=await browser.newContext({viewport:{width:w,height:h},isMobile:true,hasTouch:true});
   const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('file://'+path.resolve(__dirname,'../public/v109/index.html')+'?temple-preview=1',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!window.NS109_VILLAGE&&!!window.__nightWatch?.NET,{timeout:25000});
   const got=await page.evaluate(()=>{
    const api=window.NS109_VILLAGE,n=window.__nightWatch.NET;
    n.role='host';n.phase='lobby';n.round=1;n.localId='p1';n.hostId='p1';n.code='ABCDEF';
    n.clients.clear();n.readyPlayers.clear();n.ns97Results=null;
    document.getElementById('coopPanel').classList.remove('hidden');
    const opened=api.open();
    const root=document.getElementById('ns109Village');
    const has7=api.test.buildings.length>=7;
    const noCombat=!!root&&!document.querySelector('#ns109Village .attackBtn');
    const oldChat=!!document.getElementById('ns76Chat');
    api.enter('guardian');
    const guardian=document.getElementById('ns109PaneContent').contains(document.getElementById('coopForge'));
    document.getElementById('ns109PaneBack').click();
    const restored=document.getElementById('lobbyArea').contains(document.getElementById('coopForge'));
    api.enter('academy');
    const academy=document.getElementById('ns109PaneContent').contains(document.getElementById('preHeroUpgrades'));
    document.getElementById('ns109PaneBack').click();
    const notTest=api.test.spartaClaim(299)===false;
    const earned=api.test.spartaClaim(300)===true&&api.test.spartaEquipped();
    const appearance=window.NS109_SPARTA.appearance({wardrobe:{}},{id:'p1'});
    const isGold=appearance.wardrobe.topColor==='#e0ad4c';
    const lobbyNoPause=n.phase==='lobby';
    api.close();
    const hidden=root.classList.contains('ns109Hidden');
    return {opened,has7,noCombat,oldChat,guardian,restored,academy,notTest,earned,isGold,lobbyNoPause,hidden};
   });
   for(const [k,v] of Object.entries(got))assert.equal(v,true,w+'x'+h+' '+k);
   assert.deepEqual(errors.filter(e=>/TypeError|ReferenceError|SyntaxError/.test(e)),[],errors.join(' | '));
   console.log('V109 '+w+'x'+h+': village, navigation, no paused match, academy, Guardian Base, cosmetic Sparta, classic return OK');
   await ctx.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
