'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright-core');
(async()=>{
 const executablePath=['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync);
 if(!executablePath)throw Error('Chrome/Chromium required');
 const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files']});
 try{
  for(const width of [360,412]){
   const context=await browser.newContext({viewport:{width,height:800},isMobile:true,hasTouch:true});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   const url='file://'+path.resolve(__dirname,'../public/index.html');
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForFunction(()=>window.__nightWatch&&window.__NS93_MAGIC&&window.__NS97_POST,{timeout:20000});
   await page.evaluate(()=>document.getElementById('ns82-guest')?.click());
   const results=await page.evaluate(width=>{
    const g=window.__nightWatch,n=g.NET,magic=window.__NS93_MAGIC;
    const dock=document.getElementById('ns93SpellDock'),ctrl=document.getElementById('controls');
    const visible=()=>!dock.classList.contains('hidden')&&getComputedStyle(dock).display!=='none';
    g.startGame({specialMode:'normal'});magic.renderHud();
    const activeGameVisible=visible();
    g.showMenu();magic.renderHud();
    const menuHidden=!visible();
    // Simulate the screenshot's stale G.mode=play while the lobby is on top.
    g.startGame({specialMode:'normal'});magic.renderHud();
    document.getElementById('coopBtn').click();magic.renderHud();
    const matchSetupHidden=!visible();
    n.role='host';n.phase='lobby';n.code='ACD234';n.localId='p1';g.showLobbyUI();
    // A stale gameplay state must still NOT show mana in lobby.
    g.G.mode='play';g.G.paused=false;magic.renderHud();
    const lobbyHidden=!visible();
    g.closeNet();g.startGame({specialMode:'normal'});magic.renderHud();
    const restoredInGameVisible=visible();
    g.showMenu();
    // Host-authoritative cave play.
    n.role='host';n.phase='playing';n.localId='p1';n.code='ACD234';n.round=1;
    n.clients.set('p2',{open:true,send(){}});
    g.startGame({specialMode:'normal'});
    g.NSX.progress.hasRope=true;
    const local=g.G.players.find(p=>p.id==='p1'),remote=g.G.players.find(p=>p.id==='p2');
    if(!local||!remote)throw Error('Cannot create two host-authoritative players');
    remote.x=local.x+450;remote.y=local.y+400;
    const entrance={type:'cave',x:local.x,y:local.y,id:983000+width,state:'ready',done:false,rewarded:false};
    const blockedWithConnectedGuest=g.NSX.enterCaveEvent(entrance)===false&&!g.G.caveMode;
    n.clients.delete('p2');
    const ghostStillInWorld=g.G.players.includes(remote)&&!remote.dead;
    const allowedWhenGuestLeaves=g.NSX.enterCaveEvent(entrance)===true&&g.G.caveMode;
    // If that guest reconnects mid-cave they need to be near the exit again.
    local.x=852;local.y=718;
    n.clients.set('p2',{open:true,send(){}});
    g.NSX.caveTick();
    const exitBlockedWhenGuestReturns=g.G.caveMode;
    n.clients.delete('p2');g.NSX.caveTick();
    const soloCaveExitWorks=!g.G.caveMode&&g.NSX.progress.cave.active===false;
    return {activeGameVisible,menuHidden,matchSetupHidden,lobbyHidden,restoredInGameVisible,blockedWithConnectedGuest,ghostStillInWorld,allowedWhenGuestLeaves,exitBlockedWhenGuestReturns,soloCaveExitWorks,playerCount:g.G.players.length};
   },width);
   for(const key of ['activeGameVisible','menuHidden','matchSetupHidden','lobbyHidden','restoredInGameVisible','blockedWithConnectedGuest','ghostStillInWorld','allowedWhenGuestLeaves','exitBlockedWhenGuestReturns','soloCaveExitWorks']){
    assert.equal(results[key],true,key+' width '+width+'; '+JSON.stringify(results));
   }
   assert.equal(results.playerCount,2,'disconnect recovery data is not deleted');
   assert.deepEqual(errors.filter(e=>/TypeError|SyntaxError|ReferenceError/.test(e)),[],'no runtime JS errors '+errors.join(' | '));
   console.log('PASS v98 width='+width+': magic strictly in game; solo cave entry/exit after disconnect; active teammate blocks both; reconnect state retained');
   await context.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
