'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),{chromium}=require('playwright-core');
const html=fs.readFileSync(path.resolve(__dirname,'../public/index.html'),'utf8');
const inline=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(x=>!/\bsrc=|type=["']module/i.test(x[1]));
for(const [i,m] of inline.entries())assert.doesNotThrow(()=>new vm.Script(m[2],{filename:'v108-'+i}));
assert.match(html,/rel="canonical" href="https:\/\/majorstex.github.io\/nocna-straza-v108\//);
assert.match(html,/© 2026 Noćna Straža/);
assert.match(html,/bytes>18000/);
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync),args:['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files']});
 try{
  for(const [width,height] of [[360,844],[412,844],[360,650]]){
   const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto('file://'+path.resolve(__dirname,'../public/index.html')+'?temple-preview=1',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.__NS108_MODAL&&window.__nightWatch?.G.mode==='play',{timeout:25000});
   const check=await page.evaluate(async()=>{
    const $=id=>document.getElementById(id);
    const area=(a,b)=>{const x=a.getBoundingClientRect(),y=b.getBoundingClientRect();return Math.max(0,Math.min(x.right,y.right)-Math.max(x.left,y.left))*Math.max(0,Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top))};
    for(const id of ['ns99PauseOpen','nsNetLabDock','mapDock'])$(id).classList.remove('hidden');
    const overlap={mapPause:area($('mapDock'),$('ns99PauseOpen')),mapNetwork:area($('mapDock'),$('nsNetLabDock')),pauseNetwork:area($('ns99PauseOpen'),$('nsNetLabDock'))};
    $('chestPanel').classList.remove('hidden');$('quickChoicePanel').classList.remove('hidden');
    await new Promise(ok=>setTimeout(ok,40));
    const active=window.__NS108_MODAL.active,blocked=getComputedStyle($('chestPanel')).visibility==='hidden',hudHidden=getComputedStyle($('nsNetLabDock')).visibility==='hidden';
    $('quickChoicePanel').classList.add('hidden');await new Promise(ok=>setTimeout(ok,40));
    const restored=window.__NS108_MODAL.active==='chestPanel'&&getComputedStyle($('chestPanel')).visibility==='visible';
    $('chestPanel').classList.add('hidden');await new Promise(ok=>setTimeout(ok,40));
    const g=window.__nightWatch,n=g.NET;
    n.role='host';n.phase='playing';n.localId='p1';n.hostId='p1';n.code='ABCDEF';n.round=1;n.clients.clear();
    n.clients.set('p2',{open:true,send(){}});
    g.startGame({specialMode:'normal'});
    const began=window.__NS99_TEAM.beginShop('p2','guild',7);
    const waitVisible=getComputedStyle($('ns107WaitOverlay')).display!=='none';
    const waitOnTop=+getComputedStyle($('ns107WaitOverlay')).zIndex>+getComputedStyle($('ns99PausePanel')).zIndex;
    const backHidden=getComputedStyle($('ns84BackButton')).visibility==='hidden';
    window.__NS99_TEAM.finishShop('p2','guild');
    return {overlap,active,blocked,hudHidden,restored,began,waitVisible,waitOnTop,backHidden};
   });
   for(const [k,v] of Object.entries(check.overlap))assert.equal(v,0,width+'x'+height+' '+k+' overlaps');
   assert.equal(check.active,'quickChoicePanel');assert.equal(check.blocked,true);assert.equal(check.hudHidden,true);
   assert.equal(check.restored,true);assert.equal(check.began,true);assert.equal(check.waitVisible,true);
   assert.equal(check.waitOnTop,true);assert.equal(check.backHidden,true);
   assert.deepEqual(errors.filter(e=>/ReferenceError|TypeError|SyntaxError/.test(e)),[],errors.join(' | '));
   console.log('PASS V108 '+width+'x'+height+': no map/pause/network collisions; exclusive modals; prioritized multiplayer waiting; copyright.');
   await context.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});