'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright-core');
(async()=>{
 const bin=['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync);
 if(!bin)throw Error('Missing Chromium');
 const browser=await chromium.launch({headless:true,executablePath:bin,args:['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files']});
 try{
  for(const width of [360,412]){
   const context=await browser.newContext({viewport:{width,height:820},isMobile:true,hasTouch:true});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('file://'+path.resolve(__dirname,'../public/index.html')+'?temple-preview=1',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.__NS105_TEMPLE?.state().preview&&window.__nightWatch?.G.mode==='play',{timeout:25000});
   const outcomes=await page.evaluate(()=>{
    const g=window.__nightWatch,n=g.NET,t=window.__NS99_TEAM,send=[];
    n.role='host';n.phase='playing';n.round=1;n.localId='p1';n.hostId='p1';n.code='ABCDEF';n.clients.clear();
    n.clients.set('p2',{open:true,send:p=>send.push(p)});
    g.startGame({specialMode:'normal'});g.G.players.find(p=>p.id==='p2').level=3;
    const shopOpened=t.beginShop('p2','guild',7);
    const shopFrozen=t.frozen()&&t.state().s?.kind==='guild';
    const shopOverlay=!document.getElementById('ns107WaitOverlay').classList.contains('hidden');
    const shopName=document.getElementById('ns107WaitCardName').textContent;
    const end=t.state().s.at;const original=Date.now;Date.now=()=>end+250;try{t.tick()}finally{Date.now=original}
    const shopTimedOut=!t.frozen()&&t.currentShop===null;
    const burgerOpened=t.beginShop('p2','market',7);
    const burgerText=document.getElementById('ns107WaitCardReason').textContent;
    const burgerDone=t.finishShop('p2','market')&&!t.frozen();
    const chestOpened=t.beginChest('p2',7);
    const chestVisible=!document.getElementById('ns107WaitOverlay').classList.contains('hidden');
    const chestText=document.getElementById('ns107WaitCardReason').textContent;
    const chestDone=t.finishChest('p2');
    const powerOpened=t.offer(g.G.players.find(p=>p.id==='p2'));
    const powerVisible=t.currentLevel?.id==='p2'&&!document.getElementById('ns107WaitOverlay').classList.contains('hidden');
    const powerChosen=t.select('p2','damage')&&!t.frozen();
    return {shopOpened,shopFrozen,shopOverlay,shopName,shopTimedOut,burgerOpened,burgerText,burgerDone,chestOpened,chestVisible,chestText,chestDone,powerOpened,powerVisible,powerChosen,sendCount:send.length};
   });
   for(const key of ['shopOpened','shopFrozen','shopOverlay','shopTimedOut','burgerOpened','burgerDone','chestOpened','chestVisible','chestDone','powerOpened','powerVisible','powerChosen'])assert.equal(outcomes[key],true,width+': '+key+' '+JSON.stringify(outcomes));
   assert.ok(outcomes.shopName);
   assert.match(outcomes.burgerText,/BURGER/i);
   assert.match(outcomes.chestText,/CHEST|SANDUK/i);
   await page.evaluate(()=>window.__nightWatch.showMenu());
   const reused=await page.evaluate(()=>{
    const g=window.__nightWatch,n=g.NET,identity='a'.repeat(48);
    n.role='host';n.phase='lobby';n.localId='p1';n.hostId='p1';n.round=0;n.code='ABCDEF';n.clients.clear();n.profiles.clear();window.__NS99_TEAM.reset();
    const make=()=>{
     const handlers={},out=[],c={open:true,send(d){out.push(d)},close(){this.open=false;handlers.close?.()},on(event,fn){handlers[event]=fn}};
     g.setupConnection(c);handlers.open();return {handlers,c,out};
    };
    const one=make();const before=n.clients.size;
    one.handlers.data({t:'hello',v:107,identity});
    one.handlers.data({t:'profile',sessionIdentity:identity,name:'PERSISTENT'});
    const first=[...n.clients.keys()];
    one.c.close();
    const two=make();two.handlers.data({t:'hello',v:107,identity});two.handlers.data({t:'profile',sessionIdentity:identity,name:'PERSISTENT'});
    const duplicate=[...n.clients.keys()],remembered=n.profiles.get('p2')?.sessionIdentity===identity;
    const reserved=window.__nightWatch.NETLAB.tokens.has('p2');
    const button=document.querySelector('#lobbyRoster .ns106KickBtn');
    return {before,first,duplicate,remembered,reserved,button:!!button,roomCount:n.clients.size};
   });
   assert.equal(reused.before,0,'No ghost seat before hello');
   assert.deepEqual(reused.first,['p2']);
   assert.deepEqual(reused.duplicate,['p2'],'Same identity uses same slot');
   assert.equal(reused.roomCount,1);
   assert.equal(reused.remembered,true);
   assert.equal(reused.reserved,true);
   assert.equal(reused.button,true);
   assert.deepEqual(errors.filter(x=>/TypeError|ReferenceError|SyntaxError/.test(x)),[],errors.join(' | '));
   console.log('PASS V107 '+width+'px: market/forge/chest/level host pause, auto timeout and lobby ID reuse');
   await context.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
